const { pool } = require('../config/db');

class Wishlist {
  /**
   * Get all wishlist products for a user
   */
  static async getByUserId(userId) {
    const [rows] = await pool.query(
      `SELECT 
        w.id AS wishlist_id,
        p.id AS product_db_id,
        p.slug AS productId,
        p.name,
        p.price,
        b.name AS brand,
        pc.image_url AS img,
        w.created_at
       FROM wishlists w
       INNER JOIN products p ON w.product_id = p.id
       INNER JOIN brands b ON p.brand_id = b.id
       LEFT JOIN product_colors pc ON pc.product_id = p.id AND pc.is_default = 1
       WHERE w.user_id = ?
       ORDER BY w.id DESC`,
      [userId]
    );

    return rows.map((r) => ({
      wishlistId: r.wishlist_id,
      productId: r.productId,
      name: r.name,
      brand: r.brand,
      price: Number(r.price),
      img: r.img || 'images/hero-shoe.jpg',
      addedAt: r.created_at
    }));
  }

  /**
   * Add a product to user wishlist
   */
  static async add(userId, productSlugOrId) {
    // Resolve product ID
    const [pRows] = await pool.query(
      'SELECT id FROM products WHERE id = ? OR slug = ? LIMIT 1',
      [productSlugOrId, productSlugOrId]
    );
    if (!pRows.length) throw new Error('Product not found');

    const productId = pRows[0].id;
    await pool.query(
      `INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)`,
      [userId, productId]
    );
    return true;
  }

  /**
   * Remove product from user wishlist
   */
  static async remove(userId, productSlugOrId) {
    const [pRows] = await pool.query(
      'SELECT id FROM products WHERE id = ? OR slug = ? LIMIT 1',
      [productSlugOrId, productSlugOrId]
    );
    if (!pRows.length) return false;

    const productId = pRows[0].id;
    const [res] = await pool.query(
      `DELETE FROM wishlists WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );
    return res.affectedRows > 0;
  }
}

module.exports = Wishlist;
