function log(message, level = 'info') {
    const logMessage = `[${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
}

function getLogger(moduleName) {
    return {
        log: (msg, level = 'info') => log(`[${moduleName}] ${msg}`, level),
        info: (msg) => log(`[${moduleName}] ${msg}`, 'info'),
        warn: (msg) => log(`[${moduleName}] ${msg}`, 'warn'),
        error: (msg) => log(`[${moduleName}] ${msg}`, 'error'),
    };
}

module.exports = {
    log,
    info: (msg) => log(msg, 'info'),
    warn: (msg) => log(msg, 'warn'),
    error: (msg) => log(msg, 'error'),
    getLogger,
}; 