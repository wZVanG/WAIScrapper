const rateLimit = require('express-rate-limit');
const config = require('../config/config');

const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max
});

module.exports = limiter;