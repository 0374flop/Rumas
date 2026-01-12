const Comm = require('./Comm');
const EventEmitter = require('events');

class ClientRPC {
    constructor(sendDataraw, onDataraw) {
        this.comm = new Comm(sendDataraw, onDataraw);
        this.objects = new Map();

        this.comm.onConnect();
    }

    register(name, object) {
        this.objects.set(name, object);

        for (const key of Object.keys(object)) {
            const val = object[key];
            if (val instanceof EventEmitter) {
                const basePath = `${name}.${key}`;

                const originalEmit = val.emit;
                val.emit = (event, ...args) => {
                    originalEmit.call(val, event, ...args);
                    this.comm.send(JSON.stringify({
                        event: {
                            path: basePath,
                            name: event,
                            data: args.length === 1 ? args[0] : args
                        }
                    }));
                };
            }
        }
    }

    getByPath(obj, path) {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            if (current == null) return { owner: null, value: undefined };
            current = current[parts[i]];
        }

        return {
            owner: current,
            value: current?.[parts.at(-1)]
        };
    }

    async handleRequest(data, getonly = false) {
        try {
            const req = JSON.parse(data);
            const { object, path, args } = req.call || req.getonly;

            const obj = this.objects.get(object);
            if (!obj) return { error: `Object '${object}' not found` };

            const { owner, value } = this.getByPath(obj, path);

            if (typeof value === 'function' && !getonly) {
                const result = await value.apply(owner, args || []);
                return { result };
            }

            if (value !== undefined) return { result: value };

            return { error: `Property or method '${path}' not found` };
        } catch (e) {
            return { error: e.message };
        }
    }

    bind() {
        this.comm.on('request', async (data, { callback }) => {
            const parsed = JSON.parse(data);
            const result = parsed.call
                ? await this.handleRequest(data)
                : await this.handleRequest(data, true);

            callback(JSON.stringify(result));
        });
    }
}


class ServerRPC {
    constructor(sendDataraw, onDataraw) {
        this.comm = new Comm(sendDataraw, onDataraw);
        this.comm.connect();

        this._events = new EventEmitter();

        this.comm.on('data', (data) => {
            try {
                const parsed = JSON.parse(data);
                if (!parsed.event) return;

                const { path, name, data: payload } = parsed.event;
                this._events.emit(`${path}:${name}`, payload);
            } catch {}
        });
    }


    on(path, event, fn) {
        this._events.on(`${path}:${event}`, fn);
    }

    once(path, event, fn) {
        this._events.once(`${path}:${event}`, fn);
    }

    off(path, event, fn) {
        this._events.off(`${path}:${event}`, fn);
    }

    emit(path, event, data) {
        this.comm.send(JSON.stringify({
            event: { path, name: event, data }
        }));
    }

    async call(object, path, args = []) {
        const req = { call: { object, path, args } };
        const [res] = await this.comm.request(JSON.stringify(req));
        return JSON.parse(res);
    }

    async get(object, path) {
        const req = { getonly: { object, path } };
        const [res] = await this.comm.request(JSON.stringify(req));
        return JSON.parse(res);
    }
}

module.exports = { ClientRPC, ServerRPC };
