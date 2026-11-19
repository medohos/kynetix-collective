const { pool } = require('../config/db');
const Product = require('./Product');

class Order {
  /**
   * Create new order using a safe ACID transaction with inventory deduction
   */
  static async create(orderData) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        userId = null,
        firstName,
        lastName,
        email,
        phone,
        address,
        apartment = '',
        city,
        area,
        postal = '',
        notes = '',
        shippingMethod = 'standard',
        shippingFee = 0,
        courierName = shippingMethod === 'express' ? 'Aramex Express' : 'Bosta Standard',
        estimatedDelivery = shippingMethod === 'express' ? '1–2 Business Days' : '2–4 Business Days',
        subtotal,
        discountAmount = 0,
        couponCode = null,
        total,
        paymentMethod = 'card',
        paymentLabel = 'Credit Card',
        paymentStatus = paymentMethod === 'cod' ? 'payment_upon_delivery' : 'paid',
        items = []
      } = orderData;

      if (!items || !items.length) {
        throw new Error('Order items list cannot be empty.');
      }

      // Generate unique public order reference
      const orderNumber = 'KYN-' + Math.floor(100000 + Math.random() * 900000);

      // Verify variant inventory for each item
      for (const item of items) {
        if (item.productId && item.color && item.size) {
          // Resolve numeric product id if passed as slug
          const [pRows] = await conn.query('SELECT id, name FROM products WHERE id = ? OR slug = ? LIMIT 1', [item.productId, item.productId]);
          if (pRows.length) {
            const dbProdId = pRows[0].id;
            const [vRows] = await conn.query(
              `SELECT pv.id, pv.stock_quantity 
               FROM product_variants pv
               INNER JOIN product_colors pc ON pv.color_id = pc.id
               WHERE pv.product_id = ? AND pc.color_name = ? AND pv.size = ?
               FOR UPDATE`,
              [dbProdId, item.color, item.size]
            );

            if (vRows.length && vRows[0].stock_quantity < item.qty) {
              throw new Error(`Insufficient stock for ${item.name} (${item.color}, ${item.size}). Available: ${vRows[0].stock_quantity}`);
            }
          }
        }
      }

      // 1. Insert Order Master Record
      const [orderResult] = await conn.query(
        `INSERT INTO orders (
          order_number, user_id, first_name, last_name, email, phone,
          shipping_address, shipping_apartment, shipping_city, shipping_area, shipping_postal, delivery_notes,
          shipping_method, shipping_fee, courier_name, estimated_delivery,
          subtotal, discount_amount, coupon_code, total_amount,
          payment_method, payment_label, payment_status, order_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId,
          firstName,
          lastName,
          email,
          phone,
          address,
          apartment,
          city,
          area,
          postal,
          notes,
          shippingMethod,
          shippingFee,
          courierName,
          estimatedDelivery,
          subtotal,
          discountAmount,
          couponCode,
          total,
          paymentMethod,
          paymentLabel,
          paymentStatus,
          'placed'
        ]
      );

      const orderId = orderResult.insertId;

      // 2. Insert Order Items & Deduct Stock
      for (const item of items) {
        let dbProdId = null;
        let variantId = null;

        if (item.productId) {
          const [pRows] = await conn.query('SELECT id FROM products WHERE id = ? OR slug = ? LIMIT 1', [item.productId, item.productId]);
          if (pRows.length) {
            dbProdId = pRows[0].id;
            const [vRows] = await conn.query(
              `SELECT pv.id 
               FROM product_variants pv
               INNER JOIN product_colors pc ON pv.color_id = pc.id
               WHERE pv.product_id = ? AND pc.color_name = ? AND pv.size = ?
               LIMIT 1`,
              [dbProdId, item.color || '', item.size || '']
            );
            if (vRows.length) variantId = vRows[0].id;
          }
        }

        const unitPrice = Number(item.price);
        const qty = Number(item.qty) || 1;
        const lineTotal = unitPrice * qty;

        await conn.query(
          `INSERT INTO order_items (
            order_id, product_id, variant_id, product_name, color_name, size, unit_price, quantity, total_price, image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            dbProdId,
            variantId,
            item.name,
            item.color || '',
            item.size || '',
            unitPrice,
            qty,
            lineTotal,
            item.img || ''
          ]
        );

        // Deduct inventory
        if (dbProdId && item.color && item.size) {
          await Product.deductVariantStock(conn, dbProdId, item.color, item.size, qty);
        }
      }

      await conn.commit();

      return {
        id: orderId,
        orderNumber,
        orderDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        firstName,
        lastName,
        email,
        phone,
        total,
        paymentLabel,
        paymentStatus,
        shippingMethod,
        courierName,
        estimatedDelivery
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Find order with all items by public reference number (KYN-XXXXXX)
   */
  static async findByOrderNumber(orderNumber) {
    const [orders] = await pool.query(
      `SELECT * FROM orders WHERE order_number = ? LIMIT 1`,
      [orderNumber]
    );

    if (!orders.length) return null;
    const order = orders[0];

    const [items] = await pool.query(
      `SELECT id, product_id, variant_id, product_name, color_name, size, unit_price, quantity, total_price, image_url
       FROM order_items
       WHERE order_id = ?`,
      [order.id]
    );

    return {
      id: order.id,
      orderId: order.order_number,
      orderNumber: order.order_number,
      orderDate: new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      orderStatus: order.order_status,
      customer: {
        firstName: order.first_name,
        lastName: order.last_name,
        email: order.email,
        phone: order.phone,
        address: order.shipping_address,
        apartment: order.shipping_apartment,
        city: order.shipping_city,
        area: order.shipping_area,
        postal: order.shipping_postal,
        notes: order.delivery_notes
      },
      shipping: {
        method: order.shipping_method,
        fee: Number(order.shipping_fee),
        courierName: order.courier_name,
        trackingNumber: order.tracking_number,
        estimatedDelivery: order.estimated_delivery
      },
      payment: {
        method: order.payment_method,
        label: order.payment_label,
        status: order.payment_status === 'payment_upon_delivery' ? 'Payment Upon Delivery' : 'Paid & Confirmed'
      },
      totals: {
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discount_amount),
        shippingFee: Number(order.shipping_fee),
        total: Number(order.total_amount),
        couponCode: order.coupon_code
      },
      items: items.map((i) => ({
        id: i.id,
        name: i.product_name,
        color: i.color_name,
        size: i.size,
        price: Number(i.unit_price),
        qty: i.quantity,
        total: Number(i.total_price),
        img: i.image_url
      }))
    };
  }

  /**
   * Find orders for a registered user ID
   */
  static async findByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT id, order_number, total_amount, payment_status, order_status, created_at 
       FROM orders 
       WHERE user_id = ? 
       ORDER BY id DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      orderId: r.order_number,
      total: Number(r.total_amount),
      status: r.order_status,
      paymentStatus: r.payment_status,
      orderDate: new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }));
  }
}

module.exports = Order;
