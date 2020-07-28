const axios = require('axios');
const crypto = require('crypto');
const escapeHtml = require('escape-html');
const fs = require('fs');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const { Readable } = require('stream');


const Alsong = {
	enc: "8582df6473c019a3186a2974aa1e034ae1b2bbb2e7c99575aadc475fcddd997d74bbc1ce3d50" +
		"b9900282903ee9eb60ae8c5bbf27484441bacb41ecf9128402696641655ff38c2cbbf3c81396" +
		"034a883af2d82e0545ec32170bddc7c141208e7255e367e5b5ebd81750226856f5405ec3ad7b" +
		"6f8600c32c2718c4c525bfe34666",
		
	api: axios.create({
		url: 'http://lyrics.alsong.co.kr/alsongwebservice/service1.asmx',
		method: 'POST',
		headers: {
			'Accept-Charset': 'utf-8',
			'Content-Type': 'application/soap+xml; charset=utf-8',
			'User-Agent': 'gSOAP/2.7'
		},
		responseType: 'text',
		validateStatus() {
			return true;
		}
	}),
	
	async request(method, query) {
		const body = `
			<?xml version="1.0" encoding="utf-8"?>
			<soap:Envelope
				xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
				xmlns:xsd="http://www.w3.org/2001/XMLSchema"
				xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
			>
				<soap:Body>
					<${method} xmlns="ALSongWebServer">
						<encData>${this.enc}</encData>
						<stQuery>
							${query}
						</stQuery>
					</${method}>
				</soap:Body>
			</soap:Envelope>
		`.trim();
		
		try {
			const { data: xmlResponse } = await this.api({
				data: body,
				headers: {
					'SOAPAction': `AlsongWebServer/${method}`
				}
			});
			const response = await promisify(parseString)(xmlResponse);
			return response["soap:Envelope"]["soap:Body"][0][`${method}Response`][0][`${method}Result`][0];
		} catch(err) {
			throw new Error("Alsong: Wrong response from server: " + err.message);
		}
	},
	
	parseLyric(result) {
		const flattened = Object.keys(result).reduce((flattened, key) => {
			flattened[key] = result[key][0];
			return flattened;
		}, {});
		
		const lyrics = {};
		
		flattened.strLyric.split('<br>').forEach(v => {
			const match = v.match(/^\[(\d+):(\d\d).(\d\d)\](.*)$/);
			if (!match) return;

			const timestamp = 10 * (parseInt(match[1]) * 60 * 100 + parseInt(match[2]) * 100 + parseInt(match[3]));
			if(!lyrics[timestamp]) lyrics[timestamp] = [];

			lyrics[timestamp].push(match[4]);
		});
		
		flattened.lyric = lyrics;
		return flattened;
	}
};


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

const getResembleLyric = async (artist, title, option = {}) => {
	const page = option.page || 0;
	
	const response = await Alsong.request('GetResembleLyric2', `
		<strTitle>${escapeHtml(title)}</strTitle>
		<strArtistName>${escapeHtml(artist)}</strArtistName>
		<nCurPage>${page}</nCurPage>
	`);
	
	try {
		const { ST_GET_RESEMBLELYRIC2_RETURN: results } = response;
		
		if(!results)
			return [];
		
		if(!Array.isArray(results))
			throw new Error("Results are not an array");
		
		if(option.skipParse) {
			return results;
		}
		
		return results.map(Alsong.parseLyric);
	} catch(err) {
		throw new Error("Alsong: Wrong response from server: " + err.message);
	}
}

const getLyric = async (file, option = {}) => {
	const checksum = await HashUtils.getHash(file);
	const response = await Alsong.request('GetLyric8', `
		<strChecksum>${checksum}</strChecksum>
		<strVersion></strVersion>
		<strMACAddress></strMACAddress>
		<strIPAddress></strIPAddress>
	`);
	
	try {
		if(option.skipParse)
			return response;
		
		return Alsong.parseLyric(response);
	} catch(err) {
		throw new Error("Alsong: Wrong response from server: " + err.message);
	}
};

module.exports = function(...args) {
	if(args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string'){
		return getResembleLyric(args[0], args[1], args[2]);
	}

	if(args.length < 1) throw new Error("Alsong: Wrong arguments!");
	
	return getLyric(...args);
};

module.exports.getHash = function(music) {
	return HashUtils.getHash(music);
};