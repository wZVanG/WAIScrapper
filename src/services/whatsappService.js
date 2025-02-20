const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;
const path = require('path');
const ScrapingService = require('./scrapingService');
const CacheService = require('./cacheService');
const SubscriberService = require('./subscriberService');
const UrlShortenerService = require('./urlShortenerService');

class WhatsAppService {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        this.subscriberService = new SubscriberService();
        this.sentNewsFile = path.join(__dirname, '../../temp/sent_news.json');
        this.initialized = false;
        this.initializeClient();

        // Iniciar limpieza automática cada 24 horas
        setInterval(() => this.cleanOldNews(), 24 * 60 * 60 * 1000);
    }

    async initializeClient() {
        try {
            // Crear directorio temp si no existe
            await fs.mkdir(path.join(__dirname, '../../temp'), { recursive: true });

            // Crear archivo de noticias enviadas si no existe
            try {
                await fs.access(this.sentNewsFile);
            } catch {
                await fs.writeFile(this.sentNewsFile, JSON.stringify({}));
            }

            await this.subscriberService.loadSubscribers();

            this.client.on('qr', (qr) => {
                qrcode.generate(qr, { small: true });
                console.log('Por favor escanea el código QR para iniciar sesión');
            });

            this.client.on('ready', () => {
                console.log('Cliente de WhatsApp listo');
                this.initialized = true;
                this.startNewsTimer();
            });

            await this.client.initialize();
        } catch (error) {
            console.error('Error inicializando WhatsApp:', error);
        }
    }

    async loadSentNews() {
        try {
            const data = await fs.readFile(this.sentNewsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error cargando noticias enviadas:', error);
            return {};
        }
    }

    async saveSentNews(phoneNumber, topic, newsData) {
        try {
            if (!newsData || !newsData.link) {
                console.error('Datos de noticia inválidos:', newsData);
                return;
            }

            const sentNews = await this.loadSentNews();

            // Inicializar la estructura si no existe
            if (!sentNews[phoneNumber]) {
                sentNews[phoneNumber] = {
                    byTopic: {},
                    allNews: {}
                };
            }

            // Asegurarse de que byTopic[topic] existe
            if (!sentNews[phoneNumber].byTopic[topic]) {
                sentNews[phoneNumber].byTopic[topic] = [];
            }

            // Agregar el link a byTopic si no existe ya
            if (!sentNews[phoneNumber].byTopic[topic].includes(newsData.link)) {
                sentNews[phoneNumber].byTopic[topic].push(newsData.link);
            }

            // Agregar o actualizar en allNews con timestamp
            sentNews[phoneNumber].allNews[newsData.link] = {
                sentAt: new Date().toISOString(),
                publishedAt: newsData.time || new Date().toISOString()
            };

            await fs.writeFile(this.sentNewsFile, JSON.stringify(sentNews, null, 2));
        } catch (error) {
            console.error('Error guardando noticia enviada:', error);
        }
    }

    async cleanOldNews() {
        try {
            const sentNews = await this.loadSentNews();
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 20);

            for (const phoneNumber in sentNews) {
                const subscriber = sentNews[phoneNumber];
                const linksToDelete = [];

                // Identificar noticias antiguas
                for (const link in subscriber.allNews) {
                    const newsData = subscriber.allNews[link];
                    const sentDate = new Date(newsData.sentAt);

                    if (sentDate < tenDaysAgo) {
                        linksToDelete.push(link);
                    }
                }

                // Eliminar noticias antiguas
                linksToDelete.forEach(link => {
                    delete subscriber.allNews[link];
                    // Limpiar también de byTopic
                    for (const topic in subscriber.byTopic) {
                        subscriber.byTopic[topic] = subscriber.byTopic[topic].filter(
                            savedLink => savedLink !== link
                        );
                    }
                });
            }

            await fs.writeFile(this.sentNewsFile, JSON.stringify(sentNews, null, 2));
            console.log('Limpieza de noticias antiguas completada');
        } catch (error) {
            console.error('Error limpiando noticias antiguas:', error);
        }
    }

    async isNewsAlreadySent(phoneNumber, link) {
        const sentNews = await this.loadSentNews();
        return sentNews[phoneNumber]?.allNews?.hasOwnProperty(link) || false;
    }

    isNewsWithinAge(newsTime, maxAgeDays) {
        if (!newsTime) return false;

        const newsDate = new Date(newsTime);
        const maxAge = new Date();
        maxAge.setDate(maxAge.getDate() - maxAgeDays);

        return newsDate >= maxAge;
    }

    async updateNewsQueue(subscriber, topic) {
        try {
            let news = CacheService.get(`news-${topic}`);

            if (!news) {
                news = await ScrapingService.scrapeNews(topic);
                CacheService.set(`news-${topic}`, news);
            }

            // Limpiar la cola actual del topic si existe
            if (!subscriber.newsQueue[topic]) {
                subscriber.newsQueue[topic] = [];
            }

            // Procesar cada noticia
            for (const article of news) {
                // Verificar la antigüedad de la noticia
                if (!this.isNewsWithinAge(article.time, subscriber.maxNewsAge)) {
                    continue;
                }

                // Usar solo el link como identificador
                const isAlreadySent = await this.isNewsAlreadySent(subscriber.phoneNumber, article.link);

                // Verificar si la noticia está en alguna cola
                const isInAnyQueue = Object.values(subscriber.newsQueue).some(
                    queue => queue.some(q => q.link === article.link)
                );

                if (!isAlreadySent && !isInAnyQueue) {
                    subscriber.newsQueue[topic].push(article);
                }
            }

            console.log(`Cola actualizada para ${subscriber.phoneNumber} - ${topic}. Noticias pendientes: ${subscriber.newsQueue[topic].length}`);
        } catch (error) {
            console.error(`Error actualizando cola de noticias para ${subscriber.phoneNumber} - ${topic}:`, error);
            throw error;
        }
    }

    async sendNextNews(subscriber, topic) {
        if (!this.initialized) return;

        if (subscriber.newsQueue[topic].length === 0) {
            await this.updateNewsQueue(subscriber, topic);
            if (subscriber.newsQueue[topic].length === 0) {
                console.log(`No hay noticias nuevas para enviar a ${subscriber.phoneNumber} sobre ${topic}`);
                return;
            }
        }

        let news;
        try {
            news = subscriber.newsQueue[topic].shift();

            // Acortar la URL antes de enviar el mensaje
            const shortUrl = await UrlShortenerService.shortenUrl(news.link);

            const message = `📱 *${topic.toUpperCase()}*\n\n` +
                `🗞️ *${news.title}*\n\n` +
                `📰 ${news.source}\n` +
                `⏰ ${new Date(news.time).toLocaleString()}\n\n` +
                `🔗 ${shortUrl}`;

            // Enviar imagen si está disponible
            if (news.image) {
                try {
                    const media = await MessageMedia.fromUrl(news.image, {
                        unsafeMime: true,
                        filename: `news-${Date.now()}.jpg`
                    });
                    await this.client.sendMessage(subscriber.phoneNumber, media, {
                        caption: message
                    });
                } catch (imageError) {
                    console.error('Error enviando imagen, enviando solo texto:', imageError);
                    await this.client.sendMessage(subscriber.phoneNumber, message);
                }
            } else {
                await this.client.sendMessage(subscriber.phoneNumber, message);
            }

            // Guardar noticia como enviada
            await this.saveSentNews(subscriber.phoneNumber, topic, {
                link: news.link,
                time: news.time
            });

            subscriber.lastSent[topic] = new Date();
            console.log(`Noticia enviada a ${subscriber.phoneNumber} sobre ${topic}`);
        } catch (error) {
            console.error(`Error enviando noticia a ${subscriber.phoneNumber}:`, error);
            if (news) {
                subscriber.newsQueue[topic].unshift(news);
            }
        }
    }

    checkAndSendNews() {
        const subscribers = this.subscriberService.getAllSubscribers();

        subscribers.forEach(subscriber => {
            subscriber.topics.forEach(topic => {
                const timeSinceLastSent = new Date() - new Date(subscriber.lastSent[topic]);
                const intervalMs = subscriber.interval * 60 * 1000;

                if (timeSinceLastSent >= intervalMs) {
                    this.sendNextNews(subscriber, topic);
                }
            });
        });
    }

    startNewsTimer() {
        // Verificar cada minuto si toca enviar noticias
        setInterval(() => this.checkAndSendNews(), 60 * 1000);

        // Actualizar colas cada hora
        setInterval(() => {
            const subscribers = this.subscriberService.getAllSubscribers();
            subscribers.forEach(subscriber => {
                subscriber.topics.forEach(topic => {
                    this.updateNewsQueue(subscriber, topic);
                });
            });
        }, 60 * 60 * 1000);

        // Iniciar primera actualización
        this.checkAndSendNews();
    }

    // Métodos para gestionar suscriptores
    async addSubscriber(phoneNumber, topics, interval, maxNewsAge) {
        return this.subscriberService.addSubscriber(phoneNumber, topics, interval, maxNewsAge);
    }

    async updateSubscriber(phoneNumber, updates) {
        return this.subscriberService.updateSubscriber(phoneNumber, updates);
    }

    async removeSubscriber(phoneNumber) {
        return this.subscriberService.removeSubscriber(phoneNumber);
    }

    getSubscriber(phoneNumber) {
        return this.subscriberService.getSubscriber(phoneNumber);
    }

    async getGroupId(groupName) {
        try {
            const chats = await this.client.getChats();
            const group = chats.find(chat =>

                chat.name.toLowerCase() === groupName.toLowerCase()
            );

            console.log(chats.map((({ id, name }) => console.log(id, name))));

            return group ? group.id._serialized : null;
        } catch (error) {
            console.error('Error obteniendo ID del grupo:', error);
            throw error;
        }
    }

    async getAllChats() {
        try {
            const chats = await this.client.getChats();
            return chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name
            }));
        } catch (error) {
            console.error('Error obteniendo todos los chats:', error);
            throw error;
        }
    }
}

module.exports = new WhatsAppService();