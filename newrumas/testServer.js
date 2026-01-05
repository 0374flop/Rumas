const fs = require('fs');
const path = require('path');

const ControleBot = require('../../всякое/aiddbot/changesinput/controlebot');
const { Rumas } = require('./index');
const code = fs.readFileSync(path.join(__dirname, 'codetosend', 'controlbot.js'), { encoding: 'utf-8' });

const server = new Rumas.Server(1242, true);

server.on('connect', (clientId) => {
    server.sendCode(clientId, code, { adresss: '45.141.57.22:8321'});

    const sendInput = (input) => {
        server.sendToClient(clientId, JSON.stringify({
            input: input
        }));
    }
    const bot = new ControleBot(sendInput);
    bot.StartServer(3221)
});