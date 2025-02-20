const fs = require('fs').promises;
const path = require('path');

const { defaultSubscribers, validateSubscriberConfig } = require('../config/subscribers');


class Subscriber {
    constructor(phoneNumber, topics, interval = 10, maxNewsAge = 5) {
        this.phoneNumber = phoneNumber;
        this.topics = topics;
        this.interval = interval; // minutos
        this.maxNewsAge = maxNewsAge; // días máximos de antigüedad de noticias
        this.lastSent = {};
        this.newsQueue = {};

        // Inicializar cola y último envío para cada tema
        topics.forEach(topic => {
            this.newsQueue[topic] = [];
            this.lastSent[topic] = new Date(0).toISOString();
        });
    }

    toJSON() {
        return {
            phoneNumber: this.phoneNumber,
            topics: this.topics,
            interval: this.interval,
            maxNewsAge: this.maxNewsAge,
            lastSent: this.lastSent
        };
    }

    static fromJSON(json) {
        const subscriber = new Subscriber(
            json.phoneNumber,
            json.topics,
            json.interval,
            json.maxNewsAge
        );
        subscriber.lastSent = json.lastSent || {};
        return subscriber;
    }
}

class SubscriberService {
    constructor() {
        this.subscribersFile = path.join(__dirname, '../../temp/subscribers.json');
        this.subscribers = new Map();
        this.defaultSubscribers = defaultSubscribers;
    }

    async loadSubscribers() {
        try {
            // Asegurar que el directorio temp existe
            await fs.mkdir(path.dirname(this.subscribersFile), { recursive: true });

            try {
                const data = await fs.readFile(this.subscribersFile, 'utf8');
                const subscribers = JSON.parse(data);

                // Limpiar el Map actual
                this.subscribers.clear();

                // Cargar cada suscriptor en el Map
                subscribers.forEach(sub => {
                    this.subscribers.set(
                        sub.phoneNumber,
                        Subscriber.fromJSON(sub)
                    );
                });
            } catch (error) {
                // Si el archivo no existe o está corrupto, cargar suscriptores por defecto
                console.log('Cargando suscriptores por defecto...');
                this.defaultSubscribers.forEach(sub => {
                    this.subscribers.set(
                        sub.phoneNumber,
                        new Subscriber(
                            sub.phoneNumber,
                            sub.topics,
                            sub.interval,
                            sub.maxNewsAge
                        )
                    );
                });
                await this.saveSubscribers();
            }
        } catch (error) {
            console.error('Error cargando suscriptores:', error);
            throw error;
        }
    }

    async saveSubscribers() {
        try {
            const subscribersArray = Array.from(this.subscribers.values()).map(sub => sub.toJSON());
            await fs.writeFile(
                this.subscribersFile,
                JSON.stringify(subscribersArray, null, 2)
            );
        } catch (error) {
            console.error('Error guardando suscriptores:', error);
            throw error;
        }
    }

    async addSubscriber(phoneNumber, topics, interval = 10, maxNewsAge = 5) {
        try {
            // Validar número de teléfono
            if (!phoneNumber.endsWith('@c.us')) {
                phoneNumber = `${phoneNumber}@c.us`;
            }

            // Validar temas
            if (!Array.isArray(topics) || topics.length === 0) {
                throw new Error('Se requiere al menos un tema');
            }

            // Validar intervalos
            interval = Math.max(1, Math.min(interval, 60)); // Entre 1 y 60 minutos
            maxNewsAge = Math.max(1, Math.min(maxNewsAge, 30)); // Entre 1 y 30 días

            const subscriber = new Subscriber(phoneNumber, topics, interval, maxNewsAge);
            this.subscribers.set(phoneNumber, subscriber);
            await this.saveSubscribers();
            return subscriber;
        } catch (error) {
            console.error('Error agregando suscriptor:', error);
            throw error;
        }
    }

    async updateSubscriber(phoneNumber, updates) {
        try {
            const subscriber = this.subscribers.get(phoneNumber);
            if (!subscriber) {
                throw new Error(`Suscriptor no encontrado: ${phoneNumber}`);
            }

            // Actualizar propiedades permitidas
            if (updates.topics) {
                if (!Array.isArray(updates.topics) || updates.topics.length === 0) {
                    throw new Error('Se requiere al menos un tema');
                }
                subscriber.topics = updates.topics;
                // Actualizar colas y últimos envíos para nuevos temas
                updates.topics.forEach(topic => {
                    if (!subscriber.newsQueue[topic]) {
                        subscriber.newsQueue[topic] = [];
                    }
                    if (!subscriber.lastSent[topic]) {
                        subscriber.lastSent[topic] = new Date(0).toISOString();
                    }
                });
            }

            if (typeof updates.interval === 'number') {
                subscriber.interval = Math.max(1, Math.min(updates.interval, 60));
            }

            if (typeof updates.maxNewsAge === 'number') {
                subscriber.maxNewsAge = Math.max(1, Math.min(updates.maxNewsAge, 30));
            }

            await this.saveSubscribers();
            return subscriber;
        } catch (error) {
            console.error('Error actualizando suscriptor:', error);
            throw error;
        }
    }

    async removeSubscriber(phoneNumber) {
        try {
            const result = this.subscribers.delete(phoneNumber);
            if (result) {
                await this.saveSubscribers();
            }
            return result;
        } catch (error) {
            console.error('Error eliminando suscriptor:', error);
            throw error;
        }
    }

    getSubscriber(phoneNumber) {
        return this.subscribers.get(phoneNumber);
    }

    getAllSubscribers() {
        return Array.from(this.subscribers.values());
    }

    // Método para validar y normalizar número de teléfono
    normalizePhoneNumber(phoneNumber) {
        if (!phoneNumber) throw new Error('Número de teléfono requerido');

        // Eliminar todos los caracteres no numéricos excepto @c.us
        let normalized = phoneNumber.replace(/[^\d@c.us]/g, '');

        // Si no tiene el sufijo @c.us, agregarlo
        if (!normalized.endsWith('@c.us')) {
            normalized = `${normalized}@c.us`;
        }

        // Validar que tenga al menos 10 dígitos antes del @c.us
        const digits = normalized.replace('@c.us', '');
        if (digits.length < 10) {
            throw new Error('Número de teléfono inválido');
        }

        return normalized;
    }
}

module.exports = SubscriberService;