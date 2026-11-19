const { pool } = require('../config/db');

class Coupon {
  /**
   * Find active coupon by code
   */
  static async findByCode(code) {
    if (!code) return null;
    const [rows] = await pool.query(
      `SELECT code, discount_type, discount_value, label, min_spend, is_active 
       FROM coupons 
       WHERE code = ? AND is_active = 1 
       LIMIT 1`,
      [code.trim().toUpperCase()]
    );
    if (!rows.length) return null;

    const c = rows[0];
    return {
      code: c.code,
      discountType: c.discount_type,
      discountValue: Number(c.discount_value),
      label: c.label,
      minSpend: Number(c.min_spend)
    };
  }

  /**
   * Calculate discount amount for a given subtotal
   */
  static calculateDiscount(coupon, subtotal, standardShippingFee = 60) {
    if (!coupon) return { discountAmount: 0, freeShipping: false };

    let discountAmount = 0;
    let freeShipping = false;

    if (coupon.discountType === 'percentage') {
      discountAmount = subtotal * coupon.discountValue;
    } else if (coupon.discountType === 'free_shipping') {
      freeShipping = true;
    } else if (coupon.discountType === 'fixed') {
      discountAmount = Math.min(subtotal, coupon.discountValue);
    }

    return { discountAmount, freeShipping };
  }
}

module.exports = Coupon;
