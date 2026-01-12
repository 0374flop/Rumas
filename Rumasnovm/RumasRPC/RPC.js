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

    async handleRequest(data) {
        try {
            const req = JSON.parse(data);
            let operation;

            if (req.call) {
                operation = req.call;
            } else if (req.getonly) {
                operation = req.getonly;
            } else if (req.set) {
                operation = req.set;
            } else {
                return { error: "Unknown operation type" };
            }

            const { object, path, args, value } = operation;
            const obj = this.objects.get(object);

            if (!obj) return { error: `Object '${object}' not found` };

            const { owner, value: currentValue } = this.getByPath(obj, path);

            // ─── Операция SET ───────────────────────────────────────
            if (req.set) {
                if (owner === null || owner === undefined) {
                    return { error: `Cannot set property on null/undefined owner` };
                }

                const lastKey = path.split('.').at(-1);
                const oldValue = owner[lastKey];

                owner[lastKey] = value;

                // Опционально: уведомляем о смене свойства (можно потом расширить)
                // this.comm.send(JSON.stringify({ propertyChanged: { path, old: oldValue, new: value } }));

                return { result: { success: true, oldValue, newValue: value } };
            }

            // ─── Операция GET ───────────────────────────────────────
            if (req.getonly) {
                if (currentValue !== undefined) return { result: currentValue };
                return { error: `Property '${path}' not found` };
            }

            // ─── Операция CALL ──────────────────────────────────────
            if (typeof currentValue === 'function') {
                const result = await currentValue.apply(owner, args || []);
                return { result };
            }

            return { error: `Property or method '${path}' not found or not callable` };
        } catch (e) {
            return { error: e.message };
        }
    }

    bind() {
        this.comm.on('request', async (data, { callback }) => {
            const result = await this.handleRequest(data);
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
        const parsed = JSON.parse(res);
        if (parsed.error) throw new Error(parsed.error);
        return parsed.result;
    }

    async get(object, path) {
        const req = { getonly: { object, path } };
        const [res] = await this.comm.request(JSON.stringify(req));
        const parsed = JSON.parse(res);
        if (parsed.error) throw new Error(parsed.error);
        return parsed.result;
    }

    async set(object, path, value) {
        const req = { set: { object, path, value } };
        const [res] = await this.comm.request(JSON.stringify(req));
        const parsed = JSON.parse(res);
        if (parsed.error) throw new Error(parsed.error);
        return parsed.result;
    }
}

function createRPCProxy(rpc, serviceName = 'bot') {
    return new Proxy({}, {
        get(target, prop, receiver) {
            // Пропускаем всякие внутренние штуки Proxy
            if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver);

            // Специальные случаи
            if (prop === 'toString') return () => `[RPC Proxy: ${serviceName}]`;
            if (prop === 'then') return undefined; // чтобы не ломать await

            // Всё остальное — это вызов метода
            return async function (...args) {
                try {
                    const response = await rpc.call(serviceName, prop, args);
                    return response;
                } catch (err) {
                    console.error(`RPC error ${serviceName}.${prop}():`, err.message);
                    throw err;
                }
            };
        }
    });
}

module.exports = { ClientRPC, ServerRPC, createRPCProxy };