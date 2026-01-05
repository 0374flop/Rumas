const WebSocket = require('ws');
const vm = require('./vm/vm');
const { offvm } = require('./vm/node-vm');
const vmeval = vm.nodevm.evalinsandbox;
const vmoff = vm.nodevm.offvm;

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
        return sendMessage(...args);
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
                const result = await vmeval(message.codetext, 100000, safeSend, onSandbox, message.data4code);
                console.log("Код выполнен:", result?.result || result?.error || 'ошибка или без вывода');
            }
        } catch (e) {
            console.error(e)
            console.log('Получено (не JSON):', data.toString());
        }
    });

    socket.on('error', (error) => {
        console.error('Ошибка:', error.message);
        try {vmoff();} catch {}
    });

    socket.on('close', () => {
        try {vmoff();} catch {}
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
    getMyId,
    offvm
};