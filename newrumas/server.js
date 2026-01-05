const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const ngrok = require('@ngrok/ngrok');

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket сервер работает');
});

// Создаем WebSocket сервер поверх HTTP
const ws = new WebSocket.Server({ server });

// Хранилище клиентов
const clients = new Map();

ws.on('connection', (socket) => {
    // Генерируем уникальный ID
    const clientId = uuidv4();
    
    // Сохраняем клиента
    clients.set(clientId, socket);
    
    console.log(`Клиент подключился: ${clientId}`);
    console.log(`Всего клиентов: ${clients.size}`);

    // Отправляем клиенту его ID
    socket.send(JSON.stringify({
        type: 'connection',
        clientId: clientId
    }));

    socket.on('message', (data) => {
        console.log(`Сообщение от ${clientId}:`, data.toString());
    });

    socket.on('close', () => {
        clients.delete(clientId);
        console.log(`Клиент отключился: ${clientId}`);
        console.log(`Осталось клиентов: ${clients.size}`);
    });

    socket.on('error', () => {
        clients.delete(clientId);
    });
});

// Отправка сообщения конкретному клиенту
function sendToClient(clientId, message) {
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(message);
    }
}

// Broadcast всем клиентам
function broadcast(message) {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function getallclients() {
    return [...clients.keys()]
}

const ngroktokenpath = path.join(__dirname, 'ngrok.token');
const ngroktoken = fs.readFileSync(ngroktokenpath, { encoding: 'utf-8' });

// Запуск сервера с ngrok
(async () => {
    const port = 9374;
    server.listen(port, async () => {
        console.log(`HTTP сервер запущен на порту ${port}`);

        const listener = await ngrok.connect({
            addr: port,
            authtoken: ngroktoken,
            domain: 'kit-touched-commonly.ngrok-free.app'
        });

        const url = listener.url();
        const wsUrl = url.replace('https://', 'wss://').replace('http://', 'ws://');
        
        console.log(`HTTP доступен на: ${url}`);
        console.log(`WebSocket доступен на: ${wsUrl}`);
    });
})();

module.exports = {
    broadcast,
    sendToClient,
    getallclients
}