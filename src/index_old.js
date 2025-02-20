const express = require('express');
const rateLimit = require('express-rate-limit');
const cache = require('node-cache');
const cors = require('cors');
const helmet = require('helmet');
const scrapeNews = require('./lib/scrapeNews');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de caché
const newsCache = new cache({
    stdTTL: 3600, // Tiempo de vida de 1 hora
    checkperiod: 120 // Verificar caducidad cada 2 minutos
});

// Configuración de rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // límite de 100 solicitudes por ventana
});

// Middleware de seguridad y optimización
app.use(helmet()); // Seguridad
app.use(cors()); // CORS
app.use(limiter); // Rate limiting
app.use(express.json()); // Parser JSON

// Función para limpiar y validar el query
const sanitizeQuery = (query) => {
    if (!query) return 'inteligencia artificial peru';
    return query.slice(0, 100).replace(/[^\w\s]/gi, '');
};


// Ruta principal con manejo de caché
app.get('/ia', async (req, res) => {
    try {
        const tema = sanitizeQuery(req.query.q);
        const cacheKey = `news-${tema}`;

        // Verificar caché
        const cachedResult = newsCache.get(cacheKey);
        if (cachedResult) {
            console.log("Resultado encontrado en caché", cachedResult.length, "artículos");
            return res.json({
                source: 'cache',
                data: cachedResult
            });
        }

        // Realizar scraping
        const articles = await scrapeNews(tema);

        // Guardar en caché
        newsCache.set(cacheKey, articles);

        res.json({
            source: 'fresh',
            data: articles
        });
    } catch (error) {
        console.error('Error en la ruta:', error);
        res.status(500).json({
            error: 'Error al obtener noticias',
            message: error.message
        });
    }
});

// Middleware de error global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});