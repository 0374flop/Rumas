const WebSocket = require('ws');
const http = require('http');
const ngrok = require('@ngrok/ngrok');
const EventEmitter = require('events');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const farms = new Set();
const pendingResponses = new Map();

const botAPI = new EventEmitter();

const proxy = new Proxy(botAPI, {
    get(target, prop) {
        if (prop === 'on' || prop === 'once' || prop === 'off') return target[prop].bind(target);

        return async (...args) => {
            if (farms.size === 0) throw new Error('Нет подключённых фермеров');

            const callId = Date.now() + Math.random();
            const msg = { type: 'call', id: callId, method: prop, args };

            const promises = [];
            for (const ws of farms) {
                ws.send(JSON.stringify(msg));
                promises.push(new Promise((resolve, reject) => {
                    pendingResponses.set(callId + ws.id, { resolve, reject });
                }));
            }

            return Promise.all(promises);
        };
    }
});

wss.on('connection', ws => {
    ws.id = Date.now();
    farms.add(ws);
    console.log(`[Control] Ферма подключилась. Всего: ${farms.size}`);

    ws.on('message', data => {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'response') {
                const resolver = pendingResponses.get(msg.id + ws.id);
                if (resolver) {
                    resolver.resolve(msg.result);
                    pendingResponses.delete(msg.id + ws.id);
                }
            }

            if (msg.type === 'event') {
                botAPI.emit(msg.event, ...msg.args);
            }
        } catch {}
    });

    ws.on('close', () => {
        farms.delete(ws);
        console.log(`[Control] Ферма отключилась. Осталось: ${farms.size}`);
    });
});

(async () => {
    const url = await ngrok.connect({
        addr: 8080,
        authtoken: '2voueSqUUEHbhIdjYn5L7ksLwaI_52npeF5cExdeTZdEoeM86',
        domain: 'kit-touched-commonly.ngrok-free.app'
    });

    server.listen(8080, () => console.log(`Пульт готов → ${url}`));
})();

module.exports = proxy;