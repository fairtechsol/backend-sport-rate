const URL = 'http://bihun.in/api11/';
const axios = require('axios');
class ThirdPartyController {

	callAxios(options, resolve, errorConst) {
		axios(options)
			.then(response => {
				resolve(response.data);
			})
			.catch(error => {
				console.log(errorConst, " ", error?.response?.data);
				resolve(null);
			});
	}

	//----------------------------------------------get competition---------------------------------------\\
	async getMatchOdds_old(marketId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: URL + 'odds.php?eid=' + marketId,
				url: 'https://betfair.openapi.live/api/v2/listMarketBookOdds?market_id=' + marketId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject match-odds old";
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getMatchOdds(marketId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: URL + 'odds.php?eid=' + marketId,
				url: 'http://13.42.165.216:8443/api/betfair/' + marketId,
				// url: 'http://3.89.232.255:3200/matchOddsNew/' + marketId,
				// url: 'https://betfair.openapi.live/api/v2/listMarketBookOdds?market_id=' + marketId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject match-odds";
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getBookmakerMarket(marketId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: URL + 'bookmaker.php?eid=' + marketId,
				url: 'https://fancy.betpro.gold/api/betfair/bookmaker/' + marketId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject bookmaker-markert";
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getSessions(marketId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: URL + 'fancy1.php?eid=' + marketId,
				url: 'https://fancy.betpro.gold/api/betfair/fancy/' + marketId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject session";
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getMatchList(typeId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: URL + 'list.php',
				url: 'https://api.bullsoffer9.in/markets/' + typeId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject get match list";
			this.callAxios(options, resolve, errorConst);
		});
	}


	async getLiveScore(eventId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: URL + 'fancy1.php?eid=' + marketId,   https://super007.in/
				url: 'https://openapi.live/api/MatchOdds/score/' + eventId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject live score";
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getCompetitionList(typeId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: URL + 'list.php',
				// url: 'http://3.89.232.255:3200/competitionList?type=' + typeId,
				url: 'http://13.42.165.216/betfair/competition_list/' + typeId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject get competition list";
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getEventList(competitionId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: URL + 'list.php',
				// url: 'http://3.89.232.255:3200/eventList/' + competitionId,
				url: 'http://13.42.165.216/betfair/event_list_by_competition/' + competitionId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject get event list";
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getLiveGameData(gameType) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				url: 'http://45.79.120.59:3000/getdata/' + gameType,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = `at reject get live game data "${gameType}"`;
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getliveGameResultTop10(gameType) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				url: 'http://45.79.120.59:3000/getResultata/' + gameType,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = `at reject get live game Result Top 10 "${gameType}"`;
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getExtraEventList(eventId,eventType) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: 'http://3.89.232.255:3200/extraMarketList/' + eventId,
				url: 'http://13.42.165.216/betfair/' + eventType + '/' + eventId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = `at reject get extra event list `;
			this.callAxios(options, resolve, errorConst);
		});
	}
	
	async getDirectMatchList(typeId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: 'http://3.89.232.255:3200/extraMarketList/' + eventId,
				url: 'http://13.42.165.216/betfair/get_latest_event_list/' + typeId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = `at reject get extra event list `;
			this.callAxios(options, resolve, errorConst);
		});
	}

}


module.exports = new ThirdPartyController;
