const WebSocket = require('ws');
const { evalinsandbox, isValidCode, isJSON } = require('./index');

function connectWebSocket() {
    const ws = new WebSocket('ws://localhost:9374')

    ws.on('open', () => {
        console.log('Подключено.');
    });

    ws.on('message', (message) => {
        if (isValidCode(message)) evalinsandbox(message, ws);
        if (isJSON(message)) {
            const data = JSON.parse(message);
            const main_command = data.M_command;
            if (main_command === 'exit') {
                ws.send('exit code 0.');
                ws.close(1000);
                process.exit(0);
            } else if (main_command === 'disconnect') {
                ws.send('close.');
                ws.close(1000);
            }
        }
    });

    ws.on('close', () => {
        const timereconnect = 60000;
        console.log('Соединение закрыто.');
        console.log('Переподключение через ' + timereconnect + 'ms.');
        setTimeout(connectWebSocket, timereconnect);
    });

    ws.on('error', (error) => {
        ws.close();
    });
}

connectWebSocket();