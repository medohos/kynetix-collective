const express = require('express');
const router = express.Router();
const {
  createOrder,
  trackOrder,
  getMyOrders
} = require('../../controllers/orderController');
const { protect } = require('../../middleware/authMiddleware');

router.post('/', createOrder);
router.get('/track/:orderNumber', trackOrder);
router.get('/my-orders', protect, getMyOrders);

module.exports = router;
