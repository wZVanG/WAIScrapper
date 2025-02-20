const whatsappService = require('../services/whatsappService');

async function main() {
    try {

        // Esperar a que el cliente esté inicializado
        while (!whatsappService.initialized) {
            console.log('Esperando inicialización del cliente...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Nombre del grupo que quieres buscar
        const groupName = process.argv[2];

        if (!groupName) {
            console.error('Por favor proporciona el nombre del grupo como argumento');
            console.log('Ejemplo: node src/scripts/getGroupId.js "Nombre del Grupo"');
            process.exit(1);
        }

        console.log("Obteniendo... groupId --->",);

        const allChats = await whatsappService.getAllChats();

        console.log(allChats);

        /*const groupId = await whatsappService.getGroupId(groupName);

        if (groupId) {
            console.log('ID del grupo encontrado:', groupId);
        } else {
            console.log('No se encontró el grupo:', groupName);
        }*/

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

main();