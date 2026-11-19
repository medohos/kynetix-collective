// 404 Route Not Found Handler
const notFoundHandler = (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
  }
  // For web routes, redirect to home or show message
  res.status(404).sendFile('index.html', { root: './' });
};

// Centralized Error Handling Middleware
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.stack || err.message}`);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
