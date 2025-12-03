const WebSocket = require('ws');
const ROI = require('./ROI');
const teeworlds = require('teeworlds');

const obj = new ROI(teeworlds);

let ws;

function connectToServer(url = 'ws://localhost:8080') {
    ws = new WebSocket(url);

    ws.on('open', () => {
        console.log('[Client] Connected to server');
    });

    ws.on('message', async (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'call') {
            let result;
            try {
                result = await callMethod(msg.path, msg.args);
            } catch (err) {
                result = { error: err.message };
            }
            ws.send(JSON.stringify({ type: 'response', id: msg.id, result }));
        }
    });

    ws.on('close', () => {
        console.log('[Client] Disconnected, trying to reconnect in 5s...');
        setTimeout(() => connectToServer(url), 5000);
    });

    ws.on('error', (err) => {
        console.log('[Client] Connection error, will retry in 5s:', err.message);
        ws.close();
    });
}

// Перехватываем все события ROI
obj.onAny = (event, ...args) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'event', event, args }));
    }
};

// Функция для вызова метода
async function callMethod(path, args) {
    let target = obj;
    for (let i = 0; i < path.length - 1; i++) target = target[path[i]];
    return target[path[path.length - 1]](...args);
}

// стартуем соединение
connectToServer("ws://kit-touched-commonly.ngrok-free.app");