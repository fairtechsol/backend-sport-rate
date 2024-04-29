const ThirdPartyController = require('./thirdPartyController.js');
const { internalRedis, io } = require('./index.js');


async function getCricketData(marketId, matchId) {
  let matchDetail = await internalRedis.hgetall(matchId + "_match");
  let returnResult = {};
  let expertResult = {};
  returnResult.id = matchId;
  returnResult.marketId = marketId;
  expertResult.id = matchId;
  expertResult.marketId = marketId;

  let isAPISessionActive = matchDetail.apiSessionActive ? JSON.parse(matchDetail.apiSessionActive) : false;
  let isManualSessionActive = matchDetail.manualSessionActive ? JSON.parse(matchDetail.manualSessionActive) : false;
  let ismatchOddActive = matchDetail.matchOdd ? (JSON.parse(matchDetail.matchOdd)).isActive : false;
  let ismarketCompleteMatchActive = matchDetail.marketCompleteMatch ? (JSON.parse(matchDetail.marketCompleteMatch)).isActive : false;
  let ismarketBookmakerActive = matchDetail.marketBookmaker ? (JSON.parse(matchDetail.marketBookmaker)).isActive : false;
  let ismarketTiedMatchActive = matchDetail.marketTiedMatch ? (JSON.parse(matchDetail.marketTiedMatch)).isActive : false;

  let promiseRequestArray = [];
  let oddIds = [];
  let index = 0;
  let sessionAPI = [], sessionManual = [];

  let isManual = marketId?.split(/(\d+)/)[0] == 'manual';
  if (!isManual) {
    //  do not change the sequence of if conditions
    if (ismatchOddActive) {
      oddIds.push(marketId);
      // promiseRequestArray.push(ThirdPartyController.getMatchOdds_old(marketId));
    }
    if (ismarketCompleteMatchActive) {
      oddIds.push((JSON.parse(matchDetail.marketCompleteMatch)).marketId);
    }
    if (ismarketTiedMatchActive) {
      oddIds.push((JSON.parse(matchDetail.marketTiedMatch)).marketId);
    }
    if (oddIds.length) {
      promiseRequestArray.push(ThirdPartyController.getMatchOdds(oddIds.join(',')));
    }

    if (ismarketBookmakerActive) {
      promiseRequestArray.push(ThirdPartyController.getBookmakerMarket(marketId));
    }
    if (isAPISessionActive) {
      promiseRequestArray.push(ThirdPartyController.getSessions(marketId));
    }
    // Wait for all requests to complete using Promise.all
    let respo = await Promise.allSettled(promiseRequestArray);

    if (oddIds.length) {
      let ind = 0;
      let result = respo[index]?.value;
      if (ismatchOddActive) {
        let matchOddDetails = JSON.parse(matchDetail.matchOdd);
        let obj = result?.length && result[ind] ? result[ind] : {};
        obj.id = matchOddDetails.id;
        obj.name = matchOddDetails.name;
        obj.minBet = matchOddDetails.minBet;
        obj.maxBet = matchOddDetails.maxBet;
        obj.type = matchOddDetails.type;
        obj.isActive = matchOddDetails.isActive;
        obj.activeStatus = matchOddDetails.activeStatus;
        returnResult.matchOdd = obj;
        expertResult.matchOdd = obj;
        ind++;
      }
      if (ismarketCompleteMatchActive) {
        let marketCompleteMatch = JSON.parse(matchDetail.marketCompleteMatch);
        let obj = result?.length && result[ind] ? result[ind] : {};
        obj.id = marketCompleteMatch.id;
        obj.name = marketCompleteMatch.name;
        obj.minBet = marketCompleteMatch.minBet;
        obj.maxBet = marketCompleteMatch.maxBet;
        obj.type = marketCompleteMatch.type;
        obj.isActive = marketCompleteMatch.isActive;
        obj.activeStatus = marketCompleteMatch.activeStatus;
        returnResult.marketCompleteMatch = obj;
        expertResult.marketCompleteMatch = obj;
        ind++;
      }
      if (ismarketTiedMatchActive) {
        let marketTiedMatch = JSON.parse(matchDetail.marketTiedMatch);
        let obj = result?.length && result[ind] ? result[ind] : {};
        obj.id = marketTiedMatch.id;
        obj.name = marketTiedMatch.name;
        obj.minBet = marketTiedMatch.minBet;
        obj.maxBet = marketTiedMatch.maxBet;
        obj.type = marketTiedMatch.type;
        obj.isActive = marketTiedMatch.isActive;
        obj.activeStatus = marketTiedMatch.activeStatus;
        returnResult.apiTiedMatch = obj;
        expertResult.apiTiedMatch = obj;
        ind++;
      }
      index++;
    }

    if (ismarketBookmakerActive) {
      let result = respo[index].value;
      let marketBookmaker = JSON.parse(matchDetail.marketBookmaker);
      let obj = result?.length && result[0] ? result[0] : {};
      obj.id = marketBookmaker.id;
      obj.name = marketBookmaker.name;
      obj.minBet = marketBookmaker.minBet;
      obj.maxBet = marketBookmaker.maxBet;
      obj.type = marketBookmaker.type;
      obj.isActive = marketBookmaker.isActive;
      obj.activeStatus = marketBookmaker.activeStatus;
      returnResult.bookmaker = obj;
      expertResult.bookmaker = obj;
      index++;
    }

    if (isAPISessionActive || isManualSessionActive) {
      let sessionData = await internalRedis.hgetall(matchId + "_session");
      sessionData = sessionData ? Object.values(sessionData) : [];
      sessionData.map(sessionString => {
        if ((JSON.parse(sessionString).isManual)) {
          sessionManual.push(sessionString);
        } else {
          sessionAPI.push(JSON.parse(sessionString));
        }
      });

    }
    if (isAPISessionActive) {
      let result = respo[index].value;
      let expertSession = [];
      let onlyLiveSession = [], selectionArray = [];
      if (result) {
        result?.map(session => {
          let sessionIndex = sessionAPI.findIndex(obj => obj.selectionId == session.SelectionId);
          if (sessionIndex > -1) {
            session["id"] = sessionAPI[sessionIndex].id; // liveSession[session.SelectionId];
            session["activeStatus"] = sessionAPI[sessionIndex].activeStatus;
            session["min"] = sessionAPI[sessionIndex].minBet,
            session["max"] = sessionAPI[sessionIndex].maxBet,
            session["createdAt"] = sessionAPI[sessionIndex].createdAt,
            session["updatedAt"] = sessionAPI[sessionIndex].updatedAt
            onlyLiveSession.push(session);
            selectionArray.push(session.SelectionId);
          }
          expertSession.push(session);
        });
      }

      sessionAPI.map(session => {
        if (!selectionArray.includes(session.selectionId)) {
          let obj = {
            "SelectionId": session.selectionId,
            "RunnerName": session.name,
            "min": session.minBet,
            "max": session.maxBet,
            "id": session.id,
            "activeStatus": session.activeStatus
          };
          expertSession.push(obj);
          onlyLiveSession.push(obj);
        }
      });
      returnResult.apiSession = onlyLiveSession;
      expertResult.apiSession = expertSession;
      index++;
    }
  }

  let redisPromise = [];
  redisPromise.push(internalRedis.hgetall(matchId + "_manualBetting"));
  // if (isManualSessionActive) {
  //   redisPromise.push(internalRedis.hgetall(matchId + "_session"));
  // }
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
  let firstHalfGoldLive = Object.keys(matchDetail).filter(key => key.startsWith("firstHalfGoal"));
  returnResult["firstHalfGoal"] = [];
  expertResult["firstHalfGoal"] = [];
  firstHalfGoldLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  });

  let halfTimeLive = Object.keys(matchDetail).filter(key => key.startsWith("halfTime"));
  returnResult["halfTime"] = [];
  expertResult["halfTime"] = [];
  halfTimeLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  });

  let matchOddLive = Object.keys(matchDetail).filter(key => key.startsWith("matchOdd"));
  matchOddLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  });

  let overUnderLive = Object.keys(matchDetail).filter(key => key.startsWith("overUnder"));
  returnResult["overUnder"] = [];
  expertResult["overUnder"] = [];
  overUnderLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  });

  if (liveIds.length) {
    promiseRequestArray.push(ThirdPartyController.getMatchOdds(liveIds.join(',')));
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

      if (key.startsWith("firstHalfGoal")) {
        expertResult["firstHalfGoal"].push(result);
        if (result.isActive) {
          returnResult["firstHalfGoal"].push(result);
        }
      }
      else if (key.startsWith("overUnder")) {
        expertResult["overUnder"].push(result);
        if (result.isActive) {
          returnResult["overUnder"].push(result);
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
exports.getFootBallData = getFootBallData;

async function getTennisData(marketId, matchId) {
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
  matchOddLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  });

  let firstHalfGoldLive = Object.keys(matchDetail).filter(key => key.startsWith("setWinner"));
  returnResult["setWinner"] = [];
  expertResult["setWinner"] = [];
  firstHalfGoldLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  });

  if (liveIds.length) {
    promiseRequestArray.push(ThirdPartyController.getMatchOdds(liveIds.join(',')));
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
