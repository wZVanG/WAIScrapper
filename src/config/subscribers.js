/**
 * Configuración de suscriptores por defecto
 * phoneNumber: Número de teléfono con formato internacional + @c.us
 * topics: Array de temas a los que está suscrito
 * interval: Intervalo en minutos entre envíos (1-60)
 * maxNewsAge: Antigüedad máxima en días de las noticias (1-30)
 */

const defaultSubscribers = [
    {
        phoneNumber: '51969508442@c.us',
        topics: [
            'inteligencia artificial peru',
            'inteligencia artificial',
            'tecnologia peru',
            'musica'
        ],
        interval: 30, // 10 minutos entre cada envío
        maxNewsAge: 7 // máximo 5 días de antigüedad
    },
    // Ejemplo de otro suscriptor
    // {
    //     phoneNumber: '51999999999@c.us',
    //     topics: [
    //         'tecnologia peru',
    //         'startups peru'
    //     ],
    //     interval: 15,
    //     maxNewsAge: 3
    // }
];

/**
 * Validación básica de la configuración de suscriptores
 */
function validateSubscriberConfig(subscriber) {
    // Validar número de teléfono
    if (!subscriber.phoneNumber?.endsWith('@c.us')) {
        throw new Error(`Número de teléfono inválido: ${subscriber.phoneNumber}`);
    }

    // Validar temas
    if (!Array.isArray(subscriber.topics) || subscriber.topics.length === 0) {
        throw new Error(`Temas inválidos para: ${subscriber.phoneNumber}`);
    }

    // Validar intervalo
    if (subscriber.interval < 1 || subscriber.interval > 60) {
        throw new Error(`Intervalo inválido para: ${subscriber.phoneNumber}`);
    }

    // Validar antigüedad máxima
    if (subscriber.maxNewsAge < 1 || subscriber.maxNewsAge > 30) {
        throw new Error(`Antigüedad máxima inválida para: ${subscriber.phoneNumber}`);
    }
}

// Validar todos los suscriptores por defecto
defaultSubscribers.forEach(validateSubscriberConfig);

module.exports = {
    defaultSubscribers,
    validateSubscriberConfig
};