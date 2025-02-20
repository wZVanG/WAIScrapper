const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/ia', async (req, res) => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const tema = req.query.q || 'inteligencia artificial peru';
    const url = `https://news.google.com/search?q=${encodeURIComponent(tema)}&hl=es-419&gl=PE&ceid=PE%3Aes-419`;

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const articles = await page.$$eval('article', (articles) =>
        articles.map(article => {
            const objTime = article.querySelector('[datetime]');
            const objImage = article.querySelector('figure img');
            const objSource = article.querySelector('[data-n-tid="9"]');
            const objTitle = article.querySelector('[data-n-tid="29"]');
            const objLink = objTitle;

            let urlImage;
            if (objImage) {
                const srcSet = objImage.getAttribute("srcset");
                if (srcSet) {
                    const matches = srcSet.match(/([^,\s]+)\s2x/);
                    if (matches) urlImage = matches[1];
                } else {
                    urlImage = objImage.getAttribute("src");
                }
            }

            return {
                image: urlImage ? `https://news.google.com${urlImage}` : '',
                title: objTitle ? objTitle.innerText : 'Sin título',
                time: objTime ? objTime.getAttribute('datetime') : '',
                link: objLink && objLink.getAttribute('href') ? `https://news.google.com${objLink.getAttribute('href').replace('./', '/')}` : '',
                source: objSource ? objSource.innerText : 'Fuente desconocida'
            };
        })
    );

    await browser.close();
    res.json(articles);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
