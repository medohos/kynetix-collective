const Order = require('../models/Order');

/**
 * @desc    Place a new order (with transaction & stock validation)
 * @route   POST /api/orders
 * @access  Public (Guest or Logged in User)
 */
const createOrder = async (req, res, next) => {
  try {
    const customer = req.body.customer || {};
    const shipping = req.body.shipping || {};
    const payment = req.body.payment || {};
    const totals = req.body.totals || {};

    const firstName = (req.body.firstName || customer.firstName || '').trim();
    const lastName = (req.body.lastName || customer.lastName || '').trim();
    const email = (req.body.email || customer.email || '').trim();
    const phone = (req.body.phone || customer.phone || '').trim();
    const address = (req.body.address || customer.address || '').trim();
    const apartment = (req.body.apartment || customer.apartment || '').trim();
    const city = (req.body.city || customer.city || '').trim();
    const area = (req.body.area || customer.area || '').trim();
    const postal = (req.body.postal || customer.postal || '').trim();
    const notes = (req.body.notes || customer.notes || '').trim();

    const shippingMethod = req.body.shippingMethod || shipping.method || 'standard';
    const shippingFee = req.body.shippingFee !== undefined ? req.body.shippingFee : (shipping.fee || 0);

    const subtotal = req.body.subtotal !== undefined ? req.body.subtotal : (totals.subtotal || 0);
    const discountAmount = req.body.discountAmount !== undefined ? req.body.discountAmount : (totals.discountAmount || 0);
    const couponCode = req.body.couponCode || totals.couponCode || null;
    const total = req.body.total !== undefined ? req.body.total : (totals.total || 0);

    const paymentMethod = req.body.paymentMethod || payment.method || 'card';
    const items = req.body.items || [];

    // Server-side validations
    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'First and last name are required.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email is required.' });
    }
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'A valid Egyptian phone number is required.' });
    }
    if (!address || !city || !area) {
      return res.status(400).json({ success: false, message: 'Complete shipping address, governorate, and area are required.' });
    }
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Shopping bag is empty.' });
    }

    // Determine user ID if authenticated via token
    const userId = req.user ? req.user.id : null;

    // Payment label formatting
    let paymentLabel = payment.label || 'Credit Card';
    if (paymentMethod === 'card') {
      const cardNum = req.body.cardNumber ? req.body.cardNumber.replace(/\D/g, '') : '';
      const last4 = cardNum.slice(-4) || '••••';
      paymentLabel = payment.label || `Credit Card (•••• ${last4})`;
    } else if (paymentMethod === 'cod') {
      paymentLabel = 'Cash on Delivery';
    } else if (paymentMethod === 'wallet') {
      paymentLabel = 'InstaPay / Mobile Wallet';
    }

    const created = await Order.create({
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
      shippingFee: Number(shippingFee) || 0,
      subtotal: Number(subtotal),
      discountAmount: Number(discountAmount) || 0,
      couponCode,
      total: Number(total),
      paymentMethod,
      paymentLabel,
      items
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: created
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Track an order by public reference number (KYN-XXXXXX)
 * @route   GET /api/orders/track/:orderNumber
 * @access  Public
 */
const trackOrder = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    if (!orderNumber) {
      return res.status(400).json({ success: false, message: 'Order number is required.' });
    }

    const order = await Order.findByOrderNumber(orderNumber.trim().toUpperCase());
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order '${orderNumber}' not found. Please verify your reference number.`
      });
    }

    console.log(`[Order API] Order Tracking successfully done | Order: ${order.orderNumber} | Status: ${order.orderStatus} | Courier: ${order.shipping.courierName}`);
    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get order history for logged-in user
 * @route   GET /api/orders/my-orders
 * @access  Private
 */
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.findByUserId(req.user.id);
    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  trackOrder,
  getMyOrders
};
