const { chromium } = require('playwright');
// Función principal de scraping
async function scrapeNews(tema) {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setDefaultTimeout(30000); // Timeout de 30 segundos

        const url = `https://news.google.com/search?q=${encodeURIComponent(tema)}&hl=es-419&gl=PE&ceid=PE%3Aes-419`;

        console.log("Navegando a:", url);

        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        const articles = await page.$$eval('article', (articles) =>
            articles.slice(0, 20).map(article => { // Limitamos a 20 artículos
                try {
                    const objTime = article.querySelector('[datetime]');
                    const objImage = article.querySelector('figure img');
                    const objSource = article.querySelector('[data-n-tid="9"]');
                    const objTitle = article.querySelector('[data-n-tid="29"]');
                    const objLink = objTitle;

                    let urlImage = '';
                    if (objImage) {
                        const srcSet = objImage.getAttribute("srcset");
                        if (srcSet) {
                            const matches = srcSet.match(/([^,\s]+)\s2x/);
                            if (matches) urlImage = matches[1];
                        } else {
                            urlImage = objImage.getAttribute("src") || '';
                        }
                    }

                    return {
                        image: urlImage ? `https://news.google.com${urlImage}` : '',
                        title: objTitle?.innerText?.trim() || 'Sin título',
                        time: objTime?.getAttribute('datetime') || '',
                        link: objLink?.getAttribute('href') ?
                            `https://news.google.com${objLink.getAttribute('href').replace('./', '/')}` : '',
                        source: objSource?.innerText?.trim() || 'Fuente desconocida'
                    };
                } catch (error) {
                    console.error('Error procesando artículo:', error);
                    return null;
                }
            }).filter(Boolean) // Eliminamos elementos null
        );

        console.log("Scraping finalizado:", articles.length, "artículos");

        return articles;
    } catch (error) {
        console.error('Error en scraping:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = scrapeNews;