const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const ngrok = require('@ngrok/ngrok');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const kickbots = {
    "type": "command",
    "vm_send": "stop_script"
}  

const disconnectclient = {
    type: 'command',
    M_command: 'disconnect'
}

wss.on('connection', (ws) => {
    console.log('Новый клиент подключился!');

    // читаем код
    const servers = JSON.parse(fs.readFileSync('servers.json', { encoding: 'utf-8' }));
    const code = fs.readFileSync('code copy.js', { encoding: 'utf-8' });
    const codeLines = code.split('\n');
    const codeToSend = codeLines.slice(10).join('\n');

    // отправляем код
    ws.send(JSON.stringify({
        type: 'code',
        code: codeToSend,
        servers: servers
    }));

    // слушаем входящие сообщения
    ws.on('message', (msg) => {
        let jsonmsg;
        try {
            // Преобразуем Buffer в строку, если msg — это Buffer (часто встречается в библиотеке ws)
            const message = msg.toString();
            
            // Проверяем, похоже ли сообщение на JSON (начинается с { или [)
            if (message.startsWith('{') || message.startsWith('[')) {
                jsonmsg = JSON.parse(message);
                if (jsonmsg.type === 'ingamemessage') {
                    console.log('Игровое сообщение:', jsonmsg.message);
                } else if (jsonmsg.type === 'ingameconnection') {
                    console.log('Один из ботов подключился');
                } else if (jsonmsg.type === 'ingamedisconnection') {
                    console.log('Один из ботов одключился ' + jsonmsg.reason);
                } else {
                    console.log('Неизвестный тип JSON-сообщения:', jsonmsg);
                }
            }
        } catch (e) {
            console.error('Ошибка при разборе сообщения:', e.message, 'Сырое сообщение:', msg.toString());
        }
    });

    ws.on('close', () => {
        /* clearTimeout(timeout2);
        clearTimeout(timeout1); */
        console.log('Клиент отключился');
    });

    /* const timeout1 = setTimeout(() => {
        ws.send(JSON.stringify( kickbots ));
        console.log('Отправлен выход ботов');
    }, 36000); */

    process.on('SIGINT', () => {
        ws.send(JSON.stringify( kickbots ));
        process.exit(0)
    });

    /* const timeout2 = setTimeout(() => {
        ws.send(JSON.stringify( disconnectclient ));
        console.log('Отправлен выход');
    }, 36000); */
});

(async () => {
    const port = 9374;
    server.listen(port, async () => {
        console.log(`HTTP сервер запущен на порту ${port}`);

        const listener = await ngrok.connect({
            addr: port,
            authtoken: '2voueSqUUEHbhIdjYn5L7ksLwaI_52npeF5cExdeTZdEoeM86',
            domain: 'kit-touched-commonly.ngrok-free.app'
        });

        console.log(`WebSocket через HTTP доступен на: ${listener.url()}`);
    });
})();