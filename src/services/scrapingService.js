const { chromium } = require('playwright');
const config = require('../config/config');

class ScrapingService {
    constructor() {
        this.showLogs = config.scraping.showLogs;
    }

    log(...args) {
        if (this.showLogs) {
            console.log(...args);
        }
    }

    logError(...args) {
        if (this.showLogs) {
            console.error(...args);
        }
    }

    logTime(label) {
        if (this.showLogs) {
            console.time(label);
        }
    }

    logTimeEnd(label) {
        if (this.showLogs) {
            console.timeEnd(label);
        }
    }

    async scrapeNews(tema) {
        this.log(`🔍 Iniciando scraping para tema: "${tema}"`);
        this.logTime(`Tiempo total de scraping ${tema}`);


        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            this.log('🌐 Iniciando navegador...');
            const page = await browser.newPage();
            await page.setDefaultTimeout(config.scraping.timeout);

            const url = `https://news.google.com/search?q=${encodeURIComponent(tema)}&hl=es-419&gl=PE&ceid=PE%3Aes-419`;
            this.log(`📡 Navegando a: ${url}`);

            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: config.scraping.timeout
            });

            this.log('🔎 Buscando artículos...');
            const articles = await page.$$eval('article', (articles, maxArticles) => {
                const extractImageUrl = (imgElement) => {
                    if (!imgElement) return '';

                    const srcSet = imgElement.getAttribute("srcset");
                    if (srcSet) {
                        const matches = srcSet.match(/([^,\s]+)\s2x/);
                        return matches ? matches[1] : '';
                    }
                    return imgElement.getAttribute("src") || '';
                };

                const buildFullUrl = path => path ? `https://news.google.com${path}` : '';

                return articles.slice(0, maxArticles)
                    .map(article => {
                        try {
                            const selectors = {
                                time: article.querySelector('[datetime]'),
                                image: article.querySelector('figure img'),
                                source: article.querySelector('[data-n-tid="9"]'),
                                title: article.querySelector('[data-n-tid="29"]')
                            };

                            const imageUrl = extractImageUrl(selectors.image);

                            return {
                                image: buildFullUrl(imageUrl),
                                title: selectors.title?.innerText?.trim() || 'Sin título',
                                time: selectors.time?.getAttribute('datetime') || '',
                                link: buildFullUrl(selectors.title?.getAttribute('href')?.replace('./', '/')),
                                source: selectors.source?.innerText?.trim() || 'Fuente desconocida'
                            };
                        } catch (error) {
                            console.error('Error procesando artículo:', error.message);
                            return null;
                        }
                    })
                    .filter(Boolean);
            }, config.scraping.maxArticles);

            this.log(`✅ Scraping completado. ${articles.length} artículos extraídos`);
            this.logTimeEnd(`Tiempo total de scraping ${tema}`);

            return articles;
        } catch (error) {
            this.logError('❌ Error durante el scraping:', error);
            throw error;
        } finally {
            this.log('🔒 Cerrando navegador');
            await browser.close();
        }
    }
}

module.exports = new ScrapingService();