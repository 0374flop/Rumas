const WebSocket = require('ws');
const { evalinsandbox, isValidCode, isJSON } = require('./index');

function connectWebSocket() {
    const ws = new WebSocket('ws://localhost:9374');

    ws.on('open', () => {
        console.log('Подключено.');
    });

    ws.on('message', (message) => {
        const str = message.toString();

        if (!isJSON(str)) return;

        const data = JSON.parse(str);

        // чётко разделяем типы сообщений
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
                ws.send('exit code 0.');
                ws.close(1000);
                process.exit(0);
            } 
            else if (data.M_command === 'disconnect') {
                ws.send('close.');
                ws.close(1000);
            }
        }
    });

    ws.on('close', () => {
        const timereconnect = 6000;
        console.log('Соединение закрыто.');
        console.log('Переподключение через ' + timereconnect + 'ms.');
        setTimeout(connectWebSocket, timereconnect);
    });

    ws.on('error', () => {
        ws.close();
    });
}

connectWebSocket();