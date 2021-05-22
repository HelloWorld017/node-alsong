const resolvers = require('./resolvers');

const ExtensibleFunction = require('./utils/ExtensibleFunction');
const HashUtils = require('./utils/HashUtils');

class Alsong extends ExtensibleFunction {
	constructor(options = {}) {
		super((...args) => this.alsong(...args));
		
		this._options = options;
		this._resolver = resolvers[options.resolver || 'v2'];
	}
	
	_convert(item) {
		return item.asNew();
	}
	
	async alsong(...args) {
		if(args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string'){
			return this.getLyricListByArtistTitle(...args);
		}

		if(args.length < 1) {
			throw new Error("Wrong arguments!");
		}
		
		return this.getLyric(...args);
	}
	
	async getHash(music) {
		return HashUtils.getHash(music);
	}
	
	async getLyric(music, option) {
		const hash = await this.getHash(music);
		return this.getLyricByHash(hash, option);
	}
	
	async getLyricByHash(hash, option) {
		return this._convert(await this._resolver.getLyricByHash(hash, option));
	}
	
	async getLyricById(id, option) {
		return this._convert(await this._resolver.getLyricById(id, option));
	}
	
	async getLyricListByArtistTitle(artist, title, option) {
		return this._convert(await this._resolver.getResembleLyricList(artist, title, option));
	}
}

class AlsongCompat extends Alsong {
	_convert(item) {
		return item.asLegacy();
	}
	
	async getLyricListByArtistTitle(artist, title, option) {
		return this._convert(await this._resolver.getResembleLyric(artist, title, option));
	}
}

module.exports = new Alsong();
module.exports.compat = function(resolver = 'v2') {
	return new AlsongCompat({
		...this._options,
		compatMode: true,
		resolver
	});
};