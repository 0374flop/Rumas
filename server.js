const WebSocket = require('ws');
const fs = require('fs')

const wss = new WebSocket.Server({ port: 9374 });

const codeToSend = fs.readFileSync('code.js', { encoding: 'utf-8'});
console.log(codeToSend)

wss.on('connection', (ws) => {
  console.log('Новый клиент подключился!');

  ws.send(codeToSend);

  ws.on('message', (msg) => {
    const message = msg.toString()
    console.log('Сообщение от клиента:', message);
  });

  ws.on('close', () => {
    console.log('Клиент отключился');
  });

  setTimeout(() => {
    ws.send('{ "vm_send": "exit" }')
    console.log('отправлен выход')
    ws.send('{ "M_command": "exit"}')
  }, 30000)
});

console.log('WebSocket сервер запущен на ws://localhost:8080');