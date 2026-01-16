const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const EventEmitter = require('events');

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
        
        this.ws.on('connection', async (socket) => {
            const clientId = uuidv4();
            
            this.clients.set(clientId, socket);
            
            console.log(`Клиент подключился: ${clientId}`);
            console.log(`Всего клиентов: ${this.clients.size}`);

            socket.send(JSON.stringify({
                type: 'connection',
                clientId: clientId
            }));
            
            socket.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    
                    // Обработка событий от ботов
                    if (message.type === 'eventbot') {
                        // Эмитим событие в формате 'bot_{botId}:{eventName}'
                        this.emit(`bot_${message.botId}:${message.event}`, ...message.data);
                    }
                    // Обработка ответа на создание бота
                    else if (message.type === 'createbot') {
                        this.emit('bot_created', clientId, message.botId);
                    }
                    // Обработка ответа на запрос количества ботов
                    else if (message.type === 'sizebotlist') {
                        this.emit('bot_list_size', clientId, message.bots);
                    }
                    
                    // Обычное событие message
                    this.emit('message', clientId, message);
                } catch (e) {
                    console.error('Ошибка парсинга сообщения:', e);
                }
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
        
        if (usengrok) {
            this.ngrok = new ngrok(port, undefined, undefined, server);
        } else {
            server.listen(port, () => {
                console.log(`RServer запущен на порту ${port}`);
            });
        }
    }

    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.readyState === WebSocket.OPEN) {
            client.send(message);
            return true;
        }
        return false;
    }

    broadcast(message) {
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    // Методы для отправки команд клиенту
    createBot(clientId, config) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'createbot',
            config: config
        }));
    }

    deleteBot(clientId, botId) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'deletebot',
            botId: botId
        }));
    }

    getBotListSize(clientId) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'sizebotlist'
        }));
    }

    sendInputToAllBots(clientId, input) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'sendinputtoallbots',
            input: input
        }));
    }

    disconnectAllBots(clientId) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'disconnectallbots'
        }));
    }

    removeAllBots(clientId) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'removeallbots'
        }));
    }

    sayBot(clientId, botId, text) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'saybot',
            botId: botId,
            text: text
        }));
    }

    changeIdentityBot(clientId, botId, identity) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'changeidentitybot',
            botId: botId,
            identity: identity
        }));
    }

    sendInputToBot(clientId, botId, input) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'sendinputtobot',
            botId: botId,
            input: input
        }));
    }

    connectBot(clientId, botId, addr, port) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'connectbot',
            botId: botId,
            addr: addr,
            port: port
        }));
    }

    disconnectBot(clientId, botId) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'disconnectbot',
            botId: botId
        }));
    }

    // Подписка на события бота
    subscribeToBotEvent(clientId, botId, event) {
        return this.sendToClient(clientId, JSON.stringify({
            type: 'eventbot',
            botId: botId,
            event: event
        }));
    }

    // Универсальный метод для подписки на несколько событий
    subscribeToBotEvents(clientId, botId, events) {
        const results = [];
        for (const event of events) {
            results.push(this.subscribeToBotEvent(clientId, botId, event));
        }
        return results.every(r => r === true);
    }

    // Подписка на все основные события бота
    subscribeToAllBotEvents(clientId, botId) {
        const allEvents = [
            'connect',
            'disconnect',
            'broadcast',
            'capabilities',
            'emote',
            'kill',
            'snapshot',
            'map_change',
            'motd',
            'message',
            'teams',
            'teamkill',
            'spawn',
            'death',
            'hammerhit',
            'sound_world',
            'explosion',
            'common',
            'damage_indicator',
            'sound_global'
        ];
        return this.subscribeToBotEvents(clientId, botId, allEvents);
    }

    get allclients() {
        return [...this.clients.keys()];
    }
}

module.exports = { RServer };