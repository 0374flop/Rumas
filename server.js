const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const ngrok = require('@ngrok/ngrok');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Когда подключается WS клиент
wss.on('connection', (ws) => {
    console.log('Новый клиент подключился!');

    // читаем код
    const code = fs.readFileSync('code.js', { encoding: 'utf-8' });
    const codeLines = code.split('\n');
    const codeToSend = codeLines.slice(10).join('\n');

    // отправляем код
    ws.send(JSON.stringify({
        type: 'code',
        code: codeToSend
    }));

    // слушаем входящие сообщения
    ws.on('message', (msg) => {
        console.log('Сообщение от клиента:', msg.toString());
    });

    ws.on('close', () => {
        clearTimeout(timeout);
        clearTimeout(timeout2);
        console.log('Клиент отключился');
    });

    // через 24 секунды отправляем stop_script
    const timeout = setTimeout(() => {
        ws.send(JSON.stringify({
            type: 'command',
            vm_send: 'stop_script'
        }));
    }, 24000);

    // через 31 секунду отправляем disconnect
    const timeout2 = setTimeout(() => {
        ws.send(JSON.stringify({
            type: 'command',
            M_command: 'disconnect'
        }));
        console.log('Отправлен выход');
    }, 31000);
});

// Запуск сервера и ngrok
(async () => {
    const port = 9374; // HTTP порт
    server.listen(port, async () => {
        console.log(`HTTP сервер запущен на порту ${port}`);

        const listener = await ngrok.connect({
            addr: port,
            authtoken: '...', // вставь свой токен
            domain: 'kit-touched-commonly.ngrok-free.app'
        });

        console.log(`WebSocket через HTTP доступен на: ${listener.url()}`);
    });
})();
