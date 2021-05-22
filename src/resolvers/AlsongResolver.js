const AlsongResolver = {
	converter: null,
	
	async getResembleLyricList(...args) {
		return this.converter.lyricList(
			await this._getResembleLyricList(...args)
		);
	},
	
	async _getResembleLyricList(artist, title, option = {}) {
		throw new Error("Not implemented");
	},
	
	async getResembleLyric(...args) {
		const lyrics = await this._getResembleLyric(...args);
		return {
			asNew: () => lyrics.map(lyric => this.converter.lyric(lyric).asNew()),
			asLegacy: () => lyrics.map(lyric => this.converter.lyric(lyric).asLegacy())
		};
	},
	
	async _getResembleLyric(artist, title, option = {}) {
		const lyricList = await this.getResembleLyricList(artist, title, option);
		
		return Promise.all(
			lyricList
				.asNew()
				.map(({ lyricId }) => this._getLyricById(lyricId, option))
		);
	},
	
	async getLyricByHash(...args) {
		return this.converter.lyric(
			await this._getLyricByHash(...args)
		);
	},
	
	async _getLyricByHash(hash, option = {}) {
		throw new Error("Not implemented");
	},
	
	async getLyricById(...args) {
		return this.converter.lyric(
			await this._getLyricById(...args)
		);
	},
	
	async _getLyricById(id, option = {}) {
		throw new Error("Not Implemented");
	}
};

module.exports = AlsongResolver;
