const fs = require('fs');
const path = require('path');

const ControleBot = require('../../всякое/aiddbot/changesinput/controlebot');
const { Rumas } = require('./index');
const code = fs.readFileSync(path.join(__dirname, 'codetosend', 'controlbot.js'), { encoding: 'utf-8' });

const server = new Rumas.Server(1243, true);

let ports = 3000

server.on('connect', (clientId) => {
    server.sendCode(clientId, code, { address: '45.141.57.22:8317'});

    const sendInput = (input) => {
        server.sendToClient(clientId, JSON.stringify({
            input: input
        }));
    }
    const bot = new ControleBot(sendInput);
    ports += 1
    bot.StartServer(ports);

    process.stdin.once('data', (data) => {
        server.sendexitbot(clientId)
    });
});