const WebSocket = require('ws');
const EventEmitter = require('events');

const { ClientRPC } = require('./RumasRPC/RPC');

let socket = null;
let myClientId = null;
let reconnectInterval = 5000;

class MyObject extends EventEmitter {
    constructor() {
        super();
        this.data = {};
    }
    
    setData(key, value) {
        this.data[key] = value;
        this.emit('dataChanged', { key, value });
        return { success: true };
    }
    
    getData(key) {
        return this.data[key];
    }
}

const testBot = {
    name: 'TestBot',
    connect: async (host, port) => {
        console.log(`[BOT] Connecting to ${host}:${port}`);
        return true;
    },
    say: async (text) => {
        console.log(`[BOT] Saying: ${text}`);
        return 'Message sent!';
    },

    class: new MyObject()
};

function connect(url) {
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

    client.register('bot', testBot);
    client.bind();

    socket.on('open', () => {
        console.log('Подключено к серверу!');
        client.comm.onConnect();
    });

    socket.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            // Сохраняем свой ID при подключении
            if (message.type === 'connection') {
                myClientId = message.clientId;
                console.log(`Мой ID: ${myClientId}`);
            }
        } catch (e) {
        }
    });

    socket.on('error', (error) => {
        console.error('Ошибка:', error.message);
    });

    socket.on('close', () => {
        console.log(`Соединение закрыто. Переподключение через ${reconnectInterval} милисек...`);
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
        console.log('Соединение не открыто');
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
    getMyId
};