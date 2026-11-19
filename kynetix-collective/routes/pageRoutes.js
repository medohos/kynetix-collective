const express = require('express');
const path = require('path');
const router = express.Router();

const rootDir = path.resolve(__dirname, '../');

const serveHtml = (filename) => (req, res) => {
  res.sendFile(path.join(rootDir, filename));
};

router.get('/', serveHtml('index.html'));
router.get('/shop', serveHtml('shop.html'));
router.get('/product', serveHtml('product.html'));
router.get('/checkout', serveHtml('checkout.html'));
router.get('/track', serveHtml('track.html'));
router.get('/about', serveHtml('about.html'));
router.get('/contact', serveHtml('contact.html'));
router.get('/faq', serveHtml('faq.html'));
router.get('/admin', serveHtml('admin.html'));

module.exports = router;
