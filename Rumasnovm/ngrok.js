const ngrokmodule = require('@ngrok/ngrok');
const fs = require('fs');
const path = require('path');

const ngroktokenpath = path.join(__dirname, 'ngrok.token');
const ngrokdata = fs.readFileSync(ngroktokenpath, { encoding: 'utf-8' }).split(' ');

class ngrok {
    constructor(port, authtoken = ngrokdata[0], domain = ngrokdata[1], server) {
        this.urlhttp = '';
        this.urlws = '';
        server.listen(port, async () => {
            console.log(`HTTP сервер запущен на порту ${port}, http://localhost:${port}`);


            const listener = await ngrokmodule.connect({
                addr: port,
                authtoken,
                domain
            });

            this.urlhttp = listener.url();
            this.urlws = this.urlhttp.replace('https://', 'wss://').replace('http://', 'ws://');
            
            console.log(`HTTP доступен на: ${this.urlhttp}`);
            console.log(`WebSocket доступен на: ${this.urlws}`);
        });
    }

    get url() {
        return [this.urlhttp, this.urlws]
    }
}

module.exports = {
    ngrok
}