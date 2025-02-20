const ScrapingService = require('../services/scrapingService');
const CacheService = require('../services/cacheService');
const Sanitizer = require('../utils/sanitizer');

class NewsController {
    async getNews(req, res) {
        try {
            const tema = Sanitizer.sanitizeQuery(req.query.q);
            const cacheKey = `news-${tema}`;

            // Verificar caché
            const cachedResult = CacheService.get(cacheKey);
            if (cachedResult) {
                return res.json({
                    source: 'cache',
                    data: cachedResult
                });
            }

            // Realizar scraping
            const articles = await ScrapingService.scrapeNews(tema);

            // Guardar en caché
            CacheService.set(cacheKey, articles);

            res.json({
                source: 'fresh',
                data: articles
            });
        } catch (error) {
            console.error('Error en el controlador:', error);
            res.status(500).json({
                error: 'Error al obtener noticias',
                message: error.message
            });
        }
    }
}

module.exports = new NewsController();
