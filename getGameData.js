const ThirdPartyController = require('./thirdPartyController.js');
const { internalRedis, io, CheckAndClearInterval } = require('./index.js');


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
    let data = await ThirdPartyController.getAllRateCricket(matchDetail.eventId, 2);

    let mainData = data?.data || [];

    let customObject = { other: [] };

    if (!matchDetail?.teamB) {
      customObject.tournament = [];
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
          case "match_odds":
            customObject.matchOdd = da;
            break;
          case "tied_match":
            customObject.apiTiedMatch = da;
            break;
          case "tied match":
            customObject.apiTiedMatch2 = da;
            break;
          case "bookmaker":
            if (customObject.bookmaker) {
              customObject.bookmaker2 = da;
            } else {
              customObject.bookmaker = da;
            }
            break;
          case "bookmaker 2":
            customObject.bookmaker2 = da;
            break;
          case "completed_match":
            customObject.marketCompleteMatch = da;
            break;
          case "completed match":
            customObject.marketCompleteMatch1 = da;
            break;
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
              if (da.gtype == 'match1') customObject.other.push(da);
            }
            break;
        }
      });
    }
    if (matchDetail.matchOdd || customObject.matchOdd) {
      let parseData = JSON.parse(matchDetail.matchOdd || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "matchOdd",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.matchOdd = await formateOdds(customObject.matchOdd, obj);
      if (parseData.isActive) {
        returnResult.matchOdd = expertResult.matchOdd;
      }
    }

    if (matchDetail.marketCompleteMatch || customObject.marketCompleteMatch) {
      let parseData = JSON.parse(matchDetail.marketCompleteMatch || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "completeMatch",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.marketCompleteMatch = await formateOdds(customObject.marketCompleteMatch, obj);
      if (parseData.isActive) {
        returnResult.marketCompleteMatch = expertResult.marketCompleteMatch;
      }
    }

    if (matchDetail.marketCompleteMatch1 || customObject.marketCompleteMatch1) {
      let parseData = JSON.parse(matchDetail.marketCompleteMatch1 || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "completeMatch1",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.marketCompleteMatch1 = await formateOdds(customObject.marketCompleteMatch1, obj);
      if (parseData.isActive) {
        returnResult.marketCompleteMatch1 = expertResult.marketCompleteMatch1;
      }
    }

    if (matchDetail.marketTiedMatch || customObject.apiTiedMatch) {
      let parseData = JSON.parse(matchDetail.marketTiedMatch || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "tiedMatch1",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.apiTiedMatch = await formateOdds(customObject.apiTiedMatch, obj);
      if (parseData.isActive) {
        returnResult.apiTiedMatch = expertResult.apiTiedMatch;
      }
    }

    if (matchDetail.marketTiedMatch2 || customObject.apiTiedMatch2) {
      let parseData = JSON.parse(matchDetail.marketTiedMatch2 || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "tiedMatch3",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.apiTiedMatch2 = await formateOdds(customObject.apiTiedMatch2, obj);
      if (parseData.isActive) {
        returnResult.apiTiedMatch2 = expertResult.apiTiedMatch2;
      }
    }

    if (matchDetail.marketBookmaker || customObject.bookmaker) {
      let parseData = JSON.parse(matchDetail.marketBookmaker || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "bookmaker",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.bookmaker = await formateOdds(customObject.bookmaker, obj);
      if (parseData.isActive) {
        returnResult.bookmaker = expertResult.bookmaker;
      }
    }

    if (matchDetail.marketBookmaker2 || customObject.bookmaker2) {
      let parseData = JSON.parse(matchDetail.marketBookmaker2 || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "bookmaker2",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.bookmaker2 = await formateOdds(customObject.bookmaker2, obj);
      if (parseData.isActive) {
        returnResult.bookmaker2 = expertResult.bookmaker2;
      }
    }

    if (matchDetail.other || customObject.other) {
      expertResult.other = [];
      returnResult.other = [];
      let iterated = [];
      let otherData = JSON.parse(matchDetail.other || "[]");
      for (let item of customObject.other) {
        let isRedisExist = otherData?.findIndex(it => it?.name == item?.mname);
        let obj = {};
        if (isRedisExist > -1) {
          iterated.push(item?.mname);
          let parseData = otherData[isRedisExist];
          obj = {
            "id": parseData.id,
            "marketId": marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            gtype: parseData.gtype,
            betLimit: parseData.betLimit
          };
        }
        let formateData = await formateOdds(item, obj);
        expertResult.other.push(formateData);
        if (obj.isActive) {
          returnResult.other.push(formateData);
        }
      }
      for (let item of otherData) {
        let isRedisExist = iterated?.findIndex(it => it == item?.name);
        let obj = {};
        if (isRedisExist < 0) {
          let parseData = item;
          obj = {
            "id": parseData.id,
            "marketId": marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            "runners": [{ "nat": parseData?.metaData?.teamA }, { "nat": parseData?.metaData?.teamB }],
            gtype: parseData.gtype,
            betLimit: parseData.betLimit
          };
          let formateData = await formateOdds(null, obj);
          expertResult.other.push(formateData);
          if (obj.isActive) {
            returnResult.other.push(formateData);
          }
        }
      }
    }

    if (matchDetail.tournament || customObject.tournament) {
      expertResult.tournament = [];
      returnResult.tournament = [];
      let iterated = [];
      let otherData = JSON.parse(matchDetail.tournament || "[]");
      for (let item of (customObject?.tournament || [])) {
        let isRedisExist = otherData.findIndex(it => it?.name == item?.mname);
        let obj = {};
        if (isRedisExist > -1) {
          iterated.push(item?.mname);
          let parseData = otherData[isRedisExist];
          obj = {
            "id": parseData.id,
            "marketId": marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            dbRunner: parseData?.runners,
            gtype: parseData.gtype,
            betLimit: parseData.betLimit
          };
        }
        let formateData = await formateOdds(item, obj);
        expertResult.tournament.push(formateData);
        if (obj.isActive) {
          returnResult.tournament.push(formateData);
        }
      }
      for (let item of otherData) {
        let isRedisExist = iterated?.findIndex(it => it == item?.name);
        let obj = {};
        if (isRedisExist < 0) {
          let parseData = item;
          obj = {
            "id": parseData.id,
            "marketId": marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            "runners": parseData.runners?.map(run => {
              return { "nat": run?.runnerName, id: run?.id, selectionId: run.selectionId }
            }),
            gtype: parseData.gtype,
            betLimit: parseData.betLimit
          };
          let formateData = await formateOdds(null, obj);
          expertResult.tournament.push(formateData);
          if (obj.isActive) {
            returnResult.tournament.push(formateData);
          }
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
              "updatedAt": session.updatedAt
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
    returnResult.sessionBettings = sessionManual;
    // returnResult.sessionBettings = Object.values(result);
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

  let liveIds = [];
  let promiseRequestArray = [];
  let typeIdObject = {}; // it will store the marketId as key and key as value so find id, min, max and other

  let isManual = marketId?.split(/(\d+)/)[0] == 'manual';
  if (!isManual) {
    let data = await ThirdPartyController.getAllRateFootBallTennis(matchDetail.eventId, 3);
    let mainData = data?.data || [];
    let customObject = { other: [] };

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
        const mname = da.mname.toLowerCase();
        switch (mname) {
          case "match_odds":
            customObject.matchOdd = da;
            break;
          case "bookmaker":
            if (customObject.bookmaker) {
              customObject.bookmaker2 = da;
            } else {
              customObject.bookmaker = da;
            }
            break;
          case "bookmaker 2":
            customObject.bookmaker2 = da;
            break;
          default:
            customObject.tournament.push(da);
            break;
        }
      });
    }


    if (matchDetail.matchOdd || customObject.matchOdd) {
      let parseData = JSON.parse(matchDetail.matchOdd || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "matchOdd",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.matchOdd = await formateOdds(customObject.matchOdd, obj);
      if (parseData.isActive) {
        returnResult.matchOdd = expertResult.matchOdd;
      }
    }
    if (matchDetail.marketBookmaker || customObject.bookmaker) {
      let parseData = JSON.parse(matchDetail.marketBookmaker || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "bookmaker",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.bookmaker = await formateOdds(customObject.bookmaker, obj);
      if (parseData.isActive) {
        returnResult.bookmaker = expertResult.bookmaker;
      }
    }

    if (matchDetail.marketBookmaker2 || customObject.bookmaker2) {
      let parseData = JSON.parse(matchDetail.marketBookmaker2 || "{}");
      let obj = {
        "id": parseData.id,
        "marketId": marketId,
        "name": parseData.name,
        "minBet": parseData.minBet,
        "maxBet": parseData.maxBet,
        "type": parseData.type || "bookmaker2",
        "isActive": parseData.isActive,
        "activeStatus": parseData.activeStatus,
        gtype: parseData.gtype,
        betLimit: parseData.betLimit
      };
      expertResult.bookmaker2 = await formateOdds(customObject.bookmaker2, obj);
      if (parseData.isActive) {
        returnResult.bookmaker2 = expertResult.bookmaker2;
      }
    }

    if (matchDetail.tournament || customObject.tournament) {
      expertResult.tournament = [];
      returnResult.tournament = [];
      let iterated = [];
      let otherData = JSON.parse(matchDetail.tournament || "[]");
      for (let item of (customObject?.tournament || [])) {
        let isRedisExist = otherData.findIndex(it => it?.name == item?.mname);
        let obj = {};
        if (isRedisExist > -1) {
          iterated.push(item?.mname);
          let parseData = otherData[isRedisExist];
          obj = {
            "id": parseData.id,
            "marketId": marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            dbRunner: parseData?.runners,
            gtype: parseData.gtype,
            betLimit: parseData.betLimit
          };
        }
        let formateData = await formateOdds(item, obj);
        expertResult.tournament.push(formateData);
        if (obj.isActive) {
          returnResult.tournament.push(formateData);
        }
      }
      for (let item of otherData) {
        let isRedisExist = iterated?.findIndex(it => it == item?.name);
        let obj = {};
        if (isRedisExist < 0) {
          let parseData = item;
          obj = {
            "id": parseData.id,
            "marketId": marketId,
            "name": parseData.name,
            "minBet": parseData.minBet,
            "maxBet": parseData.maxBet,
            "type": parseData.type,
            "isActive": parseData.isActive,
            "activeStatus": parseData.activeStatus,
            "runners": parseData.runners?.map(run => {
              return { "nat": run?.runnerName, id: run?.id, selectionId: run.selectionId }
            }),
            gtype: parseData.gtype,
            betLimit: parseData.betLimit
          };
          let formateData = await formateOdds(null, obj);
          expertResult.tournament.push(formateData);
          if (obj.isActive) {
            returnResult.tournament.push(formateData);
          }
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

async function getTennisData(marketId, matchId) {

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
    let isLive = value.isActive;
    if (!value?.stopAt && isLive) {
      liveIds.push(value.marketId);
      typeIdObject[value.marketId] = key;
    }
    else {
      expertResult["matchOdd"] = value;

    }
  });

  let firstHalfGoldLive = Object.keys(matchDetail).filter(key => key.startsWith("setWinner"));
  returnResult["setWinner"] = [];
  expertResult["setWinner"] = [];
  firstHalfGoldLive.forEach(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    if (!value?.stopAt && isLive) {
      liveIds.push(value.marketId);
      typeIdObject[value.marketId] = key;
    }
    else {
      expertResult["setWinner"].push(value);
    }
  });

  if (liveIds.length) {
    let matchOddDetails = JSON.parse(matchDetail.matchOdd);
    promiseRequestArray.push(ThirdPartyController.getMatchOdds(liveIds.join(','), matchOddDetails?.apiType));
  }
  let ismarketBookmakerActive = matchDetail.marketBookmaker ? (JSON.parse(matchDetail.marketBookmaker)).isActive : false;
  if (ismarketBookmakerActive) {
    promiseRequestArray.push(ThirdPartyController.getBookmakerMarket(matchDetail.marketId));
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

      if (key.startsWith("setWinner")) {
        expertResult["setWinner"].push(result);
        if (result.isActive) {
          returnResult["setWinner"].push(result);
        }
      }
      else {
        expertResult[value.type] = result;
        if (result.isActive) {
          returnResult[value.type] = result;
        }
      }
    });
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
  return;

}
exports.getTennisData = getTennisData;

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
    mid: data?.mid,
    status: data?.status,
    inplay: data?.inplay,
    gtype: additionDetails.gtype || data?.gtype,
    rem: data?.rem,
    runners: data?.section?.map(item => ({
      selectionId: item.sid,
      status: item.gstatus,
      nat: item.nat,
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
    minBet: additionDetails.minBet || data?.min,
    maxBet: additionDetails.maxBet || data?.max,
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
      let obj = {
        "SelectionId": session.selectionId,
        "RunnerName": session.name,
        "min": session.minBet,
        "max": session.maxBet,
        "id": session.id,
        "activeStatus": session.activeStatus,
        "createdAt": session.createdAt,
        "updatedAt": session.updatedAt
      };
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