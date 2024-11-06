const { internalRedis } = require("../config/internalRedis");
const { getFootBallData, getCricketData, getHorseRacingData, getGreyHoundRacingData } = require("../getGameData");
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('../scratch');
let liveGameTypeTime = process.env.liveGameTypeTime ? parseInt(process.env.liveGameTypeTime) : 1000;

exports.joinMatchRoom = async (matchIntervalIds, matchId) => {

    let matchIds = localStorage.getItem("matchDBds") ? JSON.parse(localStorage.getItem("matchDBds")) : null;

    if (!matchIntervalIds[matchId]) {
        let matchDetail = await internalRedis.hgetall(matchId + "_match");
        let marketId = matchDetail?.marketId;

        if (marketId) {
            if (matchIds == null) {
                matchIds = [];
            }
            switch (matchDetail.matchType) {
                case 'football':
                case 'tennis':
                    matchIntervalIds[matchId] = setInterval(getFootBallData, liveGameTypeTime, marketId, matchId);
                    break;
                case 'cricket':
                case 'politics':
                    matchIntervalIds[matchId] = setInterval(getCricketData, liveGameTypeTime, marketId, matchId);
                    break;
                case 'horseRacing':
                    matchIntervalIds[matchId] = setInterval(getHorseRacingData, liveGameTypeTime, marketId, matchId);
                    break;
                case 'greyHound':
                    matchIntervalIds[matchId] = setInterval(getGreyHoundRacingData, liveGameTypeTime, marketId, matchId);
                    break;
            }
            matchIds.push(matchId);
            localStorage.setItem("matchDBds", JSON.stringify(matchIds));
        }
    }
}

exports.joinMultiMatchRoom = (matchIntervalIds) => {
    let matchDBds = localStorage.getItem("matchDBds") ? JSON.parse(localStorage.getItem("matchDBds")) : null;
    if (matchDBds && matchDBds.length) {
        matchDBds.map(async matchId => {
            let matchDetail = await internalRedis.hgetall(matchId + "_match");
            let marketId = matchDetail?.marketId;
            if (marketId) {
                switch (matchDetail.matchType) {
                    case 'football':
                    case 'tennis':
                        matchIntervalIds[matchId] = setInterval(getFootBallData, liveGameTypeTime, marketId, matchId);
                        break;
                    case 'cricket':
                    case 'politics':
                        matchIntervalIds[matchId] = setInterval(getCricketData, liveGameTypeTime, marketId, matchId);
                        break;
                    case 'horseRacing':
                        matchIntervalIds[matchId] = setInterval(getHorseRacingData, liveGameTypeTime, marketId, matchId);
                        break;
                    case 'greyHound':
                        matchIntervalIds[matchId] = setInterval(getGreyHoundRacingData, liveGameTypeTime, marketId, matchId);
                        break;
                }
            }
        });
    }
}