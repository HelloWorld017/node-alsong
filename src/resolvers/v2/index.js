const axios = require('axios');

const AlsongResolver = require('../AlsongResolver');
const AlsongV2Converter = require('./converter');
const NodeRSA = require('node-rsa');

const encKey = new NodeRSA();
encKey.setOptions({
	encryptionScheme: 'pkcs1'
});

encKey.importKey({
	n: Buffer.from(
		(
			'dfbc1f3f4c10e17e0112d72e78916da506edd57da06eac6ae4f00dd301067178' +
			'057baa9ba94ef6e665bfb29cee567de4081249c0be376f9811383ce6d12bad74' +
			'4a2f12fc16189c3d6ec041222b45954184165f37d98d188ed5ad158ff8b5004e' +
			'8e717f714fc962ab7eb02d58481960d4d62f09c0b642e496ec703eca1c65374b'
		),
		'hex'
	),
	e: 65537
}, 'components-public');

const AlsongV2 = {
	...AlsongResolver,
	encKey,
		
	api: axios.create({
		baseURL: 'https://lyric.altools.com',
		headers: {
			'Accept-Charset': 'utf-8',
			'Connection': 'close',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		responseType: 'json'
	}),
	
	converter: AlsongV2Converter,
	
	getEncData() {
		const message = (() => {
			const pad2 = i => i.toString().padStart(2, '0');
			
			const date = new Date();
			const dateStr = 
				`${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`;
			
			const timeStr =
				`${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}`;
			
			return Buffer.from(`ALSONG_ANDROID_${dateStr}_${timeStr}`, 'utf8');
		})();

		return this.encKey.encrypt(message).toString('hex').toUpperCase();
	},
	
	async _getResembleLyricList(artist, title, option = {}) {
		const page = option.page || 0;
		const playtime = option.playtime;
		const params = new URLSearchParams();
		params.append('title', title);
		params.append('artist', artist);
		if (playtime) {
			params.append('playtime', playtime);
		}
		params.append('page', page + 1);
		params.append('encData', this.getEncData());
		
		try {
			const { data } = await this.api.post('/v1/search', params);
			return data;
		} catch(err) {
			throw new Error("Alsong: Wrong response from server: " + err.message);
		}
	},
	
	async _getLyricById(id, option = {}) {
		const params = new URLSearchParams();
		params.append('info_id', id);
		params.append('encData', this.getEncData());
		
		try {
			const { data } = await this.api.post('/v1/info', params);
			return data;
		} catch(err) {
			if (err.response && err.response.status === 404) {
				return null;
			}
			
			throw new Error("Alsong: Wrong response from server: " + err.message);
		}
	},

	async _getLyricByHash(hash, option = {}) {
		const params = new URLSearchParams();
		params.append('md5', hash);
		params.append('encData', this.getEncData());
		
		try {
			const { data } = await this.api.post('/v1/lookup', params);
			return data;
		} catch(err) {
			if (err.response && err.response.status === 404) {
				return null;
			}
			
			throw new Error("Alsong: Wrong response from server: " + err.message);
		}
	}
};

module.exports = AlsongV2;
