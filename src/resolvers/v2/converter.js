const LyricUtils = require('../../utils/LyricUtils');

const AlsongV2Converter = {
	lyric: result => {
		const title = result.title || result.title_name || '';
		const artist = result.artist || result.artist_name || '';
		const album = result.album || result.album_name || '';
		const registerDate = result.regist_date ?
			new Date(result.regist_date) : 
			new Date(0);
		
		const countGood = result.count_good || 0;
		const countBad = result.count_bad || 0;
		
		return {
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
					strTitle: title,
					strArtistName: artist,
					strAlbumName: album,
					strLyric: result.lyric,
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
					strRegistDate: registerDate.toISOString(),
					strCountGood: `${countGood}`,
					strCountBad: `${countBad}`,
					lyric: result.lyric && LyricUtils.parseLyric(result.lyric)
				};
			},
			
			asNew() {
				if (!result) {
					return null;
				}
				
				return {
					lyricId: result.info_id,
					title,
					artist,
					album,
					lyric: LyricUtils.parseLyric(result.lyric),
					lyricRaw: result.lyric,
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
					registerDate: registerDate,
					count: {
						bad: countBad,
						good: countGood
					}
				};
			}
		};
	},
	
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