const EventEmitter = require("events");

class ROI extends EventEmitter {
    constructor(original) {
        super();

        // Если это не объект или null — возвращаем как есть
        if (typeof original !== "object" || original === null) return original;

        // Если это Buffer или Uint8Array — возвращаем как есть
        if (original instanceof Buffer || original instanceof Uint8Array) return original;

        this._original = original;

        // Перехватываем emit, если есть
        if (typeof original.emit === "function") {
            const origEmit = original.emit.bind(original);
            original.emit = (event, ...args) => {
                this.emit(event, ...args); // наружу
                return origEmit(event, ...args); // внутрь
            };
        }

        const cache = new WeakMap();

        const handler = {
            get: (self, prop) => {
                if (prop in self) return self[prop];

                const value = original[prop];

                // Если это бинарные данные — не трогаем
                if (value instanceof Buffer || value instanceof Uint8Array) return value;

                // Конструктор класса? (начинается с заглавной буквы)
                if (typeof value === "function" && prop[0] === prop[0].toUpperCase()) {
                    return new Proxy(value, {
                        construct(target, args) {
                            const instance = new target(...args);
                            return new ROI(instance); // проксируем экземпляр
                        }
                    });
                }

                // Обычная функция
                if (typeof value === "function") {
                    return (...args) => value.apply(original, args);
                }

                // Объект
                if (value && typeof value === "object") {
                    if (cache.has(value)) return cache.get(value);
                    const subProxy = new ROI(value);
                    cache.set(value, subProxy);
                    return subProxy;
                }

                return value;
            },
            set: (self, prop, val) => {
                original[prop] = val;
                return true;
            },
            has: (self, prop) => prop in original,
            ownKeys: (self) => Reflect.ownKeys(original),
            getPrototypeOf: () => Object.getPrototypeOf(original)
        };

        return new Proxy(this, handler);
    }
}

module.exports = ROI;