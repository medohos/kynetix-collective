const { pool } = require('../config/db');

class Review {
  /**
   * Fetch reviews for a specific product
   */
  static async findByProductId(productSlugOrId) {
    const [pRows] = await pool.query(
      'SELECT id FROM products WHERE id = ? OR slug = ? LIMIT 1',
      [productSlugOrId, productSlugOrId]
    );
    if (!pRows.length) return [];

    const productId = pRows[0].id;
    const [rows] = await pool.query(
      `SELECT id, author_name, rating, comment, is_verified, created_at 
       FROM reviews 
       WHERE product_id = ? 
       ORDER BY id DESC`,
      [productId]
    );

    return rows.map((r) => ({
      id: r.id,
      author: r.author_name,
      rating: r.rating,
      comment: r.comment,
      isVerified: !!r.is_verified,
      date: new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }));
  }

  /**
   * Add a review
   */
  static async create({ productSlugOrId, userId = null, authorName, rating, comment }) {
    const [pRows] = await pool.query(
      'SELECT id FROM products WHERE id = ? OR slug = ? LIMIT 1',
      [productSlugOrId, productSlugOrId]
    );
    if (!pRows.length) throw new Error('Product not found');

    const productId = pRows[0].id;
    const stars = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));

    const [result] = await pool.query(
      `INSERT INTO reviews (product_id, user_id, author_name, rating, comment, is_verified) 
       VALUES (?, ?, ?, ?, ?, 1)`,
      [productId, userId, authorName.trim(), stars, comment.trim()]
    );

    return {
      id: result.insertId,
      author: authorName.trim(),
      rating: stars,
      comment: comment.trim(),
      isVerified: true
    };
  }
}

module.exports = Review;
