const WebSocket = require('ws');
const { evalinsandbox, isValidCode, isJSON } = require('./index');
const { bot } = require('./src/bot');

let timereconnect = 6000;

function connectWebSocket() {
    const ws = new WebSocket('wss://kit-touched-commonly.ngrok-free.app');

    ws.on('open', () => {
        console.log('Подключено.');
    });

    ws.on('message', (message) => {
        const str = message.toString();
        if (!isJSON(str)) return;

        const data = JSON.parse(str);
        if (data.type === 'code') {
            const code = data.code;
            if (code && isValidCode(code)) {
                evalinsandbox(code, ws);
            } else {
                console.log('code is not valid');
            }
        } 
        else if (data.type === 'command') {
            if (data.M_command === 'exit') {
                ws.send('exit.');
                ws.close(1000);
                exit(0);
            } else if (data.M_command === 'disconnect') {
                ws.send('close.');
                ws.close(1000);
            } else if (data.M_command === 'set_timereconnect') {
                if (data.timereconnect !== undefined) timereconnect = data.timereconnect;
            }
        }
    });

    ws.on('close', () => {
        console.log('Соединение закрыто.');
        console.log('Переподключение через ' + timereconnect + 'ms.');
        bot.disconnectAllBots();
        ws.removeAllListeners();
        setTimeout(connectWebSocket, timereconnect);
    });

    ws.on('error', () => {
        ws.close();
    });
}

connectWebSocket();

async function exit(code = 0) {
    await bot.disconnectAllBots();
    process.exit(code);
}
process.on('SIGINT', () => {
    exit()
});