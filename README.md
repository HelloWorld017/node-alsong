# node-alsong
An alsong lyric finder for node.

## Usage
### `alsong(artist, title [, option ])`
Finds lyric by artist and title.
Returns a promise which resolves **array of** lyrics.

Example:
```js
const alsong = require('alsong');
alsong('ClariS', 'irony').then((v) => {
	console.log(v[0]);
});
```

Option:
```js
{
	skipParse: false,	// If it is true, it will not parse the lyric, and fields of xml response
	page: 0
}
```

### `alsong(music [, option ])`
Finds lyric by stream, buffer, or music.
Returns a promise which resolves lyrics.

Example:
```js
alsong('./only my railgun.mp3').then((v) => {
	console.log(v);
});

alsong(require('fs').readFileSync('./kimi_no_shiranai_monogatari.mp3')).then((v) => {
	console.log(v);
});

alsong(require('fs').createReadStream('./キズナミュージック.mp3')).then((v) => {
	console.log(v);
});
```

Option:
```js
{
	skipParse: false
}
```


### `alsong.getHash(music)`
Gets lyric hash by buffer, stream, or a file.
Returns a promise which resolves the hash.

## Example Lyric Object
```js
{
	strInfoID: '7241381',
	strOnlyLyricWord: '0',
	strTitle: 'STEP',
	strLyric: '[00:14.40]君に謳い　聴かせたいこと<br>(...)',
	strArtistName: 'ClariS',
	strAlbumName: 'STEP',
	strRegisterFirstName: '오재령',
	strRegisterFirstEMail: 'xxxxxx@naver.com',
	strRegisterFirstURL: '',
	strRegisterFirstPhone: 'xxx-xxxx-xxxx',
	strRegisterFirstComment: '노래가사는 찾아서올렸지만 싱크는 제가못마추무로 그냥가사만 올릴게요 ㅠㅠ',
	strRegisterName: '디시애니일본',
	strRegisterEMail: '',
	strRegisterURL: '',
	strRegisterPhone: '',
	strRegisterComment: '',
	lyric:
		{
			'0': [ '' ],
			'14400': [ '君に謳い　聴かせたいこと', '키미니우타이 키카세타이코토', '네게 간절하게 들려주고 싶은 말' ],
			'21180':
				[ '壊れないように大事に　しすぎちゃってさ',
				'코와레나이요우니 다이지니 시스기챳테사',
				'부서지지 않도록 소중히 간직만 하고 있어' ],
			'28180': [ '今日もメールを　綴ってはまた', '쿄우모 메ー루오 츠즛테와 마타', '오늘도 메일을 쌓아두고서는 또' ],
			'34300': [ '空白で塗り替えて千切ってしまうの', '쿠우하쿠데 누리카에테 치깃테시마우노', '공백으로 다시 칠해 지워버려' ],
			(...)
		}
}
```
