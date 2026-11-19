const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createReview
} = require('../../controllers/reviewController');

router.get('/:productSlugOrId', getProductReviews);
router.post('/', createReview);

module.exports = router;
