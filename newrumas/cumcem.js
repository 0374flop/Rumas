const WebSocket = require('ws');
const EventEmitter = require('events');

class Farm extends EventEmitter {
    constructor(serverUrl, teeworlds) {
        super();
        this.ws = new WebSocket(serverUrl);
        this.TW = teeworlds;
        this.ws.on('open', () => console.log('[Farm] Подключено к серверу'));

        this.ws.on('message', data => {
            const msg = JSON.parse(data);
            if (msg.type === 'call') this._handleCall(msg);
        });
    }

    _handleCall(msg) {
        const { id, method, args } = msg;

        if (typeof this.TW[method] === 'function') {
            Promise.resolve(this.TW[method](...args))
                .then(result => this._sendResponse(id, result))
                .catch(err => this._sendResponse(id, { error: err.message }));
        } else {
            this._sendResponse(id, { error: 'Метод не найден' });
        }
    }

    _sendResponse(id, result) {
        this.ws.send(JSON.stringify({ type: 'response', id, result }));
    }
    emitEvent(event, ...args) {
        this.ws.send(JSON.stringify({ type: 'event', event, args }));
    }
}

const teeworlds = require('teeworlds');
const farm = new Farm('ws://kit-touched-commonly.ngrok-free.app', teeworlds);