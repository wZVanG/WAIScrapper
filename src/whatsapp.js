const WhatsAppService = require('./services/whatsappService');

// Ejemplo de uso
async function main() {
    // Esperar a que el servicio esté inicializado
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Agregar un nuevo suscriptor
    /*await WhatsAppService.addSubscriber(
        '51999999999@c.us',
        ['tecnologia peru', 'startups peru'],
        15, // intervalo de 15 minutos
        3
    );*/

    // Actualizar un suscriptor existente
    await WhatsAppService.updateSubscriber('51969508442@c.us', {
        topics: ['inteligencia artificial peru', 'blockchain peru'],
        topics: [
            'inteligencia artificial peru',
            'inteligencia artificial',
            'tecnologia peru',
            'musica'
        ],
        interval: 1, // 10 minutos entre cada envío
        maxNewsAge: 7
    });

    console.log('Suscriptor actualizado');
}

console.log('Iniciando servicio de WhatsApp...');
main().catch(console.error);