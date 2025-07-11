const URL = 'http://bihun.in/api11/';
const axios = require('axios');
const { apiEndPoints } = require('./constant');
class ThirdPartyController {

	callAxios(options, resolve, errorConst) {
		options.timeout = 3000;
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

	async getMatchOdds(marketId, apiType = 0) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				// url: URL + 'odds.php?eid=' + marketId,
				url: apiEndPoints.matchOdd[apiType] + marketId,
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

	async getExtraEventList(eventId, eventType) {
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
			let errorConst = `at reject get direct match list `;
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getCricketScore(eventid, apiType = 0) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				url: apiEndPoints.scoreCardEndPoint[apiType] + eventid,
				headers: { 'cache-control': 'no-cache' },
				signal: AbortSignal.timeout(1000)
			};
			let errorConst = `at reject get  Cricket Score `;
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getAllRateCricket(eventId, apiType = 2) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				url: apiEndPoints.matchOdd[apiType] + eventId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject get All Rate Cricket " + eventId;
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getAllRateFootBallTennis(eventId, apiType = 3) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				url: apiEndPoints.matchOdd[apiType] + eventId,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject get All Rate FootBall/Tennis " + eventId;
			this.callAxios(options, resolve, errorConst);
		});
	}

	async sportsList(typeId) {
		let data = await this.sportsListCall(typeId);
		if(typeId == 4 && data) {
			data = Object.values(data).flat();
		}
		return typeId == 4 ? data?.filter(match =>{
			if(match.iscc == 0){
				if(!match.beventId){
					match.beventId = match.oldgmid;
				}
				if(!match.beventId){
					return false;
				}
				return match;
			}
		}) : data;
	}

	async sportsListCall(typeId) {
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				url: apiEndPoints.sportListEndPoint[typeId],
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = "at reject sports List" + typeId;
			this.callAxios(options, resolve, errorConst);
		});
	}

	async getScoreIframeUrl(eventid, apiType = 1) {
		let sportsList = (await this.sportsListCall(apiType)) || [];
		let beventId = sportsList.find(item => item.gmid == eventid)?.beventId;
		return beventId ? {
			"message": true,
			"iframeUrl": `https://dpmatka.in/sr.php?eventid=${beventId}&sportid=1`
		} : null;
		// "iframeUrl": `https://dpmatka.in/sr.php?eventid=${beventId}&sportid=${apiType}`
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				url: apiEndPoints.ScoreIframeUrl + eventid + "&sportid=" + apiType,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = `at reject get ScoreCad IframeUrl ${eventid}`;
			this.callAxios(options, resolve, errorConst);
		});
	}

	async gettvIframeUrl(eventid, apiType = 1) {
		return {
			"message": true,
			"eventid": eventid,
			"iframeUrl": `https://dpmatka.in/protv.php?sportId=${apiType}&eventId=${eventid}`
		}
		return new Promise((resolve, reject) => {
			let options = {
				method: 'GET',
				url: apiEndPoints.tvIframeUrl + apiType + "&eventid=" + eventid,
				headers: { 'cache-control': 'no-cache' }
			};
			let errorConst = `at reject get TV IframeUrl ${eventid}`;
			this.callAxios(options, resolve, errorConst);
		});
	}
}


module.exports = new ThirdPartyController;
