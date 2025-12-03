// botServer.js
const WebSocket = require('ws');
const EventEmitter = require('events');
const http = require('http');
const ngrok = require('@ngrok/ngrok');

class RemoteObject extends EventEmitter {
    constructor(port = 8080) {
        super();

        const server = http.createServer();
        this._wss = new WebSocket.Server({ server });
        this._clients = new Set();
        this._pendingCalls = new Map();
        this._nextCallId = 1;

        this._wss.on('connection', ws => {
            this._clients.add(ws);

            ws.on('message', data => {
                let msg;
                try { msg = JSON.parse(data); } catch { return; }

                if (msg.type === 'event') {
                    this.emit(msg.event, ...msg.args);
                }

                if (msg.type === 'response') {
                    const resolver = this._pendingCalls.get(msg.id);
                    if (resolver) {
                        resolver(msg.result);
                        this._pendingCalls.delete(msg.id);
                    }
                }
            });

            ws.on('close', () => this._clients.delete(ws));
        });

        server.listen(port, async () => {
            console.log(`[Server] WS ROI listening on port ${port}`);

            // подключаем ngrok
            try {
                const url = await ngrok.connect({
                    addr: port,
                    authtoken: '2voueSqUUEHbhIdjYn5L7ksLwaI_52npeF5cExdeTZdEoeM86',
                    domain: 'kit-touched-commonly.ngrok-free.app'
                });
                console.log(`[Server] ngrok доступен на: ${url}`);
            } catch (err) {
                console.error('[Server] ngrok не удалось запустить:', err.message);
            }
        });

        return new Proxy(this, {
            get: (self, prop) => {
                if (prop in self) return self[prop];

                if (prop === 'on' || prop === 'once' || prop === 'off') {
                    return self[prop].bind(self);
                }

                return (...args) => {
                    const id = this._nextCallId++;
                    const msg = { type: 'call', id, path: [prop], args };
                    const promises = [];

                    for (const ws of this._clients) {
                        ws.send(JSON.stringify(msg));
                        promises.push(new Promise(resolve => this._pendingCalls.set(id, resolve)));
                    }

                    return Promise.race(promises);
                };
            }
        });
    }
}

module.exports = new RemoteObject(8080);
