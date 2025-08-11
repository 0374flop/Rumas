const WebSocket = require('ws');
const fs = require('fs');

const wss = new WebSocket.Server({ port: 9374 });

wss.on('connection', (ws) => {
    console.log('Новый клиент подключился!');

    // читаем код
    const code = fs.readFileSync('code.js', { encoding: 'utf-8' });
    const codeLines = code.split('\n');
    const codeToSend = codeLines.slice(10).join('\n');

    // отправляем код как отдельный тип сообщения
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
		clearTimeout(timeout2)
        console.log('Клиент отключился');
    });

    // через 30 секунд отправляем команду на выход
    const timeout = setTimeout(() => {
		ws.send(JSON.stringify({
			type: 'command',
			vm_send: 'stop_script'
		}));
    }, 24000);
	const timeout2 = setTimeout(() => {
		ws.send(JSON.stringify({
			type: 'command',
			M_command: 'disconnect'
		}));
		console.log('Отправлен выход');
	}, 31000);
});

console.log('WebSocket сервер запущен на ws://localhost:9374');
