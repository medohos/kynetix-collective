const express = require('express');
const router = express.Router();

const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const authRoutes = require('./authRoutes');
const wishlistRoutes = require('./wishlistRoutes');
const couponRoutes = require('./couponRoutes');
const reviewRoutes = require('./reviewRoutes');
const contactRoutes = require('./contactRoutes');

router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/auth', authRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/coupons', couponRoutes);
router.use('/reviews', reviewRoutes);
router.use('/contact', contactRoutes);

// Health check / API status
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Kynetix Collective API is active and operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
