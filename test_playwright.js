const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false }); // Cambiar a false para ver el navegador en acción 
    const page = await browser.newPage();

    // URL de búsqueda en Google News
    const tema = 'inteligencia artificial peru';
    const url = `https://news.google.com/search?q=${encodeURIComponent(tema)}&hl=es-419&gl=PE&ceid=PE%3Aes-419`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Extraer los datos de las noticias
    const articles = await page.$$eval('article', (articles) =>
        articles.map(article => {

            //const objContent = article.children[0];
            //const objLink = objContent.children[0].querySelector('a');

            const objTime = article.querySelector('[datetime]');
            const objImage = article.querySelector('figure')?.querySelector("img");
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

            const image = urlImage ? `https://news.google.com${urlImage}` : '';
            const title = objTitle ? objTitle.innerText : 'Sin título';
            const time = objTime ? objTime.getAttribute('datetime') : objTime.innerText;
            const link = objLink && objLink.getAttribute('href') ? `https://news.google.com${objLink.getAttribute('href').replace('./', '/')}` : '';
            const source = objSource ? objSource.innerText : 'Fuente desconocida';

            return {
                image,
                title,
                time,
                link,
                source
            }

        })
    );

    console.log(articles);

    await browser.close();
})();
