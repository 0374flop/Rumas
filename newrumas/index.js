const Server = require('./server');
const Client = require('./client');

const Rumas = {
    Server: Server.RServer,
    Client: Client
}

module.exports = {
    Rumas
}