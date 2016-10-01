var crypto = require('crypto');
var fs = require('fs');
var parseString = require('xml2js').parseString;
var stream = require('stream');
var request = require('request-promise').defaults({
	'method': 'POST',
	'headers': {
		'Accept-Charset': 'utf-8',
		'Content-Type': 'application/soap+xml; charset=utf-8',
		'User-Agent': 'gSOAP'
	}
});

var ALSONG_URL = "http://lyrics.alsong.co.kr/alsongwebservice/service1.asmx";

var createResembleLyric2 = function(artist, title){
	return {
		'uri': ALSONG_URL,
		'body': '<?xml version="1.0" encoding="utf-8"?>' +
			'<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
				'<soap12:Body>' +
					'<GetResembleLyric2 xmlns="ALSongWebServer">' +
						//'<encData></encData>' +
						'<stQuery>' +
							'<strTitle>' + title + '</strTitle>' +
							'<strArtistName>' + artist + '</strArtistName>' +
							'<nCurPage>0</nCurPage>' +
						'</stQuery>' +
					'</GetResembleLyric2>' +
				'</soap12:Body>' +
			'</soap12:Envelope>',
		'headers': {
			'SOAPAction': 'AlsongWebServer/GetResembleLyric2'
		}
	};
};

var createLyric8 = function(checksum){
	return {
		'uri': ALSONG_URL,
		'body': '<?xml version="1.0" encoding="utf-8"?>' +
			'<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
				'<soap12:Body>' +
					'<GetLyric8 xmlns="ALSongWebServer">' +
						'<encData></encData>' +
						'<stQuery>' +
							'<strChecksum>' + checksum + '</strChecksum>' +
							'<strVersion></strVersion>' +
							'<strMACAddress></strMACAddress>' +
							'<strIPAddress></strIPAddress>' +
						'</stQuery>' +
					'</GetLyric8>' +
				'</soap12:Body>' +
			'</soap12:Envelope>',
		'headers': {
			'SOAPAction': 'AlsongWebServer/GetLyric8'
		}
	};
};

var parseLyricStr = function(lyricStr){
	var lyrics = {};
	lyricStr.split('<br>').forEach(function(v){
		var match = v.match(/^\[(\d+):(\d\d).(\d\d)\](.*)$/);
		if(!match) return;
		var timestamp = 10 * (parseInt(match[1]) * 60 * 100 + parseInt(match[2]) * 100 + parseInt(match[3]));
		if(!lyrics[timestamp]) lyrics[timestamp] = [];
		lyrics[timestamp].push(match[4]);
	});

	return lyrics;
};

var parseBody = function(methodName, body, parseLyric){
	return new Promise(function(resolve, reject){
		parseString(body, function(err, data){
			if(err){
				reject(err);
				return;
			}

			try{
				var result = data["soap:Envelope"]["soap:Body"][0][methodName + "Response"][0][methodName + "Result"][0];
			}catch(err){
				reject(new Error("Wrong response from server."));
				return;
			}

			if(parseLyric || parseLyric === undefined){
				var _result = {};
				Object.keys(result).forEach(function(k){
					_result[k] = result[k][0];
				});

				_result.lyric = parseLyricStr(_result.strLyric);
				resolve(_result);
				return;
			}
			resolve(result);
		});
	});
};

//GetResembleLyric3 does not working
var getResembleLyric2 = function(artist, title, parseLyric){
	return new Promise(function(resolve, reject){
		request(createResembleLyric2(artist, title)).then(function(body){
			return parseBody("GetResembleLyric2", body, false);
		}).then(function(result){
			if(parseLyric || parseLyric === undefined){
				var _results = [];
				if(result["ST_GET_RESEMBLELYRIC2_RETURN"]){
					result["ST_GET_RESEMBLELYRIC2_RETURN"].forEach(function(v){
						var _result = {};
						Object.keys(v).forEach(function(k){
							_result[k] = v[k][0];
						});

						_result.lyric = parseLyricStr(_result.strLyric);
						_results.push(_result);
					});
				}
				resolve(_results);
				return;
			}
			resolve(result);
		}).catch(function(err){
			reject(err);
		});
	});
};

var getLyric8 = function(buffer, parseLyric){
	return new Promise(function(resolve, reject){
		request(createLyric8(crypto.createHash('md5').update(buffer).digest('hex'))).then(function(body){
			return parseBody("GetLyric8", body, parseLyric);
		}).then(function(result){
			resolve(result);
		}).catch(function(err){
			reject(err);
		});
	});
};

var getLyricFromStream = function(stream, parseLyric){
	return new Promise(function(resolve, reject){
		var hasID3 = undefined;
		var ID3len = 0;
		var buffer = Buffer.allocUnsafe(0);
		var finished = false;

		stream.on('data', function(chunk){
			if(finished) return;
			buffer = Buffer.concat([buffer, chunk]);
			if(hasID3 === undefined){
				if(buffer.length >= 10){
					hasID3 = buffer.slice(0, 3).toString() === 'ID3';
					if(hasID3){
						var buf = buffer.slice(6, 10);
						ID3len = buf[0] << 21 | buf[1] << 14 | buf[2] << 7 | buf[3] + 10;
					}
				}else return;
			}

			if(buffer.length > ID3len + 163840){
				finished = true;
				getLyric8(buffer.slice(ID3len, 163840 + ID3len), parseLyric).then(function(v){
					buffer = undefined;
					resolve(v);
				});
			}
		});

		stream.on('end', function(){
			if(finished) return;
			if(hasID3 === undefined){
				reject(new Error("Stream stopped!"));
				return;
			}

			getLyric8(buffer.slice(ID3len, Math.min(163840 + ID3len, buffer.length)), parseLyric).then(function(v){
				buffer = undefined;
				resolve(v);
			});
		});

		stream.on('error', function(err){
			buffer = undefined;
			reject(err);
		});
	});
};

var getLyricFromBuffer = function(buffer, parseLyric){
	var len = 0;
	if(buffer.slice(0, 3).toString() === 'ID3'){
		var buf = buffer.slice(6, 10);
		len = buf[0] << 21 | buf[1] << 14 | buf[2] << 7 | buf[3] + 10;
	}
	return getLyric8(buffer.slice(len, 163840 + len), parseLyric);
};

module.exports = function(){
	if(arguments.length >= 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'string'){
		return getResembleLyric2(arguments[0], arguments[1], arguments[2]);
	}

	if(arguments.length < 1) throw new Error("Wrong arguments!");

	if(typeof arguments[0] === 'string'){
		return getLyricFromStream(fs.createReadStream(arguments[0]), arguments[1]);
	}

	if(arguments[0] instanceof stream){
		return getLyricFromStream(arguments[0], arguments[1]);
	}

	if(arguments[0] instanceof Buffer){
		return getLyricFromBuffer(arguments[0], arguments[1]);
	}
};
