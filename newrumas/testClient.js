const { offvm } = require('./client');
const { Rumas } = require('./index');

Rumas.Client.connect('wss://kit-touched-commonly.ngrok-free.app');

process.on('SIGINT', () => {
    try {offvm();} catch {}
    process.exit()
})