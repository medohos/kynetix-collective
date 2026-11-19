const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const pageRoutes = require('./routes/pageRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security & Cross-Origin
app.use(cors());

// Request Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets (CSS, JS, images, html)
app.use(express.static(path.resolve(__dirname, './')));

// Clean page routes (Views)
app.use('/', pageRoutes);

// MVC REST API Endpoints
app.use('/api', apiRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
