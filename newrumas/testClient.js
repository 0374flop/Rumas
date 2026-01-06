const { Rumas } = require('./index');

Rumas.Client.connect('wss://kit-touched-commonly.ngrok-free.app'); // localhost:1243

process.on('SIGINT', () => {
    try {Rumas.Client.vmoff();} catch {}
    process.exit()
})