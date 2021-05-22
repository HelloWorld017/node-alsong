const axios = require('axios');
const escapeHtml = require('escape-html');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const AlsongResolver = require('../AlsongResolver');
const AlsongV1Converter = require('./converter');

const AlsongV1 = {
	...AlsongResolver,
	
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
	
	converter: AlsongV1Converter,
	
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
	
	
	async _getResembleLyric(artist, title, option = {}) {
		const page = option.page || 0;
		
		const response = await this.request('GetResembleLyric2', `
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
			
			return results.map(result => this.flatten(result));
		} catch(err) {
			throw new Error("Alsong: Wrong response from server: " + err.message);
		}
	},
	
	async _getLyricByHash(hash, option = {}) {
		const response = await this.request('GetLyric8', `
			<strChecksum>${checksum}</strChecksum>
			<strVersion></strVersion>
			<strMACAddress></strMACAddress>
			<strIPAddress></strIPAddress>
		`);
		
		try {
			return this.flatten(response);
		} catch(err) {
			throw new Error("Alsong: Wrong response from server: " + err.message);
		}
	},
	
	flatten(result) {
		return Object.keys(result).reduce((flattened, key) => {
			flattened[key] = result[key][0];
			return flattened;
		}, {});
	}
};

module.exports = AlsongV1;
