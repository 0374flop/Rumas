const WebSocket = require('ws');
const EventEmitter = require('events');

const BotManager = require('../bot/manager');

const botManager = new BotManager();

const events = new EventEmitter();

let socket = null;
let myClientId = null;
let reconnectInterval = 5000;

function connect(url, interval) {
    if (interval) reconnectInterval = interval;

    socket = new WebSocket(url);

    socket.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === 'connection') {
                myClientId = message.clientId;
                events.emit('connected', myClientId);
            } else {
                events.emit('message', message);
            }
        } catch (e) {
            events.emit('error', e);
        }
    });

    socket.on('error', (error) => {
        events.emit('error', error);
    });

    socket.on('close', () => {
        events.emit('disconnected', reconnectInterval);
        myClientId = null; // Сбрасываем ID при отключении
        setTimeout(() => {connect(url)}, reconnectInterval);
    });

    events.on('message', (message) => {
        switch (message.type) {
            case 'createbot':
                const id = botManager.createBot(message.config);
                send(JSON.stringify({
                    type: 'createbot',
                    botId: id
                }));
                break;
            case 'deletebot':
                botManager.removeBotById(message.botId);
                break;
            case 'sizebotlist':
                const bots = botManager.bots.size;
                send(JSON.stringify({
                    type: 'sizebotlist',
                    bots: bots
                }));
                break;
            case 'sendinputtoallbots':
                botManager.sendinputToAllBots(message.input);
                break;
            case 'disconnectallbots':
                botManager.disconnectAllBots();
                break;
            case 'removeallbots':
                botManager.removeAllBots();
                break;
            case 'saybot':
                const bot = botManager.getBotById(message.botId);
                if (bot) {
                    bot.bot_client.game.Say(message.text);
                }
                break;
            case 'changeidentitybot':
                const botToChange = botManager.getBotById(message.botId);
                if (botToChange) {
                    botToChange.change_identity(message.identity);
                }
                break;
            case 'sendinputtobot':
                const botToInput = botManager.getBotById(message.botId);
                if (botToInput) {
                    botToInput.send_input(message.input);
                }
                break;
            case 'connectbot':
                const botToConnect = botManager.getBotById(message.botId);
                if (botToConnect) {
                    botToConnect.connect(message.addr, message.port);
                }
                break;
            case 'disconnectbot':
                const botToDisconnect = botManager.getBotById(message.botId);
                if (botToDisconnect) {
                    botToDisconnect.disconnect();
                }
                break;
            case 'eventbot':
                botManager.on(message.botId + ':' + message.event, (...data) => {
                    send(JSON.stringify({
                        type: 'eventbot',
                        botId: message.botId,
                        event: message.event,
                        data: [...data]
                    }));
                });
                break;
            default:
                break;
        }
    });
}

function send(text) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(text);
        return true;
    } else {
        return false;
    }
}

function getMyId() {
    return myClientId;
}

module.exports = {
    connect,
    getMyId,
    events,
    send
};
