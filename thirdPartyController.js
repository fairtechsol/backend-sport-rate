const URL = 'http://bihun.in/api11/';
const Request = require('request');
class ThirdPartyController {

	//----------------------------------------------get competition---------------------------------------\\
	async getMatchOdds_old(marketId) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				// url: URL + 'odds.php?eid=' + marketId,
				url: 'https://betfair.openapi.live/api/v2/listMarketBookOdds?market_id=' + marketId,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log("at reject match-odds ", error);
					// reject(error);
					resolve(null)
				} else {
					try {
						resolve(JSON.parse(body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

	async getMatchOdds(marketId) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				// url: URL + 'odds.php?eid=' + marketId,
				// url: 'http://13.41.184.61:8443/api/betfair/' + marketId,
				url: 'https://3200dev.fairgame.club/matchOddsNew/' + marketId,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log("at reject match-odds ", error);
					// reject(error);
					resolve(null);
					process.exit(0);
				} else {
					try {
						resolve(JSON.parse(body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

	async getBookmakerMarket(marketId) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				// url: URL + 'bookmaker.php?eid=' + marketId,
				url: 'https://fancy.betpro.gold/api/betfair/bookmaker/' + marketId,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log("at reject bookmaker-markert ", error);
					// reject(error);
					resolve(null)
				} else {
					try {
						resolve(JSON.parse(body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

	async getSessions(marketId) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				// url: URL + 'fancy1.php?eid=' + marketId,
				url: 'https://fancy.betpro.gold/api/betfair/fancy/' + marketId,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log("at reject session ", error);
					// reject(error);
					resolve(null)
				} else {
					try {
						resolve(JSON.parse(body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

	async getMatchList(typeId) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				// url: URL + 'list.php',
				url: 'https://api.bullsoffer9.in/markets/' + typeId,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log("at reject get match list ", error);
					// reject(error);
					resolve(null)
				} else {
					try {
						resolve(JSON.parse(response.body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}


	async getLiveScore(eventId) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				// url: URL + 'fancy1.php?eid=' + marketId,   https://super007.in/
				url: 'https://openapi.live/api/MatchOdds/score/' + eventId,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log("at reject live score ", error);
					// reject(error);
					resolve(null)
				} else {
					try {
						resolve(JSON.parse(body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

	async getCompetitionList(typeId) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				// url: URL + 'list.php',
				url: 'https://3200dev.fairgame.club/competitionList?type=' + typeId,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log("at reject get competition list ", error);
					// reject(error);
					resolve(null)
				} else {
					try {
						resolve(JSON.parse(response.body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

	async getEventList(competitionId) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				// url: URL + 'list.php',
				url: 'https://3200dev.fairgame.club/eventList/' + competitionId,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log("at reject get event list ", error);
					// reject(error);
					resolve(null)
				} else {
					try {
						resolve(JSON.parse(response.body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

	async getLiveGameData(gameType) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				url: 'http://45.79.120.59:3000/getdata/' + gameType,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log(`at reject get live game data "${gameType}" `, error);
					// reject(error);
					resolve(null);
				} else {
					try {
						resolve(JSON.parse(body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

	async getliveGameResultTop10(gameType) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				url: 'http://45.79.120.59:3000/getResultata/' + gameType,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log(`at reject get live game Result Top 10 "${gameType}" `, error);
					// reject(error);
					resolve(null);
				} else {
					try {
						resolve(JSON.parse(body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

	async getExtraEventList(eventId) {
		return new Promise(function (resolve, reject) {
			let options = {
				method: 'GET',
				url: 'https://3200dev.fairgame.club/extraMarketList/' + eventId,
				headers: { 'cache-control': 'no-cache' }
			};
			Request(options, function (error, response, body) {
				if (error) {
					console.log("at reject get extra event list ", error);
					// reject(error);
					resolve(null)
				} else {
					try {
						resolve(JSON.parse(response.body));
					} catch {
						resolve(null);
					}
				}
			});
		});
	}

}


module.exports = new ThirdPartyController;
