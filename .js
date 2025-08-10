const dgram = require('dgram');

const LISTEN_PORT = 12345; // Порт, где слушаем UDP
const TARGET_IP = 'ТУТ_ВПИСЫВАЙ_IP_ТЕЛЕФОНА'; // IP телефона
const TARGET_PORT = 12345; // Порт телефона, куда отправляем

const server = dgram.createSocket('udp4');

server.on('message', (msg, rinfo) => {
  console.log(`Получено сообщение от ${rinfo.address}:${rinfo.port} - ${msg.toString()}`);

  // Пересылаем полученное сообщение на TARGET_IP:TARGET_PORT,
  // независимо от адреса и порта отправителя
  server.send(msg, TARGET_PORT, TARGET_IP, (err) => {
    if (err) console.error('Ошибка при пересылке:', err);
    else console.log(`Переслано на ${TARGET_IP}:${TARGET_PORT}`);
  });
});

server.bind(LISTEN_PORT, () => {
  console.log(`UDP прокси слушает на порту ${LISTEN_PORT}`);
});