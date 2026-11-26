const Coupon = require('../models/Coupon');

/**
 * @desc    Validate coupon code and return discount calculations
 * @route   POST /api/coupons/validate
 * @access  Public
 */
const validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please enter a coupon code.' });
    }

    const coupon = await Coupon.findByCode(code);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired promo code.'
      });
    }

    const sub = Number(subtotal) || 0;
    if (coupon.minSpend > 0 && sub < coupon.minSpend) {
      return res.status(400).json({
        success: false,
        message: `This coupon requires a minimum spend of ${coupon.minSpend} EGP.`
      });
    }

    const result = Coupon.calculateDiscount(coupon, sub);
    console.log(`[Coupon API] Promo Code validation successfully done | Code: ${coupon.code} | Subtotal: ${sub} EGP | Discount: ${result.discountAmount} EGP`);

    res.json({
      success: true,
      message: `Coupon '${coupon.code}' applied!`,
      coupon: {
        code: coupon.code,
        label: coupon.label,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: result.discountAmount,
        freeShipping: result.freeShipping
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  validateCoupon
};
