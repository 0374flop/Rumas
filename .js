const dgram = require('dgram');

const PROXY_PORT = 12345; // Порт, на котором прокси слушает (телефон)
const TARGET_IP = '45.141.57.31'; // IP сервера, куда пересылаем пакеты
const TARGET_PORT = 8308; // Порт сервера

const server = dgram.createSocket('udp4');

// Чтобы помнить, куда отправлять ответы сервера — запишем адрес и порт ноутбука
let clientAddress = null;
let clientPort = null;

server.on('message', (msg, rinfo) => {
  const isFromServer = (rinfo.address === TARGET_IP && rinfo.port === TARGET_PORT);
  console.log(`Получено сообщение от ${rinfo.address}:${rinfo.port}, длина: ${msg.length} байт`);

  if (!isFromServer) {
    clientAddress = rinfo.address;
    clientPort = rinfo.port;
    console.log(`От клиента, пересылаем на сервер ${TARGET_IP}:${TARGET_PORT}`);
    server.send(msg, TARGET_PORT, TARGET_IP, (err) => {
      if (err) console.error('Ошибка отправки на сервер:', err);
    });
  } else {
    if (clientAddress && clientPort) {
      console.log(`От сервера, пересылаем клиенту ${clientAddress}:${clientPort}`);
      server.send(msg, clientPort, clientAddress, (err) => {
        if (err) console.error('Ошибка отправки клиенту:', err);
      });
    } else {
      console.log('Неизвестный клиент, ответ от сервера игнорируем.');
    }
  }
});

server.bind(PROXY_PORT, () => {
  console.log(`UDP прокси (двунаправленный) слушает на порту ${PROXY_PORT}`);
});