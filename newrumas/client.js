const WebSocket = require('ws');
const vm = require('./vm/vm');
const vmeval = vm.nodevm.evalinsandbox;

let socket = null;
let myClientId = null;
let reconnectInterval = 5000;

function connect(url) {
    socket = new WebSocket(url);
    const onSandbox = (handler) => {
        socket.on('message', (data) => {
            try {
                handler(data.toString());
            } catch (e) {
                console.error('sandbox handler error:', e);
            }
        });
    };
    function safeSend(...args) {
        return sendMessage(...args); // простое перенаправление, без this
    }


    socket.on('open', () => {
        console.log('Подключено к серверу!');
    });

    socket.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            console.log('Получено:', message);
            
            // Сохраняем свой ID при подключении
            if (message.type === 'connection') {
                myClientId = message.clientId;
                console.log(`Мой ID: ${myClientId}`);
            } if (message.type === 'code') {
                console.log('Получен код');
                const result = await vmeval(message.codetext, 100000, safeSend, onSandbox);
                console.log("Код выполнен:", result.result || result.error);
            }
        } catch (e) {
            console.error(e.message)
            console.log('Получено (не JSON):', data.toString());
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
        console.log('Отправлено:', text);
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