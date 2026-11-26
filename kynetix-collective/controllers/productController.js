const Product = require('../models/Product');

/**
 * @desc    Get all products with filters & sorting
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res, next) => {
  try {
    const { category, subcategory, brand, search, sort, maxPrice } = req.query;
    const products = await Product.findAll({
      category,
      subcategory,
      brand,
      search,
      sort,
      maxPrice
    });

    console.log(`[Products API] Catalog fetch successfully done | Returned ${products.length} active products`);
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single product details with color/size matrix
 * @route   GET /api/products/:slugOrId
 * @access  Public
 */
const getProductBySlugOrId = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const product = await Product.findBySlugOrId(slugOrId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product '${slugOrId}' not found.`
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Fast search autocomplete for live dropdown
 * @route   GET /api/products/search/autocomplete
 * @access  Public
 */
const searchAutocomplete = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, data: [] });
    }

    const matches = await Product.findAll({ search: q.trim() });
    const topMatches = matches.slice(0, 5).map((p) => ({
      id: p.slug,
      name: p.name,
      brand: p.brand,
      price: p.price,
      img: p.colors[0]?.img || 'images/hero-shoe.jpg'
    }));

    res.json({
      success: true,
      data: topMatches
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new product in MySQL
 * @route   POST /api/products
 * @access  Public / Admin
 */
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.save(req.body);
    res.status(201).json({
      success: true,
      message: 'Product created successfully in database.',
      data: product
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update an existing product in MySQL
 * @route   PUT /api/products/:slugOrId
 * @access  Public / Admin
 */
const updateProduct = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const productData = {
      ...req.body,
      originalId: req.body.originalId || slugOrId
    };
    const product = await Product.save(productData);
    res.json({
      success: true,
      message: 'Product updated successfully in database.',
      data: product
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete product by slug or ID
 * @route   DELETE /api/products/:slugOrId
 * @access  Public / Admin
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const deleted = await Product.delete(slugOrId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `Product '${slugOrId}' not found.`
      });
    }

    res.json({
      success: true,
      message: `Product '${slugOrId}' deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getProductBySlugOrId,
  searchAutocomplete,
  createProduct,
  updateProduct,
  deleteProduct
};
