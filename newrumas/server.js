const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const EventEmiter = require('events')

const { ngrok } = require('./ngrok');

class RServer extends EventEmiter{
    constructor(port, usengrok = false) {
        super()
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('WebSocket сервер работает');
        });
        this.ws = new WebSocket.Server({ server });
        this.clients = new Map();
        this.ws.on('connection', (socket) => {
            this.socket = socket
            const clientId = uuidv4();
            this.clients.set(clientId, socket);
            console.log(`Клиент подключился: ${clientId}`);
            console.log(`Всего клиентов: ${this.clients.size}`);
            socket.send(JSON.stringify({
                type: 'connection',
                clientId: clientId
            }));
            socket.on('message', (data) => {
                console.log(`Сообщение от ${clientId}:`, data.toString());
            });
            socket.on('close', () => {
                this.clients.delete(clientId);
                console.log(`Клиент отключился: ${clientId}`);
                console.log(`Осталось клиентов: ${this.clients.size}`);
            });
            socket.on('error', () => {
                this.clients.delete(clientId);
            });
            this.emit('connect', clientId);
        });

        if (usengrok) this.ngrok = new ngrok(port, undefined, undefined, server);
    }

    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }

    broadcast(message) {
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    get allclients() {
        return [...this.clients.keys()]
    }

    sendCode(clientId, code) {
        this.sendToClient(clientId, JSON.stringify({
            type: 'code',
            codetext: code
        }))
    }
}

module.exports = {
    RServer
}