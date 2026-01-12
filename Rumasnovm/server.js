const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const EventEmitter = require('events');

const { ServerRPC, createRPCProxy } = require('./RumasRPC/RPC');
const { ngrok } = require('./ngrok');

class RServer extends EventEmitter {
    constructor(port, usengrok = false) {
        super();
        
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('WebSocket сервер работает');
        });
        
        this.ws = new WebSocket.Server({ server });
        this.clients = new Map();
        this.rpcServers = new Map(); // Храним RPC серверы
        
        this.ws.on('connection', async (socket) => {
            const clientId = uuidv4();
            
            // Создаём RPC сервер для этого клиента
            const rpcServer = new ServerRPC(
                (data) => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(data);
                    }
                },
                (callback) => {
                    socket.on('message', (rawData) => {
                        const dataStr = rawData.toString();
                        callback(dataStr);
                    });
                }
            );
            
            this.clients.set(clientId, socket);
            this.rpcServers.set(clientId, rpcServer);
            
            console.log(`Клиент подключился: ${clientId}`);
            console.log(`Всего клиентов: ${this.clients.size}`);

                await new Promise(resolve => {
                    if (rpcServer.comm.connected) {
                        resolve();
                    } else {
                        rpcServer.comm.once('connected', resolve);
                    }
                });
            
            // Отправляем ID клиенту
            socket.send(JSON.stringify({
                type: 'connection',
                clientId: clientId
            }));
            
            socket.on('close', () => {
                this.clients.delete(clientId);
                this.rpcServers.delete(clientId);
                console.log(`Клиент отключился: ${clientId}`);
                console.log(`Осталось клиентов: ${this.clients.size}`);
            });
            
            socket.on('error', () => {
                this.clients.delete(clientId);
                this.rpcServers.delete(clientId);
            });
            
            this.emit('connect', clientId, rpcServer);
        });
        
        if (usengrok) {
this.ngrok = new ngrok(port, undefined, undefined, server);
} else {
        server.listen(port, () => {
            console.log(`RServer запущен на порту ${port}`);
        });
}
    }

    // Получить RPC сервер для клиента
    getRPC(clientId) {
        return this.rpcServers.get(clientId);
    }

    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }

    sendexitbot(clientId) {
        this.sendToClient(clientId, JSON.stringify({
            type: 'exitbot'
        }));
    }

    broadcast(message) {
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    get allclients() {
        return [...this.clients.keys()];
    }

    // Теперь можно вызывать методы через RPC
    async callBot(clientId, method, args = []) {
        const rpc = this.rpcServers.get(clientId);
        if (!rpc) throw new Error(`Client ${clientId} not found`);
        return await rpc.call('bot', method, args);
    }
    
    async getBotProperty(clientId, property) {
        const rpc = this.rpcServers.get(clientId);
        if (!rpc) throw new Error(`Client ${clientId} not found`);
        return await rpc.get('bot', property);
    }

broadcastMethod(objectName, method, args = []) {
    this.rpcServers.forEach(async (rpc, clientId) => {
        try {
            await rpc.call(objectName, method, args);
        } catch(e) {
            console.error(`Ошибка на клиенте ${clientId}:`, e);
        }
    });
}
}

module.exports = { RServer, createRPCProxy };
