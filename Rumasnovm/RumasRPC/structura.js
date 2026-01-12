const EventEmitter = require('events');

function getObjectStructure(obj, maxDepth = 5, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
        return '[Max depth reached]';
    }

    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';

    const type = typeof obj;

    // Примитивы
    if (type !== 'object' && type !== 'function') {
        return type;
    }

    // Функции
    if (type === 'function') {
        const isAsync = obj.constructor.name === 'AsyncFunction';
        const params = obj.toString()
            .match(/\(([^)]*)\)/)?.[1]
            .split(',')
            .map(p => p.trim())
            .filter(Boolean) || [];
        
        return {
            type: isAsync ? 'async function' : 'function',
            params: params,
            name: obj.name || 'anonymous'
        };
    }

    // Массивы
    if (Array.isArray(obj)) {
        return {
            type: 'array',
            length: obj.length,
            sample: obj.length > 0 ? getObjectStructure(obj[0], maxDepth, currentDepth + 1) : null
        };
    }

    // Специальные типы
    if (obj instanceof Date) return 'Date';
    if (obj instanceof RegExp) return 'RegExp';
    if (obj instanceof Map) return { type: 'Map', size: obj.size };
    if (obj instanceof Set) return { type: 'Set', size: obj.size };
    if (obj instanceof EventEmitter) {
        return {
            type: 'EventEmitter',
            events: obj.eventNames(),
            properties: getObjectStructure(
                Object.fromEntries(
                    Object.entries(obj).filter(([k]) => !k.startsWith('_'))
                ),
                maxDepth,
                currentDepth + 1
            )
        };
    }

    // Обычные объекты
    const structure = {
        type: obj.constructor?.name || 'Object',
        properties: {}
    };

    for (const key of Object.keys(obj)) {
        try {
            structure.properties[key] = getObjectStructure(
                obj[key],
                maxDepth,
                currentDepth + 1
            );
        } catch (e) {
            structure.properties[key] = `[Error: ${e.message}]`;
        }
    }

    return structure;
}

// Более компактная версия (только типы)
function getObjectSchema(obj, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return '...';
    if (obj === null || obj === undefined) return String(obj);

    const type = typeof obj;
    if (type !== 'object' && type !== 'function') return type;

    if (type === 'function') {
        return obj.constructor.name === 'AsyncFunction' ? 'async fn' : 'function';
    }

    if (Array.isArray(obj)) return 'array';
    if (obj instanceof EventEmitter) return 'EventEmitter';
    if (obj instanceof Date) return 'Date';
    if (obj instanceof Map) return 'Map';
    if (obj instanceof Set) return 'Set';

    const schema = {};
    for (const key of Object.keys(obj)) {
        try {
            schema[key] = getObjectSchema(obj[key], maxDepth, currentDepth + 1);
        } catch (e) {
            schema[key] = 'error';
        }
    }

    return schema;
}

module.exports = { getObjectStructure, getObjectSchema };

const Bot = require('../../../ddbot.js/src/bot/core/core');
const bot = new Bot();

// Полная структура
console.log(JSON.stringify(getObjectStructure(bot), null, 2));