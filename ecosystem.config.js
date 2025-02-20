module.exports = {
    apps: [{
        name: 'waiscrapper-whatsapp',
        script: 'src/whatsapp.js',
        watch: true,
        ignore_watch: ['node_modules', 'temp'],
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production'
        }
    }]
}; 