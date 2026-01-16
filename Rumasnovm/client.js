const WebSocket = require('ws');
const EventEmitter = require('events');

const events = new EventEmitter();

const { ClientRPC } = require('./RumasRPC/RPC');

let socket = null;
let myClientId = null;
let reconnectInterval = 5000;

const obj = require('./obj');

function connect(url, interval) {
    if (interval) reconnectInterval = interval;

    socket = new WebSocket(url);

    client = new ClientRPC(
        (data) => sendMessage(data),
        (callback) => {
            socket.on('message', (rawData) => {
                const dataStr = rawData.toString();
                callback(dataStr);
            });
        }
    );

    client.register('bot', obj?.bot);
    client.register('chat', obj?.chat);
    client.register('reconnect', obj?.reconnect);
    client.register('playerlist', obj?.playerlist);
    client.register('obj', obj);
    client.bind();

    socket.on('open', () => {
        client.comm.onConnect();
    });

    socket.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            // Сохраняем свой ID при подключении
            if (message.type === 'connection') {
                myClientId = message.clientId;
                events.emit('connected', myClientId);
            }
        } catch (e) {}
    });

    socket.on('error', (error) => {
        events.emit('error', error);
    });

    socket.on('close', () => {
        events.emit('disconnected', reconnectInterval);
        myClientId = null; // Сбрасываем ID при отключении
        setTimeout(() => {connect(url)}, reconnectInterval);
    });
}

// Функция для отправки сообщений
function sendMessage(text) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(text);
        return true;
    } else {
        return false;
    }
}

// Функция для отправки JSON
function sendJSON(data) {
    return sendMessage(JSON.stringify(data));
}

// Получить свой ID
function getMyId() {
    return myClientId;
}

// connect();
module.exports = {
    connect,
    sendMessage,
    sendJSON,
    getMyId,
    events,
    obj
};
