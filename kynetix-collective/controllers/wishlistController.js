const Wishlist = require('../models/Wishlist');

/**
 * @desc    Get user wishlist
 * @route   GET /api/wishlist
 * @access  Private
 */
const getWishlist = async (req, res, next) => {
  try {
    const items = await Wishlist.getByUserId(req.user.id);
    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Add product to wishlist
 * @route   POST /api/wishlist
 * @access  Private
 */
const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID or slug is required.' });
    }

    await Wishlist.add(req.user.id, productId);
    res.json({
      success: true,
      message: 'Product added to wishlist.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove product from wishlist
 * @route   DELETE /api/wishlist/:productId
 * @access  Private
 */
const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    await Wishlist.remove(req.user.id, productId);
    res.json({
      success: true,
      message: 'Product removed from wishlist.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};
