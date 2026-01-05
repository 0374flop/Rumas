const fs = require('fs');
const path = require('path');

const ControleBot = require('../../всякое/aiddbot/changesinput/controlebot');
const { Rumas } = require('./index');
const code = fs.readFileSync(path.join(__dirname, 'codetosend', 'controlbot.js'), { encoding: 'utf-8' })

const server = new Rumas.Server(1242, true);

server.on('connect', (clientId) => {
    server.sendCode(clientId, code)
})