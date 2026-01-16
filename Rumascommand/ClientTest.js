const RClient = require('./client');

RClient.events.on('connected', (clientId) => {
    console.log('Подключено к серверу! Мой ID:', clientId);
});

RClient.events.on('disconnected', (reconnectInterval) => {
    console.log(`Соединение закрыто. Переподключение через ${reconnectInterval} милисек...`);
});

RClient.events.on('error', (error) => {
    if (error.code === 'ECONNREFUSED') return;
    console.error('Ошибка:', error);
});


RClient.connect('ws://localhost:3000', 10000);