const winston = require('winston');
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const DailyRotateFile = require('winston-daily-rotate-file');

const ThirdPartyController = require('./thirdPartyController.js');
const { internalRedis, io, CheckAndClearInterval } = require('./index.js');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}
// Create logger factory function
const createEventLogger = (matchId) => {
  const transport = new DailyRotateFile({
    filename: path.join(logsDir, `event-${matchId}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxFiles: '2d'  // automatically delete logs older than 2 days
  });

  // Add error event listener to the transport:
  transport.on('error', (err) => {
    console.error('Logging transport error:', err);
    // Optionally: Implement retry logic or fallback behavior here.
  });

  const logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [transport]
  });
  logger.on('error', (err) => {
    console.error('Logger error:', err);
  });
  return logger;
};

const addLogs = async (matchId, data) => {
  if (process.env.NODE_ENV == 'production') {
    const logger = createEventLogger(matchId);
    data = data.filter(item => { if (item.gtype == 'match' || item.gtype == 'match1') return item; });
    const indiaTime = moment().tz('Asia/Kolkata').format();
    // Log request
    logger.info({ data, dateTime: indiaTime });
  }
}


async function getCricketData(marketId, matchId) {

  CheckAndClearInterval(matchId);

  let matchDetail = await internalRedis.hgetall(matchId + "_match");
  const returnResult = { id: matchId, marketId, eventId: matchDetail.eventId, apiSession: {} };
  const expertResult = { id: matchId, marketId, eventId: matchDetail.eventId, apiSession: {} };

  let isAPISessionActive = matchDetail.apiSessionActive ? JSON.parse(matchDetail.apiSessionActive) : false;
  let isManualSessionActive = matchDetail.manualSessionActive ? JSON.parse(matchDetail.manualSessionActive) : false;

  let sessionManual = [];

  let isManual = marketId?.split(/(\d+)/)[0] == 'manual';
  if (!isManual) {
    // Run API calls in parallel
    const [data, scoreBoard] = await Promise.all([
      ThirdPartyController.getAllRateCricket(matchDetail.eventId, 2),
      ThirdPartyController.getCricketScore(matchDetail.eventId, 0)
    ]);

    // let data = await ThirdPartyController.getAllRateCricket(matchDetail.eventId, 2);
    // scoreBoard = await ThirdPartyController.getCricketScore(matchDetail.eventId, 0);
    returnResult.scoreBoard = scoreBoard;

    let mainData = data?.data || [];
    addLogs(matchId, mainData);
    returnResult.gmid = mainData[0]?.gmid || '';
    expertResult.gmid = mainData[0]?.gmid || '';

    let customObject = { tournament: [] };

    if (!matchDetail?.teamB) {
      mainData.forEach(da => {
        switch (da.gtype) {
          case "match":
          case "match1":
            customObject?.tournament?.push(da);
            break;
          case "fancy":
            customObject.session = da;
            break;
          case "oddeven":
            customObject.oddEven = da;
            break;
          case "fancy1":
            customObject.fancy1 = da;
            break;
          default:
            break;
        }
      });
    } else {
      mainData.forEach(da => {
        const mname = da.mname.toLowerCase();
        switch (mname) {
          case "normal":
            customObject.session = da;
            break;
          case "over by over":
            customObject.overByover = da;
            break;
          case "ball by ball":
            customObject.ballByBall = da;
            break;
          case "oddeven":
            customObject.oddEven = da;
            break;
          case "fancy1":
            customObject.fancy1 = da;
            break;
          case "khado":
            customObject.khado = da;
            break;
          case "meter":
            customObject.meter = da;
            break;
          default:
            if (da.gtype == "cricketcasino") {
              if (customObject.hasOwnProperty("cricketCasino")) {
                customObject.cricketCasino.push(da);
              } else {
                customObject.cricketCasino = [da];
              }
            } else {
              if (da.gtype == 'match1' || da.gtype == 'match') customObject.tournament.push(da);
            }
            break;
        }
      });
    }


    if (matchDetail.tournament || customObject.tournament) {
      expertResult.tournament = [];
      returnResult.tournament = [];
      let iterated = [];
      let otherData = JSON.parse(matchDetail.tournament || "[]");
      for (let item of (customObject?.tournament || [])) {
        let isRedisExist = otherData.findIndex(it => it?.mid == item?.mid);
        let obj = {};
        if (isRedisExist > -1) {
          iterated.push(item?.mid);
          let parseData = otherData[isRedisExist];
          obj = {
            "id": parseData.id,
            "marketId": parseData.marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            isManual: parseData.isManual,
            dbRunner: parseData?.runners,
            gtype: parseData.gtype,
            exposureLimit: parseData.exposureLimit,
            betLimit: parseData.betLimit,
            isCommissionActive: parseData.isCommissionActive,
            sno: parseData.sNo,
          };
        }
        let formateData = await formateOdds(item, obj);
        expertResult.tournament.push(formateData);
        if (obj.activeStatus == 'live') {
          returnResult.tournament.push(formateData);
        }
      }
      for (let item of otherData) {
        if (item.activeStatus == "close") {
          continue;
        }
        let isRedisExist = iterated?.findIndex(it => it == item?.mid);
        if (isRedisExist < 0) {
          let obj = {};
          let parseData = item;
          let isTwoTeam = parseData.runnerName.length == 2;
          obj = {
            "id": parseData.id,
            "marketId": parseData.marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            isCommissionActive: parseData.isCommissionActive,
            sno: parseData.sNo,
            "isManual": parseData.isManual,
            parentBetId: parseData.parentBetId,
            "runners": parseData.isManual ? parseData.runners?.map(item => ({
              selectionId: item.selectionId,
              status: item.status?.toUpperCase(),
              nat: item.runnerName,
              id: item.id,
              sortPriority: item.sortPriority,
              parentRunnerId: item.parentRunnerId,
              ex: {
                availableToBack: [{
                  price: item.backRate > 2 ? isTwoTeam && item.backRate > 100 ? 0 : Math.floor(item.backRate) - 2 : 0,
                  otype: "back",
                  oname: "back3",
                  tno: 2
                }, {
                  price: item.backRate > 1 ? isTwoTeam && item.backRate > 100 ? 0 : Math.floor(item.backRate) - 1 : 0,
                  otype: "back",
                  oname: "back2",
                  tno: 1
                }, {
                  price: item.backRate < 0 ? 0 : item.backRate,
                  otype: "back",
                  oname: "back1",
                  tno: 0
                }],
                availableToLay: [{
                  price: item.layRate < 0 ? 0 : item.layRate,
                  otype: "lay",
                  oname: "lay1",
                  tno: 0
                }, {
                  price: isTwoTeam && item.layRate > 100 ? 0 : ((!matchDetail.rateThan100 && item.layRate > 99.99) || (item.layRate <= 0)) ? 0 : Math.floor(item.layRate) + 1,
                  otype: "lay",
                  oname: "lay2",
                  tno: 1
                }, {
                  price: isTwoTeam && item.layRate > 100 ? 0 : ((!matchDetail.rateThan100 && item.layRate > 98.99) || ((item.layRate <= 0))) ? 0 : Math.floor(item.layRate) + 2,
                  otype: "lay",
                  oname: "lay3",
                  tno: 2
                }]
              }
            })) : parseData.runners?.map(run => {
              return { "nat": run?.runnerName, id: run?.id, selectionId: run.selectionId, sortPriority: run.sortPriority, }
            }),
            gtype: parseData.gtype,
            exposureLimit: parseData.exposureLimit,
            betLimit: parseData.betLimit
          };
          let formateData = await formateOdds(null, obj);

          expertResult.tournament.push(formateData);
          returnResult.tournament.push(formateData);
        }
      }

    }

    let sessionAPIObj = {}
    if (isAPISessionActive || isManualSessionActive) {
      let sessionData = await internalRedis.hgetall(matchId + "_session");
      sessionData = sessionData ? Object.values(sessionData) : [];
      sessionData.map(sessionString => {
        let parseObj = JSON.parse(sessionString);
        if ((parseObj.isManual)) {
          sessionManual.push(sessionString);
        } else {
          if (sessionAPIObj.hasOwnProperty(parseObj.type)) {
            sessionAPIObj[parseObj.type].push(parseObj);
          } else {
            sessionAPIObj[parseObj.type] = [parseObj];
          }
          // sessionAPI.push(parseObj);
        }
      });
    }

    if (isAPISessionActive) {
      let key = 'session';
      if (customObject.session || sessionAPIObj[key]) {
        let { expertResult1, returnResult1 } = formateSessionMarket(key, customObject, sessionAPIObj);
        returnResult.apiSession[key] = returnResult1;
        expertResult.apiSession[key] = expertResult1;
      }

      key = 'overByover';
      if (customObject.overByover || sessionAPIObj[key]) {
        let { expertResult1, returnResult1 } = formateSessionMarket(key, customObject, sessionAPIObj);
        returnResult.apiSession[key] = returnResult1;
        expertResult.apiSession[key] = expertResult1;
      }

      key = 'ballByBall';
      if (customObject.ballByBall || sessionAPIObj[key]) {
        let { expertResult1, returnResult1 } = formateSessionMarket(key, customObject, sessionAPIObj);
        returnResult.apiSession[key] = returnResult1;
        expertResult.apiSession[key] = expertResult1;
      }

      key = 'oddEven';
      if (customObject.oddEven || sessionAPIObj[key]) {
        let { expertResult1, returnResult1 } = formateSessionMarket(key, customObject, sessionAPIObj);
        returnResult.apiSession[key] = returnResult1;
        expertResult.apiSession[key] = expertResult1;
      }

      key = 'fancy1';
      if (customObject.fancy1 || sessionAPIObj[key]) {
        let { expertResult1, returnResult1 } = formateSessionMarket(key, customObject, sessionAPIObj);
        returnResult.apiSession[key] = returnResult1;
        expertResult.apiSession[key] = expertResult1;
      }
      key = 'khado';
      if (customObject.khado || sessionAPIObj[key]) {
        let { expertResult1, returnResult1 } = formateSessionMarket(key, customObject, sessionAPIObj);
        returnResult.apiSession[key] = returnResult1;
        expertResult.apiSession[key] = expertResult1;
      }

      key = 'meter';
      if (customObject.meter || sessionAPIObj[key]) {
        let { expertResult1, returnResult1 } = formateSessionMarket(key, customObject, sessionAPIObj);
        returnResult.apiSession[key] = returnResult1;
        expertResult.apiSession[key] = expertResult1;
      }

      key = 'cricketCasino';
      if (customObject.cricketCasino || sessionAPIObj[key]) {
        let result = customObject[key];
        let expertSession = [], onlyLiveSession = [], addedSession = [];
        let sessionAPI = sessionAPIObj[key];
        if (result) {
          for (let casinoItem of result) {
            let casinoSession = {
              SelectionId: casinoItem.mid?.toString(),
              RunnerName: casinoItem.mname,
              gtype: casinoItem.gtype,
              section: casinoItem.section,
              GameStatus: casinoItem.status,
              rem: casinoItem.rem
            }
            let sessionIndex = sessionAPI?.findIndex(obj => obj.selectionId == casinoSession.SelectionId);
            if (sessionIndex > -1) {
              casinoSession["id"] = sessionAPI[sessionIndex].id;
              casinoSession["activeStatus"] = sessionAPI[sessionIndex].activeStatus;
              casinoSession["min"] = sessionAPI[sessionIndex].minBet;
              casinoSession["max"] = sessionAPI[sessionIndex].maxBet;
              casinoSession["isCommissionActive"] = sessionAPI[sessionIndex].isCommissionActive;
              casinoSession["createdAt"] = sessionAPI[sessionIndex].createdAt;
              casinoSession["updatedAt"] = sessionAPI[sessionIndex].updatedAt;

              if (casinoSession["activeStatus"] == 'live') {
                onlyLiveSession.push(casinoSession);
              }
              addedSession.push(casinoSession.SelectionId);
            }
            expertSession.push(casinoSession);
          }
        }
        sessionAPI?.map(session => {
          if (!addedSession.includes(session.selectionId)) {
            let obj = {
              "SelectionId": session.selectionId,
              "RunnerName": session.name,
              "min": session.minBet,
              "max": session.maxBet,
              "id": session.id,
              "activeStatus": session.activeStatus,
              "updatedAt": session.updatedAt,
              isCommissionActive: session.isCommissionActive
            };
            if (obj["activeStatus"] == 'live') {
              onlyLiveSession.push(obj);
            }
            expertSession.push(obj);
          }
        });

        returnResult.apiSession[key] = {
          "mname": result?.mname,
          "rem": result?.rem,
          "gtype": result?.gtype,
          "status": result?.status,
          "section": onlyLiveSession,
          mid: result?.mid,
        };
        expertResult.apiSession[key] = {
          "mname": result?.mname,
          "rem": result?.rem,
          "gtype": result?.gtype,
          "status": result?.status,
          "section": expertSession,
          mid: result?.mid,
        };
      }

    }

  }

  let redisPromise = [];
  redisPromise.push(internalRedis.hgetall(matchId + "_manualBetting"));

  let manuallyResponse = await Promise.allSettled(redisPromise);
  if (isManualSessionActive) {
    // let result = manuallyResponse[1].value;
    returnResult.sessionBettings = sessionManual?.filter((item) => JSON.parse(item)?.["activeStatus"] == 'live');
    key = 'manualSession';
    let { expertResult1 } = formateSessionMarket(key, {}, { [key]: sessionManual.map(item => JSON.parse(item)) });
    expertResult.apiSession[key] = expertResult1;
  }
  let manuallyMatchDetails = manuallyResponse[0].value;
  if (manuallyMatchDetails) {
    returnResult.quickbookmaker = [];
    expertResult.quickbookmaker = [];
    if (manuallyMatchDetails.tiedMatch2) {
      let json = JSON.parse(manuallyMatchDetails.tiedMatch2);
      if (json.isActive) {
        returnResult["manualTideMatch"] = json;
        expertResult["manualTideMatch"] = json;
      }
    }
    if (manuallyMatchDetails.quickbookmaker1) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker1);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
        expertResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.quickbookmaker2) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker2);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
        expertResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.quickbookmaker3) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker3);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
        expertResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.completeManual) {
      let json = JSON.parse(manuallyMatchDetails.completeManual);
      if (json.isActive) {
        returnResult["completeManual"] = json;
        expertResult["completeManual"] = json;
      }
    }
  }

  io.to(matchId).emit("liveData" + matchId, returnResult);
  io.to(matchId + 'expert').emit("liveData" + matchId, expertResult);
}
exports.getCricketData = getCricketData;

async function getFootBallData(marketId, matchId) {

  CheckAndClearInterval(matchId);

  let matchDetail = await internalRedis.hgetall(matchId + "_match");
  let returnResult = { id: matchId, marketId, eventId: matchDetail.eventId };
  let expertResult = { id: matchId, marketId, eventId: matchDetail.eventId };

  let isManual = marketId?.split(/(\d+)/)[0] == 'manual';
  if (!isManual) {
    let data = await ThirdPartyController.getAllRateFootBallTennis(matchDetail.eventId, 3);
    let mainData = data?.data || [];
    let customObject = { other: [] };

    returnResult.gmid = mainData[0]?.gmid || '';
    expertResult.gmid = mainData[0]?.gmid || '';

    if (!matchDetail?.teamB) {
      customObject.tournament = [];
      mainData.forEach(da => {
        switch (da.gtype) {
          case "match":
          case "match1":
            customObject.tournament.push(da);
            break;
          default:
            break;
        }
      });
    } else {
      customObject.tournament = [];
      mainData.forEach(da => {
        customObject.tournament.push(da);
      });
    }

    if (matchDetail.tournament || customObject.tournament) {
      expertResult.tournament = [];
      returnResult.tournament = [];
      let iterated = [];
      let otherData = JSON.parse(matchDetail.tournament || "[]");
      for (let item of (customObject?.tournament || [])) {
        let isRedisExist = otherData.findIndex(it => it?.mid == item?.mid);
        let obj = {};
        if (isRedisExist > -1) {
          iterated.push(item?.mid);
          let parseData = otherData[isRedisExist];
          obj = {
            "id": parseData.id,
            "marketId": parseData.marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            isManual: parseData.isManual,
            dbRunner: parseData?.runners,
            gtype: parseData.gtype,
            exposureLimit: parseData.exposureLimit,
            betLimit: parseData.betLimit,
            isCommissionActive: parseData.isCommissionActive,
            sno: parseData.sNo,
          };
        }
        let formateData = await formateOdds(item, obj);
        expertResult.tournament.push(formateData);
        if (obj.activeStatus == 'live') {
          returnResult.tournament.push(formateData);
        }
      }
      for (let item of otherData) {
        if (item.activeStatus == "close") {
          continue;
        }
        let isRedisExist = iterated?.findIndex(it => it == item?.mid);
        if (isRedisExist < 0) {
          let obj = {};
          let parseData = item;
          let isTwoTeam = parseData.runnerName.length == 2;
          obj = {
            "id": parseData.id,
            "marketId": parseData.marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            parentBetId: parseData.parentBetId,
            isCommissionActive: parseData.isCommissionActive,
            sno: parseData.sNo,
            "isManual": parseData.isManual,
            "runners": parseData.isManual ? parseData.runners?.map(item => ({
              selectionId: item.selectionId,
              status: item.status?.toUpperCase(),
              nat: item.runnerName,
              id: item.id,
              sortPriority: item.sortPriority,
              parentRunnerId: item.parentRunnerId,
              ex: {
                availableToBack: [{
                  price: item.backRate > 2 ? isTwoTeam && item.backRate > 100 ? 0 : Math.floor(item.backRate) - 2 : 0,
                  otype: "back",
                  oname: "back3",
                  tno: 2
                }, {
                  price: item.backRate > 1 ? isTwoTeam && item.backRate > 100 ? 0 : Math.floor(item.backRate) - 1 : 0,
                  otype: "back",
                  oname: "back2",
                  tno: 1
                }, {
                  price: item.backRate < 0 ? 0 : item.backRate,
                  otype: "back",
                  oname: "back1",
                  tno: 0
                }],
                availableToLay: [{
                  price: item.layRate < 0 ? 0 : item.layRate,
                  otype: "lay",
                  oname: "lay1",
                  tno: 0
                }, {
                  price: isTwoTeam && item.layRate > 100 ? 0 : ((!matchDetail.rateThan100 && item.layRate > 99.99) || (item.layRate <= 0)) ? 0 : Math.floor(item.layRate) + 1,
                  otype: "lay",
                  oname: "lay2",
                  tno: 1
                }, {
                  price: isTwoTeam && item.layRate > 100 ? 0 : ((!matchDetail.rateThan100 && item.layRate > 98.99) || ((item.layRate <= 0))) ? 0 : Math.floor(item.layRate) + 2,
                  otype: "lay",
                  oname: "lay3",
                  tno: 2
                }]
              }
            })) : parseData.runners?.map(run => {
              return { "nat": run?.runnerName, id: run?.id, selectionId: run.selectionId, sortPriority: run.sortPriority, }
            }),
            gtype: parseData.gtype,
            exposureLimit: parseData.exposureLimit,
            betLimit: parseData.betLimit
          };
          let formateData = await formateOdds(null, obj);

          expertResult.tournament.push(formateData);
          returnResult.tournament.push(formateData);

        }
      }
    }
  }

  let redisPromise = [];
  redisPromise.push(internalRedis.hgetall(matchId + "_manualBetting"));

  let manuallyResponse = await Promise.allSettled(redisPromise);
  let manuallyMatchDetails = manuallyResponse[0].value;

  if (manuallyMatchDetails) {
    returnResult.quickbookmaker = [];
    expertResult.quickbookmaker = [];
    if (manuallyMatchDetails.quickbookmaker1) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker1);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
        expertResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.quickbookmaker2) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker2);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
        expertResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.quickbookmaker3) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker3);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
        expertResult.quickbookmaker.push(json);
      }
    }
  }

  io.to(matchId).emit("liveData" + matchId, returnResult);
  io.to(matchId + 'expert').emit("liveData" + matchId, expertResult);
}
exports.getFootBallData = getFootBallData;

async function getHorseRacingData(marketId, matchId) {

  CheckAndClearInterval(matchId);

  let matchDetail = await internalRedis.hgetall(matchId + "_match");
  let returnResult = {};
  let expertResult = {};
  returnResult.id = matchId;
  returnResult.marketId = marketId;
  expertResult.id = matchId;
  expertResult.marketId = marketId;

  let liveIds = [];
  let promiseRequestArray = [];
  let typeIdObject = {}; // it will store the marketId as key and key as value so find id, min, max and other

  let matchOddLive = Object.keys(matchDetail).filter(key => key.startsWith("matchOdd"));
  matchOddLive.forEach(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    // let isLive = value.isActive;
    if (!value?.stopAt) {
      liveIds.push(value.marketId);
      typeIdObject[value.marketId] = key;
    }
    else {
      expertResult["matchOdd"] = value;
    }
  });

  if (liveIds.length) {
    let matchOddDetails = JSON.parse(matchDetail.matchOdd);
    promiseRequestArray.push(ThirdPartyController.getMatchOdds(liveIds.join(','), matchOddDetails?.apiType));
  }
  let respo = await Promise.allSettled(promiseRequestArray);
  let index = 0;

  let results = respo[index]?.value;

  if (results) {
    results.map((result, index) => {
      let marketId = liveIds[index];
      let key = typeIdObject[marketId];
      let value = matchDetail[key];
      value = JSON.parse(value);
      if (!result) {
        result = {};
      }
      result.id = value.id;
      result.name = value.name;
      result.minBet = value.minBet;
      result.maxBet = value.maxBet;
      result.type = value.type;
      result.isActive = value.isActive;
      result.activeStatus = value.activeStatus;

      expertResult[value.type] = result;
      // if (result.isActive) {
      returnResult[value.type] = result;
      // }

    });
  }

  io.to(matchId).emit("liveData" + matchId, returnResult);
  io.to(matchId + 'expert').emit("liveData" + matchId, expertResult);
}
exports.getHorseRacingData = getHorseRacingData;

async function getGreyHoundRacingData(marketId, matchId) {

  CheckAndClearInterval(matchId);

  let matchDetail = await internalRedis.hgetall(matchId + "_match");
  let returnResult = {};
  let expertResult = {};
  returnResult.id = matchId;
  returnResult.marketId = marketId;
  expertResult.id = matchId;
  expertResult.marketId = marketId;

  let liveIds = [];
  let promiseRequestArray = [];
  let typeIdObject = {}; // it will store the marketId as key and key as value so find id, min, max and other

  let matchOddLive = Object.keys(matchDetail).filter(key => key.startsWith("matchOdd"));
  matchOddLive.forEach(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    // let isLive = value.isActive;
    if (!value?.stopAt) {
      liveIds.push(value.marketId);
      typeIdObject[value.marketId] = key;
    }
    else {
      expertResult["matchOdd"] = value;
    }
  });

  if (liveIds.length) {
    let matchOddDetails = JSON.parse(matchDetail.matchOdd);
    promiseRequestArray.push(ThirdPartyController.getMatchOdds(liveIds.join(','), matchOddDetails?.apiType));
  }
  let respo = await Promise.allSettled(promiseRequestArray);
  let index = 0;

  let results = respo[index]?.value;

  if (results) {
    results.map((result, index) => {
      let marketId = liveIds[index];
      let key = typeIdObject[marketId];
      let value = matchDetail[key];
      value = JSON.parse(value);
      if (!result) {
        result = {};
      }
      result.id = value.id;
      result.name = value.name;
      result.minBet = value.minBet;
      result.maxBet = value.maxBet;
      result.type = value.type;
      result.isActive = value.isActive;
      result.activeStatus = value.activeStatus;

      expertResult[value.type] = result;
      // if (result.isActive) {
      returnResult[value.type] = result;
      // }

    });
  }

  io.to(matchId).emit("liveData" + matchId, returnResult);
  io.to(matchId + 'expert').emit("liveData" + matchId, expertResult);
}
exports.getGreyHoundRacingData = getGreyHoundRacingData;

function formateOdds(data, additionDetails) {
  return {
    marketId: additionDetails.marketId,
    mid: data?.mid || additionDetails?.marketId,
    gmid: data?.gmid,
    status: data?.status,
    inplay: data?.inplay,
    gtype: additionDetails.gtype || data?.gtype,
    rem: data?.rem,
    isManual: additionDetails?.isManual || data?.isManual,
    exposureLimit: additionDetails.exposureLimit,
    isCommissionActive: additionDetails.isCommissionActive,
    sno: data?.sno || additionDetails?.sno,
    parentBetId: additionDetails?.parentBetId,
    runners: data?.section?.map(item => ({
      selectionId: item.sid,
      status: item.gstatus,
      nat: item.nat,
      sortPriority: item.sno,
      id: additionDetails?.dbRunner?.find((items) => items?.selectionId?.toString() == item?.sid?.toString())?.id,
      ex: {
        availableToBack: item.odds?.filter(odd => odd.otype === 'back').map(odd => ({
          price: odd.odds,
          size: odd.size,
          otype: odd.otype,
          oname: odd.oname,
          tno: odd.tno
        })),
        availableToLay: item.odds?.filter(odd => odd.otype !== 'back').map(odd => ({
          price: odd.odds,
          size: odd.size,
          otype: odd.otype,
          oname: odd.oname,
          tno: odd.tno
        }))
      }
    })) || additionDetails?.runners,
    id: additionDetails.id,
    name: additionDetails.name || data?.mname,
    minBet: additionDetails.minBet ?? data?.min,
    maxBet: additionDetails.maxBet ?? data?.max,
    type: additionDetails?.type,
    isActive: additionDetails.isActive,
    activeStatus: additionDetails.activeStatus,
    betLimit: additionDetails?.betLimit
  };
}

function formateSession(session) {
  return {
    SelectionId: session.sid?.toString(),
    RunnerName: session.nat,
    ex: {
      availableToBack: session.odds?.filter(odd => odd.otype === 'back').map(odd => ({
        price: odd.odds,
        size: odd.size,
        otype: odd.otype,
        oname: odd.oname,
        tno: odd.tno
      })),
      availableToLay: session.odds?.filter(odd => odd.otype !== 'back').map(odd => ({
        price: odd.odds,
        size: odd.size,
        otype: odd.otype,
        oname: odd.oname,
        tno: odd.tno
      }))
    },
    GameStatus: session.gstatus,
    rem: session.rem,
  };
}

function formateSessionMarket(key, customObject, sessionAPIObj) {
  let result = customObject[key];
  let expertSession = [], onlyLiveSession = [], addedSession = [];
  let sessionAPI = sessionAPIObj[key];
  if (result) {
    result.section?.map(session => {
      let sessionObj = formateSession(session);
      let sessionIndex = sessionAPI?.findIndex(obj => obj.selectionId == sessionObj.SelectionId);
      if (sessionIndex > -1) {
        sessionObj["id"] = sessionAPI[sessionIndex].id; // liveSession[session.SelectionId];
        sessionObj["activeStatus"] = sessionAPI[sessionIndex].activeStatus;
        sessionObj["min"] = sessionAPI[sessionIndex].minBet;
        sessionObj["max"] = sessionAPI[sessionIndex].maxBet;
        sessionObj["createdAt"] = sessionAPI[sessionIndex].createdAt;
        sessionObj["updatedAt"] = sessionAPI[sessionIndex].updatedAt;
        sessionObj["exposureLimit"] = sessionAPI[sessionIndex].exposureLimit;
        sessionObj["isCommissionActive"] = sessionAPI[sessionIndex].isCommissionActive;
        if (sessionObj["activeStatus"] == 'live') {
          onlyLiveSession.push(sessionObj);
        }
        addedSession.push(sessionObj.SelectionId);
      }
      expertSession.push(sessionObj);
    });
  }
  sessionAPI?.map(session => {
    if (!addedSession.includes(session.selectionId)) {
      let obj = {};
      if (session.isManual) {
        session.nat = session.name;
        session.gstatus = session.status;
        session.odds = [{
          odds: session.yesRate,
          size: session.yesPercent,
          otype: "back",
          oname: "back1",
          tno: 0
        }, {
          odds: session.noRate,
          size: session.noPercent,
          otype: "lay",
          oname: "lay1",
          tno: 0
        }];
        obj = formateSession(session);
      }
      obj["SelectionId"] = session.selectionId;
      obj["RunnerName"] = session.name;
      obj["min"] = session.minBet;
      obj["max"] = session.maxBet;
      obj["id"] = session.id
      obj["activeStatus"] = session.activeStatus;
      obj["createdAt"] = session.createdAt;
      obj["updatedAt"] = session.updatedAt;
      obj["exposureLimit"] = session.exposureLimit;
      obj["isCommissionActive"] = session.isCommissionActive;
      if (obj["activeStatus"] == 'live') {
        onlyLiveSession.push(obj);
      }
      expertSession.push(obj);
    }
  });

  returnResult1 = {
    "mname": result?.mname,
    "rem": result?.rem,
    "mid": result?.mid,
    "gtype": result?.gtype || sessionAPI?.[0]?.gtype,
    "status": result?.status,
    "section": onlyLiveSession
  };
  expertResult1 = {
    "mname": result?.mname,
    "rem": result?.rem,
    "mid": result?.mid,
    "gtype": result?.gtype || sessionAPI?.[0]?.gtype,
    "status": result?.status,
    "section": expertSession
  };
  return { expertResult1, returnResult1 };
}