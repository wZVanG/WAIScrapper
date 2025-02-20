const config = {
    port: process.env.PORT || 3000,
    cache: {
        ttl: 3600,
        checkPeriod: 120
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100
    },
    scraping: {
        maxArticles: 20,
        timeout: 30000
    }
};

module.exports = config;