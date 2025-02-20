const fs = require('fs').promises;
const path = require('path');
const Subscriber = require('../models/subscriber');

const { defaultSubscribers, validateSubscriberConfig } = require('../config/subscribers');

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
                            sub.maxNewsAge,
                            sub.isGroup
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
            const normalizedId = this.normalizeId(phoneNumber);
            const subscriber = new Subscriber(normalizedId, topics, interval, maxNewsAge);
            this.subscribers.set(normalizedId, subscriber);
            await this.saveSubscribers();
            return subscriber;
        } catch (error) {
            console.error('Error agregando suscriptor:', error);
            throw error;
        }
    }

    normalizeId(id) {
        if (!id) throw new Error('ID requerido');

        // Eliminar espacios y caracteres especiales
        let normalized = id.replace(/[^\d@g.us@c.us]/g, '');

        // Validar que termine en uno de los sufijos válidos
        if (!normalized.endsWith('@g.us') && !normalized.endsWith('@c.us')) {
            throw new Error('El ID debe terminar en @g.us (grupo) o @c.us (usuario)');
        }

        return normalized;
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
}

module.exports = SubscriberService;