const Review = require('../models/Review');

/**
 * @desc    Get reviews for a product
 * @route   GET /api/reviews/:productSlugOrId
 * @access  Public
 */
const getProductReviews = async (req, res, next) => {
  try {
    const { productSlugOrId } = req.params;
    const reviews = await Review.findByProductId(productSlugOrId);

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Submit customer product review
 * @route   POST /api/reviews
 * @access  Public
 */
const createReview = async (req, res, next) => {
  try {
    const { productSlugOrId, authorName, rating, comment } = req.body;

    if (!productSlugOrId || !authorName || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Product, author name, and comment are required.'
      });
    }

    const userId = req.user ? req.user.id : null;
    const review = await Review.create({
      productSlugOrId,
      userId,
      authorName,
      rating: Number(rating) || 5,
      comment
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      data: review
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProductReviews,
  createReview
};
