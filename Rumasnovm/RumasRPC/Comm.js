const EventEmitter = require('events');

class Comm extends EventEmitter {
    constructor(sendraw, onDataraw, onTransportErr, onTransportDisconnect, maxtimePING = 5000, startPing = false, maxchars = 1000) {
        super();

		// опции, неизменные
        this.options = {
            sendraw: typeof sendraw === 'function' ? sendraw : console.log,
            onDataraw: typeof onDataraw === 'function' ? onDataraw : console.log,
			onTransportErr: typeof onTransportErr === 'function' ? onTransportErr : console.log,
			onTransportDisconnect: typeof onTransportDisconnect === 'function' ? onTransportDisconnect : console.log,
			maxtimePING: typeof maxtimePING === 'number' ? maxtimePING : 5000,
			startPing: typeof startPing === 'number' ? startPing : false
        };

		// протокол, то чем обнениваються клиенты
		this.protocol = {
			'1S': 'Comm connect',
			'1O': 'Comm connect on',
			'SEND': ['SEND_DATA:', 'sendreceived'],
			'PING': ['PING&*rand*&:', 'PONG&*rand*&:'],
			'REQUEST-RESPONSE':['@REQUEST&*rand*&:', '@RESPONSE&*rand*&:', '@CONFIRMATION&*rand*&'],
			'justsend': 'J_S:',
			'rand': ['give me a rand', 'rand:'],
			'stream': ['startchank&*rand*&|^0^:', 'chank&*rand*&|^*numchank*^:', 'endchank&*rand*&|^*numchank*^:']
		}

		// причины ошибок
		this.reason = {
			timeout: 'Time out.',
			hasstream: 'The streams has: id',
			nohasstream: 'The stream does not exist: id'
		}

		// Тут то что меняеться
		this.status = 0;
		this.isAlive = true;
		this.list = 0;
		this.defaultTimeout = this.options.maxtimePING;

		// превращаем ондатурав в событие
		if (typeof onDataraw === 'function') {
			onDataraw((data) => {
				this.emit('dataraw', data.toString());
			});
		}

		this.on('dataraw', (dt) => {
			if (this.getStatus() === 'connected') {
				if (dt.startsWith(this.protocol.SEND[0])) {
					this.emit('data', dt.slice(this.protocol.SEND[0].length));	
					return;
				} else {
					if (dt.startsWith(this.protocol.justsend)) {
						let data = dt.slice(this.protocol.justsend.length);
						this.emit('justsend', data);
						return;
					}
					return;
				}
			} else {
				if (dt.startsWith(this.protocol.rand[0])) this.sendraw(this.protocol.rand[1]+this.generatenum())
				return;
			}
		});

		this.on('data', (dt) => {
			const reqPrefix = this.protocol['REQUEST-RESPONSE'][0].split("&")[0];
			// const resPrefix = this.protocol['REQUEST-RESPONSE'][1].split("&")[0];
			
			if (dt.startsWith(reqPrefix)) {
				const rand = this.getdata(dt, '&');
				const payload = dt.split(':').slice(1).join(':');
				this.emit('request', payload, { rand,
					callback: (data, timeout = this.defaultTimeout) => {
						return new Promise((resolve, reject) => {
							this.send(this.protocol['REQUEST-RESPONSE'][1].replace('*rand*', rand)+data);
							const handler = (data) => {
								if (data.startsWith(this.protocol['REQUEST-RESPONSE'][2].split('&')[0])) {
									this.off('data', handler);
									clearTimeout(timer);
									resolve(rand);
								}
							}
							this.on('data', handler)
							const timer = setTimeout(() => {
								this.off('data', handler);
								reject(this.reason.timeout);
							}, timeout)
						})
					}
				});
			}
		});


		this.streams = new Map();
		this.on('data', (data) => {
			const dt = data
			if (dt.split("&")[0].includes('chank')) {
				if (dt.startsWith(this.protocol.stream[0].split("&")[0])) {
					const streamid = this.getdata(dt.split(':')[0], '&');
					const chunkid = 0 // this.getdata(dt.split(':')[0], '^');
					const chank = dt.split(':');
					chank.shift();
					const payload = chank.join(':')
					if (this.streams.has(streamid)) {
						this.emit('stream-error', this.reason.nohasstream+streamid);
					} else {
						this.streams.set(streamid, {
							chunkid: chunkid,
							chanks: [payload]
						});
					}
				} else if (dt.startsWith(this.protocol.stream[1].split("&")[0])) {
					const streamid = this.getdata(dt.split(':')[0], '&');
					const chunkid = this.getdata(dt.split(':')[0], '^');
					const chank = dt.split(':');
					chank.shift();
					const payload = chank.join(':')
					if (!this.streams.has(streamid)) {
						this.emit('stream-error', this.reason.nohasstream+streamid);
					} else {
						const stream = this.streams.get(streamid);
						stream.chanks.push(payload);
						stream.chunkid = chunkid;
					}
				} else if (dt.startsWith(this.protocol.stream[2].split("&")[0])) {
					const streamid = this.getdata(dt.split(':')[0], '&');
					const chunkid = this.getdata(dt.split(':')[0], '^');
					const chank = dt.split(':');
					chank.shift();
					const payload = chank.join(':')
					if (!this.streams.has(streamid)) {
						this.emit('stream-error', this.reason.nohasstream+streamid);
					} else {
						const stream = this.streams.get(streamid);
						stream.chanks.push(payload);
						stream.chunkid = chunkid;
						this.emit('stream-end', stream.chanks.join(''));
						this.streams.delete(streamid);
					}
				}
			}
			return;
		});

		this.intervalPING = null

		if (this.options.startPing) this.startPing(this.options.startPing);

		if (typeof this.options.onTransportDisconnect === 'function') this.options.onTransportDisconnect(async () => {
			if (!await this.ping()) this.status = 0
		});

		if (typeof this.options.onTransportErr === 'function') this.options.onTransportErr(async () => {
			if (!await this.ping()) this.status = 0
		});
		
		this.on('dataraw', (data) => {
			if (data.startsWith(this.protocol.PING[0].split('&')[0])) {
				const rand = this.getdata(data, '&');
				this.sendraw(this.protocol.PING[1].replace("*rand*", rand));
			}
		})
    }

	splitByLength(str, chunkSize) {
		const chunks = [];
		for (let i = 0; i < str.length; i += chunkSize) {
			chunks.push(str.slice(i, i + chunkSize));
		}
		return chunks;
	}

	stream(data, chanksize = 1000) {
		if (!this.connected) return;
		const streamid = this.generatenum();
		const chunks = this.splitByLength(data, chanksize);
		this.sendStreamSCD(chunks[0], streamid);
		chunks.forEach((chank, index) => {
			if (index === 0 || index === chunks.length - 1) return;
			this.sendStreamCD(chank, streamid, index);
		});
		this.sendStreamECD(chunks[chunks.length - 1], streamid, chunks.length);
	}

	sendStreamSCD(data, id) {
		this.send(this.protocol.stream[0].replace('*rand*', id) + data);
	}
	sendStreamCD(data, id, idchank) {
		this.send(
			this.protocol.stream[1]
				.replace('*rand*', id)
				.replace('*numchank*', idchank) + data
		);
	}
	sendStreamECD(data, id, idchank) {
		this.send(
			this.protocol.stream[2]
				.replace('*rand*', id)
				.replace('*numchank*', idchank) + data
		);
	}

	getdata(text = 'string', string) {
		if (typeof string !== 'string' || typeof text !== 'string') return undefined;
		const parts = text.split(string);
		return parts.length === 3 ? parts[1] : undefined;
	}

	setDefaultTimeout(timeout) {
		this.defaultTimeout = timeout;
	}

	startPing(interval = this.defaultTimeout) {
		this.ping().then((status) => {
			this.isAlive = status;
			if (!this.isAlive) this.emit('dead-transport');
		})
		clearInterval(this.intervalPING);
		this.intervalPING = setInterval(async () => {
			this.isAlive = await this.ping();
			if (!this.isAlive) this.emit('dead-transport');
		}, interval);
	}

	rawPing(Time) {
		let timeout = Time || this.options.maxtimePING;
		const start = Date.now();
		const rand = Math.floor(Math.random() * 1000) + 1;
		const sendPING = this.protocol.PING[0].replace('*rand*', rand);
		const getPING = this.protocol.PING[1].replace('*rand*', rand);
		if (typeof timeout !== 'number') timeout = this.options.maxtimePING;
		return new Promise((resolve, reject) => {
			const handler = (data) => {
				if (data !== getPING) return;
				clearTimeout(timer);
				this.off('dataraw', handler);
				resolve(Date.now() - start);
			};
			this.on('dataraw', handler);
			const timer = setTimeout(() => {
				this.off('dataraw', handler);
				reject(this.reason.timeout);
			}, timeout);
			this.sendraw(sendPING);
		})
	}

	sendforand(timeout = this.defaultTimeout) {
		return new Promise((resolve, reject) => {
			const handler = (data) => {
				if (data.startsWith(this.protocol.rand[1])) {
					clearTimeout(timer);
					this.off('dataraw', handler);
					resolve(data.slice(this.protocol.rand[1].length));
				}
			};
			this.on('dataraw', handler);
			const timer = setTimeout(() => {
				this.off('dataraw', handler);
				reject(this.reason.timeout);
			}, timeout);
			this.sendraw(this.protocol.rand[0]);
		})
	}

	async ping() {
		try	{
			await this.rawPing();
			return true;
		} catch {
			return false;
		}
	}

	getStatus(stat) {
		const status = stat !== undefined ? stat : this.status;
		const statuses = {
			0: 'disconnected',
			1: 'connecting',
			2: 'connected'
		};
		return statuses[status] || 'unknown';
	}
    
    sendraw(data) {
        this.options.sendraw(data);
		this.emit('sendraw', data)
    }

	connect(timeout = this.defaultTimeout) {
		if (!this.isAlive) return;
		if (this.status === 1) return;
		this.status = 1
		const protocol = this.protocol;
		
		this.sendraw(protocol['1S']);
		const handler = (data) => {
			if (data === protocol['1O']) {
				this.status = 2
			}
			if (this.status === 2) {
				this.emit('connected', this.status)
				this.off('dataraw', handler);
			}
		}
		this.on('dataraw', handler);
		setTimeout(() => {
			if (this.status === 1) {
				this.status = 0;
				this.off('dataraw', handler);
				this.emit('connect-fail', this.reason.timeout, this.status);
			}
		}, timeout);
	}

	send(data, timeout = this.defaultTimeout) {
		if (!this.isAlive) return;
		if (this.getStatus() === 'connected') {
			this.sendraw(this.protocol.SEND[0]+data);
			this.emit('send', data);
		}
	}

	justsend(data) {
		if (!this.isAlive) return;
		if (this.getStatus() === 'connected') {
			this.sendraw(this.protocol.justsend+data);
			this.emit('justsend', data);
		}
	}

	get connected() {
		return this.isAlive && this.getStatus() === 'connected';
	}

	onConnect() {
		if (!this.isAlive) return;
		if (this.status === 1) return;
		this.status = 1
		const protocol = this.protocol;
		const handler = (data) => {
			if (data === this.protocol['1S']) {
				this.sendraw(protocol['1O']);
				this.status = 2
			}
			if (this.status === 2) {
				this.emit('connected', this.status)
				this.off('dataraw', handler);
			}
		}
		this.on('dataraw', handler)
	}

	generatenum() {
		return `${++this.list}`;
	}

	request(data, timeout = this.defaultTimeout) {
		if (!this.isAlive) return;
		if (this.getStatus() === 'connected') {
			return new Promise((resolve, reject) => {
				const protocol = this.protocol;
				const rand = this.generatenum();
				const sendREQUEST = protocol['REQUEST-RESPONSE'][0].replace('*rand*', rand) + data;
				const getRESPONSE = protocol['REQUEST-RESPONSE'][1].replace('*rand*', rand);
				
				this.send(sendREQUEST);
				
				const out = setTimeout(() => {
					this.off('data', handler);
					reject(this.reason.timeout)
				}, timeout)
				const handler = (receivedData) => {
					if (receivedData.startsWith(getRESPONSE)) {
						const payload = receivedData.slice(getRESPONSE.length);
						const randFromResponse = this.getdata(getRESPONSE, '&');
						this.send(this.protocol['REQUEST-RESPONSE'][2].replace('*rand*', rand))
						resolve([payload, randFromResponse]);
						clearTimeout(out)
						this.off('data', handler);
					}
				};
				this.on('data', handler);
			});
		}
	}
}

module.exports = Comm