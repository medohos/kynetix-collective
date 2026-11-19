const { pool } = require('../config/db');

class Product {
  /**
   * Fetch products with optional filtering, search, and sorting
   */
  static async findAll({ category, subcategory, brand, search, sort, maxPrice } = {}) {
    let sql = `
      SELECT 
        p.id,
        p.slug,
        p.name,
        p.description,
        p.price,
        p.is_active,
        p.created_at,
        c.name AS category,
        c.slug AS category_slug,
        s.name AS subcategory,
        b.name AS brand,
        b.slug AS brand_slug,
        COALESCE(SUM(pv.stock_quantity), 0) AS total_stock
      FROM products p
      INNER JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      INNER JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category) {
      sql += ' AND c.name = ?';
      params.push(category);
    }

    if (subcategory) {
      const subLower = String(subcategory).trim().toLowerCase();
      if (['tops', 't-shirts', 'tshirts', 'shirts', 't-shirt', 'shirt', 'top'].includes(subLower)) {
        sql += ' AND (LOWER(s.name) IN (?, ?, ?, ?) OR LOWER(s.slug) IN (?, ?, ?, ?))';
        params.push('tops', 'shirts', 't-shirts', 'tops & t-shirts', 'tops-men', 'shirts-men', 't-shirts-men', 'tops-women');
      } else {
        sql += ' AND (LOWER(s.name) = ? OR LOWER(s.slug) = ?)';
        params.push(subLower, subLower);
      }
    }

    if (brand) {
      sql += ' AND b.name = ?';
      params.push(brand);
    }

    if (maxPrice && !isNaN(maxPrice)) {
      sql += ' AND p.price <= ?';
      params.push(Number(maxPrice));
    }

    if (search) {
      sql += ` AND (
        p.name LIKE ? OR 
        b.name LIKE ? OR 
        c.name LIKE ? OR 
        COALESCE(s.name, '') LIKE ? OR 
        p.description LIKE ?
      )`;
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }

    sql += ' GROUP BY p.id';

    // Sorting
    if (sort === 'price-asc') {
      sql += ' ORDER BY p.price ASC';
    } else if (sort === 'price-desc') {
      sql += ' ORDER BY p.price DESC';
    } else if (sort === 'name-asc') {
      sql += ' ORDER BY p.name ASC';
    } else {
      sql += ' ORDER BY p.id DESC';
    }

    const [rows] = await pool.query(sql, params);

    if (!rows.length) return [];

    // Attach colors, sizes, and variant stock to each product
    const productIds = rows.map((r) => r.id);
    const [colorRows] = await pool.query(
      `SELECT product_id, id AS color_id, color_name, hex_code, image_url, is_default 
       FROM product_colors 
       WHERE product_id IN (?) 
       ORDER BY is_default DESC, id ASC`,
      [productIds]
    );

    const [variantRows] = await pool.query(
      `SELECT pv.product_id, pc.color_name, pv.size, pv.stock_quantity
       FROM product_variants pv
       INNER JOIN product_colors pc ON pv.color_id = pc.id
       WHERE pv.product_id IN (?)`,
      [productIds]
    );

    const colorsByProduct = {};
    colorRows.forEach((c) => {
      if (!colorsByProduct[c.product_id]) colorsByProduct[c.product_id] = [];
      colorsByProduct[c.product_id].push({
        id: c.color_id,
        name: c.color_name,
        hex: c.hex_code,
        img: c.image_url,
        isDefault: !!c.is_default
      });
    });

    const sizesByProduct = {};
    const stockByProduct = {};
    variantRows.forEach((v) => {
      if (!sizesByProduct[v.product_id]) sizesByProduct[v.product_id] = new Set();
      if (!stockByProduct[v.product_id]) stockByProduct[v.product_id] = {};
      sizesByProduct[v.product_id].add(v.size);
      stockByProduct[v.product_id][`${v.color_name}::${v.size}`] = Number(v.stock_quantity);
    });

    return rows.map((p) => ({
      id: p.slug,
      db_id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      sub: p.subcategory,
      desc: p.description,
      price: Number(p.price),
      total_stock: Number(p.total_stock),
      colors: colorsByProduct[p.id] || [],
      sizes: sizesByProduct[p.id] ? [...sizesByProduct[p.id]] : [],
      variantStock: stockByProduct[p.id] || {}
    }));
  }

  /**
   * Fetch full product details by slug or numeric ID
   */
  static async findBySlugOrId(identifier) {
    const isNumeric = !isNaN(identifier) && !isNaN(parseFloat(identifier));
    const whereClause = isNumeric ? 'p.id = ?' : 'p.slug = ?';

    const [products] = await pool.query(
      `SELECT 
        p.id,
        p.slug,
        p.name,
        p.description,
        p.price,
        p.is_active,
        c.name AS category,
        s.name AS subcategory,
        b.name AS brand
       FROM products p
       INNER JOIN categories c ON p.category_id = c.id
       LEFT JOIN subcategories s ON p.subcategory_id = s.id
       INNER JOIN brands b ON p.brand_id = b.id
       WHERE ${whereClause} AND p.is_active = 1
       LIMIT 1`,
      [identifier]
    );

    if (!products.length) return null;
    const product = products[0];

    // Colors
    const [colors] = await pool.query(
      `SELECT id, color_name, hex_code, image_url, is_default 
       FROM product_colors 
       WHERE product_id = ? 
       ORDER BY is_default DESC, id ASC`,
      [product.id]
    );

    // Variants & stock
    const [variants] = await pool.query(
      `SELECT 
        pv.id AS variant_id,
        pc.color_name,
        pv.size,
        pv.sku,
        pv.stock_quantity
       FROM product_variants pv
       INNER JOIN product_colors pc ON pv.color_id = pc.id
       WHERE pv.product_id = ?`,
      [product.id]
    );

    // Extract unique sizes preserving order
    const sizes = [...new Set(variants.map((v) => v.size))];

    // Build variantStock map matching frontend format: "Color Name::Size" => stock
    const variantStock = {};
    variants.forEach((v) => {
      const key = `${v.color_name}::${v.size}`;
      variantStock[key] = Number(v.stock_quantity);
    });

    return {
      id: product.slug, // Use slug for consistent frontend matching
      db_id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      category: product.category,
      sub: product.subcategory,
      desc: product.description,
      price: Number(product.price),
      sizes,
      colors: colors.map((c) => ({
        id: c.id,
        name: c.color_name,
        hex: c.hex_code,
        img: c.image_url
      })),
      variants: variants.map((v) => ({
        variantId: v.variant_id,
        color: v.color_name,
        size: v.size,
        sku: v.sku,
        stock: Number(v.stock_quantity)
      })),
      variantStock
    };
  }

  /**
   * Check stock availability for a specific variant
   */
  static async getVariantStock(productId, colorName, size) {
    const [rows] = await pool.query(
      `SELECT pv.stock_quantity, pv.id AS variant_id
       FROM product_variants pv
       INNER JOIN product_colors pc ON pv.color_id = pc.id
       WHERE pv.product_id = ? AND pc.color_name = ? AND pv.size = ?
       LIMIT 1`,
      [productId, colorName, size]
    );

    if (!rows.length) return { available: 0, variantId: null };
    return {
      available: Number(rows[0].stock_quantity),
      variantId: rows[0].variant_id
    };
  }

  /**
   * Deduct inventory stock inside an existing connection/transaction
   */
  static async deductVariantStock(conn, productId, colorName, size, qty) {
    const [result] = await conn.query(
      `UPDATE product_variants pv
       INNER JOIN product_colors pc ON pv.color_id = pc.id
       SET pv.stock_quantity = GREATEST(0, pv.stock_quantity - ?)
       WHERE pv.product_id = ? AND pc.color_name = ? AND pv.size = ?`,
      [qty, productId, colorName, size]
    );
    return result.affectedRows > 0;
  }
  /**
   * Save (create or update) product with colors, variants & stock in MySQL transaction
   */
  static async save(productData) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        id,
        slug = id,
        originalId,
        name,
        price,
        desc = '',
        category = 'Men',
        sub = 'Shoes',
        brand = 'Nike',
        colors = [],
        sizes = [],
        variantStock = {}
      } = productData;

      const productSlug = (slug || id || originalId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).toLowerCase();

      // 1. Resolve Category
      let [catRows] = await conn.query('SELECT id FROM categories WHERE name = ? LIMIT 1', [category]);
      let categoryId;
      if (catRows.length) {
        categoryId = catRows[0].id;
      } else {
        const catSlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const [catIns] = await conn.query(
          'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
          [category, catSlug, category]
        );
        categoryId = catIns.insertId;
      }

      // 2. Resolve Subcategory
      let [subRows] = await conn.query(
        'SELECT id FROM subcategories WHERE category_id = ? AND (name = ? OR slug = ?) LIMIT 1',
        [categoryId, sub, sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')]
      );
      let subcategoryId;
      if (subRows.length) {
        subcategoryId = subRows[0].id;
      } else {
        const subSlug = `${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${category.toLowerCase()}`;
        const [subIns] = await conn.query(
          'INSERT INTO subcategories (category_id, name, slug) VALUES (?, ?, ?)',
          [categoryId, sub, subSlug]
        );
        subcategoryId = subIns.insertId;
      }

      // 3. Resolve Brand
      let [brandRows] = await conn.query('SELECT id FROM brands WHERE name = ? LIMIT 1', [brand]);
      let brandId;
      if (brandRows.length) {
        brandId = brandRows[0].id;
      } else {
        const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const [brandIns] = await conn.query(
          'INSERT INTO brands (name, slug) VALUES (?, ?)',
          [brand, brandSlug]
        );
        brandId = brandIns.insertId;
      }

      // 4. Check if product already exists (by originalId or current slug)
      const lookupTarget = originalId || productSlug;
      const isTargetNum = !isNaN(lookupTarget) && !isNaN(parseFloat(lookupTarget));
      const targetWhere = isTargetNum ? 'id = ?' : 'slug = ?';
      let [prodRows] = await conn.query(`SELECT id FROM products WHERE ${targetWhere} LIMIT 1`, [lookupTarget]);

      let productId;
      if (prodRows.length) {
        productId = prodRows[0].id;
        await conn.query(
          `UPDATE products 
           SET slug = ?, category_id = ?, subcategory_id = ?, brand_id = ?, name = ?, description = ?, price = ?, is_active = 1 
           WHERE id = ?`,
          [productSlug, categoryId, subcategoryId, brandId, name, desc, Number(price), productId]
        );
      } else {
        const [prodIns] = await conn.query(
          `INSERT INTO products (slug, category_id, subcategory_id, brand_id, name, description, price, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [productSlug, categoryId, subcategoryId, brandId, name, desc, Number(price)]
        );
        productId = prodIns.insertId;
      }

      // 5. Upsert colors in place so existing variant ids (and order line items) stay linked
      const [existingColors] = await conn.query(
        'SELECT id, color_name FROM product_colors WHERE product_id = ?',
        [productId]
      );
      const colorIdByName = new Map(existingColors.map((c) => [c.color_name, c.id]));
      const colorMap = {};
      const keptColorIds = [];

      for (let i = 0; i < colors.length; i++) {
        const c = colors[i];
        const isDefault = i === 0 ? 1 : 0;
        const hex = c.hex || '#000000';
        const img = c.img || '';
        let colorId = colorIdByName.get(c.name);

        if (colorId) {
          await conn.query(
            'UPDATE product_colors SET hex_code = ?, image_url = ?, is_default = ? WHERE id = ?',
            [hex, img, isDefault, colorId]
          );
        } else {
          const [colorIns] = await conn.query(
            'INSERT INTO product_colors (product_id, color_name, hex_code, image_url, is_default) VALUES (?, ?, ?, ?, ?)',
            [productId, c.name, hex, img, isDefault]
          );
          colorId = colorIns.insertId;
          colorIdByName.set(c.name, colorId);
        }

        colorMap[c.name] = colorId;
        keptColorIds.push(colorId);
      }

      if (keptColorIds.length) {
        await conn.query(
          'DELETE FROM product_colors WHERE product_id = ? AND id NOT IN (?)',
          [productId, keptColorIds]
        );
      } else {
        await conn.query('DELETE FROM product_colors WHERE product_id = ?', [productId]);
      }

      // 6. Upsert the color/size matrix. Keep existing SKUs; new rows get a unique SKU.
      const [existingVariants] = await conn.query(
        'SELECT id, color_id, size FROM product_variants WHERE product_id = ?',
        [productId]
      );
      const variantByKey = new Map(
        existingVariants.map((v) => [`${v.color_id}::${v.size}`, v.id])
      );
      const keptVariantIds = [];

      for (const color of colors) {
        const colorId = colorMap[color.name];
        for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
          const size = sizes[sizeIndex];
          const key = `${color.name}::${size}`;
          const stock = variantStock && key in variantStock ? Number(variantStock[key]) : 10;
          const variantKey = `${colorId}::${size}`;
          let variantId = variantByKey.get(variantKey);

          if (variantId) {
            await conn.query(
              'UPDATE product_variants SET stock_quantity = ? WHERE id = ?',
              [stock, variantId]
            );
          } else {
            const sizePart = String(size).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'OS';
            const sku = `P${productId}-C${colorId}-S${sizeIndex}-${sizePart}`.slice(0, 100);
            const [variantIns] = await conn.query(
              'INSERT INTO product_variants (product_id, color_id, size, sku, stock_quantity) VALUES (?, ?, ?, ?, ?)',
              [productId, colorId, size, sku, stock]
            );
            variantId = variantIns.insertId;
            variantByKey.set(variantKey, variantId);
          }

          keptVariantIds.push(variantId);
        }
      }

      if (keptVariantIds.length) {
        await conn.query(
          'DELETE FROM product_variants WHERE product_id = ? AND id NOT IN (?)',
          [productId, keptVariantIds]
        );
      } else {
        await conn.query('DELETE FROM product_variants WHERE product_id = ?', [productId]);
      }

      await conn.commit();
      return await Product.findBySlugOrId(productSlug);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Delete product by slug or numeric ID (cascades to colors & variants)
   */
  static async delete(slugOrId) {
    const isNumeric = !isNaN(slugOrId) && !isNaN(parseFloat(slugOrId));
    const whereClause = isNumeric ? 'id = ?' : 'slug = ?';
    const [result] = await pool.query(`DELETE FROM products WHERE ${whereClause}`, [slugOrId]);
    return result.affectedRows > 0;
  }
}

module.exports = Product;
