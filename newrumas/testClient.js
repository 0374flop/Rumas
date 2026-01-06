const { Rumas } = require('./index');

Rumas.Client.connect('ws://localhost:1243'); // kit-touched-commonly.ngrok-free.app

process.on('SIGINT', () => {
    try {Rumas.Client.vmoff();} catch {}
    process.exit()
})