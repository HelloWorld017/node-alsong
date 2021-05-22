const LyricUtils = {
	parseLyric(lyric) {
		const lyrics = {};
		lyric.split('<br>').forEach(v => {
			const match = v.match(/^\[(\d+):(\d\d).(\d\d)\](.*)$/);
			if (!match) return;

			const timestamp = 10 * (parseInt(match[1]) * 60 * 100 + parseInt(match[2]) * 100 + parseInt(match[3]));
			if(!lyrics[timestamp]) lyrics[timestamp] = [];

			lyrics[timestamp].push(match[4]);
		});
		
		return lyrics;
	}
};

module.exports = LyricUtils;