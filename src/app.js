const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/config');
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const newsRoutes = require('./routes/newsRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(rateLimiter);
app.use(express.json());

// Rutas
app.use('/api', newsRoutes);

// Manejador de errores
app.use(errorHandler);

module.exports = app;