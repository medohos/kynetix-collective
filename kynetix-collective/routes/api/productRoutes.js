const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductBySlugOrId,
  searchAutocomplete,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../../controllers/productController');

router.get('/search/autocomplete', searchAutocomplete);
router.get('/', getProducts);
router.post('/', createProduct);
router.get('/:slugOrId', getProductBySlugOrId);
router.put('/:slugOrId', updateProduct);
router.delete('/:slugOrId', deleteProduct);

module.exports = router;
