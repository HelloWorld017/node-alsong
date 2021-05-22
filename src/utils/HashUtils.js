const crypto = require('crypto');
const fs = require('fs');
const stream = require('stream');

const { Readable } = require('stream');

const HashUtils = {
	getHash(data) {
		if(typeof data === 'string'){
			return this.getHashFromFile(data);
		}

		if(data instanceof stream){
			return this.getHashFromStream(data);
		}

		if(data instanceof Buffer){
			return this.getHashFromBuffer(data);
		}

		throw new Error("Alsong: Wrong arguments!");
	},
	
	getHashFromFile(filename) {
		return this.getHashFromStream(fs.createReadStream(filename));
	},
	
	getHashFromBuffer(musicBuffer) {
		const musicStream = new Readable({
			read() {
				this.push(musicBuffer);
				this.push(null);
			}
		});
		
		return this.getHashFromStream(musicStream);
	},
	
	getHashFromStream(musicStream) {
		return new Promise((resolve, reject) => {
			let hasID3 = undefined;
			let ID3len = 0;
			let buffer = Buffer.allocUnsafe(0);
			let finished = false;

			musicStream.on('data', chunk => {
				if(finished) return;

				buffer = Buffer.concat([buffer, chunk]);
				if(hasID3 === undefined){
					if(buffer.length >= 10){
						hasID3 = buffer.slice(0, 3).toString() === 'ID3';
						if(hasID3){
							var buf = buffer.slice(6, 10);
							ID3len = buf[0] << 21 | buf[1] << 14 | buf[2] << 7 | buf[3] + 10;
						}
					} else return;
				}

				if(buffer.length > ID3len + 163840){
					finished = true;

					resolve(crypto.createHash('md5').update(buffer.slice(ID3len, 163840 + ID3len)).digest('hex'));
					musicStream.destroy();
					buffer = undefined;
				}
			});

			musicStream.on('end', () => {
				if(finished) return;
				if(hasID3 === undefined){
					reject(new Error("Alsong: Stream stopped!"));
					return;
				}

				resolve(crypto.createHash('md5').update(buffer.slice(ID3len, 163840 + ID3len)).digest('hex'));
				buffer = undefined;
			});

			musicStream.on('error', err => {
				if(finished) return;

				buffer = undefined;
				reject(err);
			});
		});
	}
};

module.exports = HashUtils;