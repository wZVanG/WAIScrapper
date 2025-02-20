const axios = require('axios');
require('dotenv').config();

class UrlShortenerService {
    constructor() {
        this.apiUrl = process.env.SHORTURL_API_URL;
        this.apiKey = process.env.SHORTURL_API_KEY;
    }

    async shortenUrl(url) {
        try {
            const response = await axios.post(
                this.apiUrl,
                { url },
                {
                    headers: {
                        'X-Api-Key': this.apiKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.success && response.data.data.short_url) {
                return response.data.data.short_url;
            }

            return url; // Devolver URL original si no hay short_url en la respuesta
        } catch (error) {
            console.log('Error en el servicio de acortamiento de URL:', error);
            return url; // Devolver URL original en caso de cualquier error
        }
    }
}

module.exports = new UrlShortenerService(); 