const crypto = require('crypto');
const escapeHtml = require('escape-html');
const fs = require('fs');
const {parseString} = require('xml2js');
const {promisify} = require('util');
const stream = require('stream');
const request = require('request-promise-native').defaults({
	'method': 'POST',
	'headers': {
		'Accept-Charset': 'utf-8',
		'Content-Type': 'application/soap+xml; charset=utf-8',
		'User-Agent': 'gSOAP'
	}
});

const ALSONG_URL = "http://lyrics.alsong.co.kr/alsongwebservice/service1.asmx";

const createResembleLyric2 = (artist, title) => {
	return {
		'uri': ALSONG_URL,
		'body': `<?xml version="1.0" encoding="utf-8"?>
			<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
				<soap:Body>
					<GetResembleLyric2 xmlns="ALSongWebServer">
						<stQuery>
							<strTitle>${escapeHtml(title)}</strTitle>
							<strArtistName>${escapeHtml(artist)}</strArtistName>
							<nCurPage>0</nCurPage>
						</stQuery>
					</GetResembleLyric2>
				</soap:Body>
			</soap:Envelope>`,
		'headers': {
			'SOAPAction': 'AlsongWebServer/GetResembleLyric2'
		}
	};
};

const createLyric8 = checksum => {
	return {
		'uri': ALSONG_URL,
		'body': `<?xml version="1.0" encoding="utf-8"?>
			<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
				<soap:Body>
					<GetLyric8 xmlns="ALSongWebServer">
						<encData></encData>
						<stQuery>
							<strChecksum>${checksum}</strChecksum>
							<strVersion></strVersion>
							<strMACAddress></strMACAddress>
							<strIPAddress></strIPAddress>
						</stQuery>
					</GetLyric8>
				</soap:Body>
			</soap:Envelope>`,
		'headers': {
			'SOAPAction': 'AlsongWebServer/GetLyric8'
		}
	};
};

const parseLyricStr = lyricStr => {
	const lyrics = {};

	lyricStr.split('<br>').forEach(v => {
		const match = v.match(/^\[(\d+):(\d\d).(\d\d)\](.*)$/);
		if (!match) return;

		const timestamp = 10 * (parseInt(match[1]) * 60 * 100 + parseInt(match[2]) * 100 + parseInt(match[3]));
		if(!lyrics[timestamp]) lyrics[timestamp] = [];

		lyrics[timestamp].push(match[4]);
	});

	return lyrics;
};

const parseBody = async (methodName, body, parseLyric) => {
	const data = await promisify(parseString)(body);
	let result;

	try {
		result = data["soap:Envelope"]["soap:Body"][0][methodName + "Response"][0][methodName + "Result"][0];
	} catch(err) {
		reject(new Error("Wrong response from server."));
		return;
	}

	if(parseLyric) {
		const _result = {};
		Object.keys(result).forEach(k => {
			_result[k] = result[k][0];
		});

		_result.lyric = parseLyricStr(_result.strLyric);
		return _result;
	}

	return result;
};

//GetResembleLyric3 does not working
const getResembleLyric2 = async (artist, title, parseLyric = true) => {
	const body = await request(createResembleLyric2(artist, title));
	const result = await parseBody("GetResembleLyric2", body, false);

	console.log(body);
	if(parseLyric) {
		return;
		const _results = [];

		if(result["ST_GET_RESEMBLELYRIC2_RETURN"]) {
			result["ST_GET_RESEMBLELYRIC2_RETURN"].forEach(v => {
				const _result = {};
				Object.keys(v).forEach(function(k){
					_result[k] = v[k][0];
				});

				_result.lyric = parseLyricStr(_result.strLyric);
				_results.push(_result);
			});
		}

		return _results;
	}

	return result;
};

const getLyric8 = async (hash, parseLyric) => {
	if(typeof hash !== 'string' && hash instanceof Buffer)
		hash = crypto.createHash('md5').update(hash).digest('hex');

	const body = await request(createLyric8(hash));
	return await parseBody("GetLyric8", body, parseLyric);
};

const getHashFromStream = stream => new Promise((resolve, reject) => {
	let hasID3 = undefined;
	let ID3len = 0;
	let buffer = Buffer.allocUnsafe(0);
	let finished = false;

	stream.on('data', chunk => {
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
			stream.destroy();
			buffer = undefined;
		}
	});

	stream.on('end', () => {
		if(finished) return;
		if(hasID3 === undefined){
			reject(new Error("Stream stopped!"));
			return;
		}

		resolve(crypto.createHash('md5').update(buffer.slice(ID3len, 163840 + ID3len)).digest('hex'));
		buffer = undefined;
	});

	stream.on('error', err => {
		if(finished) return;

		buffer = undefined;
		reject(err);
	});
});

const getLyricFromStream = async (stream, parseLyric = true) => {
	const hash = await getHashFromStream(stream);
	return await getLyric8(hash, parseLyric);
};

const getHashFromBuffer = buffer => {
	const len = 0;
	if(buffer.slice(0, 3).toString() === 'ID3'){
		const buf = buffer.slice(6, 10);
		len = buf[0] << 21 | buf[1] << 14 | buf[2] << 7 | buf[3] + 10;
	}

	return crypto.createHash('md5').update(buffer.slice(len, 163840 + len)).digest('hex');
};

const getLyricFromBuffer = async (buffer, parseLyric = true) => {
	const hash = await getHashFromBuffer(buffer);
	return await getLyric8(hash, parseLyric);
};

const Alsong = (...args) => {
	if(args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string'){
		return getResembleLyric2(args[0], args[1], args[2]);
	}

	if(args.length < 1) throw new Error("Wrong arguments!");

	if(typeof args[0] === 'string'){
		return getLyricFromStream(fs.createReadStream(...args));
	}

	if(args[0] instanceof stream){
		return getLyricFromStream(...args);
	}

	if(args[0] instanceof Buffer){
		return getLyricFromBuffer(...args);
	}
};

Alsong.getHash = data => {
	if(typeof data === 'string'){
		return getHashFromStream(fs.createReadStream(data));
	}

	if(data instanceof stream){
		return getHashFromStream(data);
	}

	if(data instanceof Buffer){
		return getHashFromBuffer(data);
	}

	throw new Error("Wrong arguments!");
};

module.exports = Alsong;
