const AlsongV1Converter = {
	lyric: result => ({
		asLegacy() {
			return {
				...result,
				lyric: result.strLyric && LyricUtils.parseLyric(result.strLyric)
			};
		},
		
		asNew() {
			throw new Error("Not implemented");
		}
	}),
	
	lyricList: result => ({
		asNew() {
			throw new Error("Not implemented");
		}
	})
};

module.exports = AlsongV1Converter;