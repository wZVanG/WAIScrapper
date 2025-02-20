class Subscriber {
    constructor(phoneNumber, topics, interval = 10, maxNewsAge = 5) {
        this.validatePhoneNumber(phoneNumber);
        this.validateTopics(topics);
        this.validateInterval(interval);
        this.validateMaxNewsAge(maxNewsAge);

        this.phoneNumber = phoneNumber;
        this.topics = topics;
        this.interval = interval; // minutos
        this.maxNewsAge = maxNewsAge; // días máximos de antigüedad de noticias
        this.isGroup = phoneNumber.endsWith('@g.us');
        this.lastSent = {};
        this.newsQueue = {};

        // Inicializar cola y último envío para cada tema
        topics.forEach(topic => {
            this.newsQueue[topic] = [];
            this.lastSent[topic] = new Date(0).toISOString();
        });
    }

    // Validaciones
    validatePhoneNumber(phoneNumber) {
        if (!phoneNumber) {
            throw new Error('El número de teléfono o ID de grupo es requerido');
        }

        if (phoneNumber.endsWith('@g.us')) {
            // Es un grupo, no necesitamos más validación
            return;
        } else if (phoneNumber.endsWith('@c.us')) {
            // Es un usuario individual, validar el número
            const digits = phoneNumber.replace('@c.us', '');
            if (!/^\d{10,}$/.test(digits)) {
                throw new Error('El número de teléfono debe tener al menos 10 dígitos');
            }
        } else {
            throw new Error('El identificador debe terminar en @g.us (grupo) o @c.us (usuario)');
        }
    }

    validateTopics(topics) {
        if (!Array.isArray(topics)) {
            throw new Error('Los temas deben ser un array');
        }
        if (topics.length === 0) {
            throw new Error('Debe proporcionar al menos un tema');
        }
        if (topics.some(topic => typeof topic !== 'string' || topic.trim() === '')) {
            throw new Error('Todos los temas deben ser strings no vacíos');
        }
    }

    validateInterval(interval) {
        if (typeof interval !== 'number') {
            throw new Error('El intervalo debe ser un número');
        }
        if (interval < 1 || interval > 60) {
            throw new Error('El intervalo debe estar entre 1 y 60 minutos');
        }
    }

    validateMaxNewsAge(maxNewsAge) {
        if (typeof maxNewsAge !== 'number') {
            throw new Error('La edad máxima de noticias debe ser un número');
        }
        if (maxNewsAge < 1 || maxNewsAge > 30) {
            throw new Error('La edad máxima debe estar entre 1 y 30 días');
        }
    }

    // Métodos de gestión de temas
    addTopic(topic) {
        if (typeof topic !== 'string' || topic.trim() === '') {
            throw new Error('El tema debe ser un string no vacío');
        }
        if (!this.topics.includes(topic)) {
            this.topics.push(topic);
            this.newsQueue[topic] = [];
            this.lastSent[topic] = new Date(0).toISOString();
        }
    }

    removeTopic(topic) {
        const index = this.topics.indexOf(topic);
        if (index !== -1) {
            this.topics.splice(index, 1);
            delete this.newsQueue[topic];
            delete this.lastSent[topic];
        }
    }

    // Métodos de gestión de cola
    addToQueue(topic, news) {
        if (!this.topics.includes(topic)) {
            throw new Error(`El tema ${topic} no está registrado para este suscriptor`);
        }
        if (!this.newsQueue[topic]) {
            this.newsQueue[topic] = [];
        }
        this.newsQueue[topic].push(news);
    }

    getNextNews(topic) {
        if (!this.topics.includes(topic)) {
            throw new Error(`El tema ${topic} no está registrado para este suscriptor`);
        }
        return this.newsQueue[topic].shift();
    }

    clearQueue(topic) {
        if (topic) {
            if (!this.topics.includes(topic)) {
                throw new Error(`El tema ${topic} no está registrado para este suscriptor`);
            }
            this.newsQueue[topic] = [];
        } else {
            this.topics.forEach(t => {
                this.newsQueue[t] = [];
            });
        }
    }

    // Métodos de tiempo
    shouldSendNews(topic) {
        if (!this.topics.includes(topic)) {
            return false;
        }
        const lastSentTime = new Date(this.lastSent[topic]);
        const now = new Date();
        const timeDiff = now - lastSentTime;
        return timeDiff >= this.interval * 60 * 1000;
    }

    updateLastSent(topic) {
        if (!this.topics.includes(topic)) {
            throw new Error(`El tema ${topic} no está registrado para este suscriptor`);
        }
        this.lastSent[topic] = new Date().toISOString();
    }

    // Serialización
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

    // Métodos de utilidad
    isNewsExpired(newsTime) {
        if (!newsTime) return true;

        const newsDate = new Date(newsTime);
        const maxAge = new Date();
        maxAge.setDate(maxAge.getDate() - this.maxNewsAge);

        return newsDate < maxAge;
    }

    getQueueLength(topic) {
        if (!this.topics.includes(topic)) {
            throw new Error(`El tema ${topic} no está registrado para este suscriptor`);
        }
        return this.newsQueue[topic].length;
    }

    getTotalQueueLength() {
        return Object.values(this.newsQueue)
            .reduce((total, queue) => total + queue.length, 0);
    }
}

module.exports = Subscriber;