const express = require('express');
const router = express.Router();
const {
  createOrder,
  trackOrder,
  getMyOrders
} = require('../../controllers/orderController');
const { protect, optionalProtect } = require('../../middleware/authMiddleware');

router.post('/', optionalProtect, createOrder);
router.get('/track/:orderNumber', trackOrder);
router.get('/my-orders', protect, getMyOrders);

module.exports = router;
