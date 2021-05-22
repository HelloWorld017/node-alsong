const LyricUtils = require('../../utils/LyricUtils');

const AlsongV2Converter = {
	lyric: result => ({
		asLegacy() {
			if (!result) {
				return {
					strInfoID: '-1',
					strStatusID: '2',
					strRegistDate: '',
					strTitle: '',
					strArtist: '',
					strAlbum: '',
					strCountGood: '',
					strCountBad: '',
					strLyric: '',
					strRegisterFirstName: '',
					strRegisterFirstEMail: '',
					strRegisterFirstURL: '',
					strRegisterFirstPhone: '',
					strRegisterFirstComment: '',
					strRegisterName: '',
					strRegisterEMail: '',
					strRegisterURL: '',
					strRegisterPhone: '',
					strRegisterComment: '',
					strCountGood: '0',
					strCountBad: '0',
					lyric: {}
				};
			}
			
			return {
				strInfoID: `${result.info_id}`,
				strOnlyLyricWord: '0',
				strTitle: result.title,
				strLyric: result.lyric,
				strArtistName: result.artist,
				strAlbumName: result.album_name,
				strRegisterFirstName: result.register_first_name,
				strRegisterFirstEMail: result.register_first_email,
				strRegisterFirstURL: result.register_first_url,
				strRegisterFirstPhone: result.register_first_phone,
				strRegisterFirstComment: result.register_first_comment,
				strRegisterName: result.register_name,
				strRegisterEMail: result.register_email,
				strRegisterURL: result.register_url,
				strRegisterPhone: result.register_phone,
				strRegisterComment: result.register_comment,
				strRegistDate: result.regist_date,
				strCountGood: `${result.count_good}`,
				strCountBad: `${result.count_bad}`,
				lyric: result.lyric && LyricUtils.parseLyric(result.lyric)
			};
		},
		
		asNew() {
			if (!result) {
				return null;
			}
			
			return {
				infoId: result.info_id,
				title: result.title,
				lyric: LyricUtils.parseLyric(result.lyric),
				lyricRaw: result.lyric,
				artistName: result.artist,
				albumName: result.album_name,
				firstRegister: {
					name: result.register_first_name,
					email: result.register_first_email,
					url: result.register_first_url,
					phone: result.register_first_phone,
					comment: result.register_first_comment
				},
				register: {
					name: result.register_name,
					email: result.register_email,
					url: result.register_url,
					phone: result.register_phone,
					comment: result.register_comment
				},
				registerDate: new Date(result.regist_date),
				count: {
					bad: result.count_bad,
					good: result.count_good
				}
			};
		}
	}),
	
	lyricList: list => ({
		asNew() {
			return list.map(item => ({
				lyricId: item.lyric_id,
				playtime: item.playtime,
				artist: item.artist,
				album: item.album,
				title: item.title,
				registerDate: new Date(item.register_date)
			}));
		}
	})
};

module.exports = AlsongV2Converter;