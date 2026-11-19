const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createReview
} = require('../../controllers/reviewController');
const { optionalProtect } = require('../../middleware/authMiddleware');

router.get('/:productSlugOrId', getProductReviews);
router.post('/', optionalProtect, createReview);

module.exports = router;
