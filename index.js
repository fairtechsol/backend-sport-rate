const express = require('express'); // using express
const socketIO = require('socket.io');
const Redis = require('ioredis');
const http = require('http')
var cors = require('cors');
var LocalStorage = require('node-localstorage').LocalStorage;
const cron = require('node-cron');
const { match } = require('assert');
const path = require('path');

let app = express();
let server = http.createServer(app)
app.use(cors());


require("dotenv").config();
const ThirdPartyController = require('./thirdPartyController');
let io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})
app.set('socketio', io);
localStorage = new LocalStorage('./scratch');


if (process.env.NODE_ENV !== 'production') {
  __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, "public")));
}

const port = process.env.port ? parseInt(process.env.port) : 3200 // setting the port
let liveScoreTimer = process.env.liveScoreTimer ? parseInt(process.env.liveScoreTimer) : 30000;
let getRateTimer = process.env.getRateTimer ? parseInt(process.env.getRateTimer) : 300;
let liveGameTypeTime = process.env.liveGameTypeTime ? parseInt(process.env.liveGameTypeTime) : 1000;

const internalRedis = new Redis({
  host: process.env.INTERNAL_REDIS_HOST || 'localhost',
  port: process.env.INTERNAL_REDIS_PORT || 6379,
  password: process.env.INTERNAL_REDIS_PASSWORD || ''
});
// Listen for the 'connect' event
internalRedis.on('connect', async () => {
  console.log('Connected to Internal Redis server');
});
// Handle other Redis events if needed
internalRedis.on('error', (error) => {
  console.error('Error:', error);
});

app.get("/", (req, res) => {
  return res.send("call the api");
});

let IntervalIds = [];
let matchIntervalIds = {};
let liveGameObject = {}

const gameType = {
  football: 1,
  tennis: 2,
  golf: 3,
  cricket: 4,
  boxing: 6
}
const eventUrl = {
  football: "under_over_goal_market_list",
  cricket: "cricket_extra_market_list"
}

const liveGameType = {
  teen8: "teen8",
  teen20: "teen20",
  Teen: "Teen",
}

app.get("/matchList", (req, res) => {
  let type = req.query.type;
  let typeId = gameType[type];
  ThirdPartyController.getMatchList(typeId).then(function (data) {
    return res.send(data);
  });
});

app.get("/competitionList", (req, res) => {
  let type = req.query.type;
  let typeId = gameType[type];
  ThirdPartyController.getCompetitionList(typeId).then(function (data) {
    return res.send(data);
  });
});

app.get("/eventList/:competitionId", (req, res) => {
  let competitionId = req.params.competitionId
  ThirdPartyController.getEventList(competitionId).then(function (data) {
    return res.send(data);
  });
});

app.get("/matchOdds/:marketId", (req, res) => {
  let markertId = req.params.marketId;
  ThirdPartyController.getMatchOdds(markertId).then(function (data) {
    if (data && data[0]) {
      return res.send(data[0].runners);
    }
    return res.send(data);
  });
});

app.get("/bookmaker/:marketId", (req, res) => {
  let markertId = req.params.marketId;
  ThirdPartyController.getBookmakerMarket(markertId).then(function (data) {
    if (data && data[0]) {
      return res.send(data[0].runners);
    }
    return res.send(null);
  });
});

app.get("/session/:marketId", (req, res) => {
  let markertId = req.params.marketId;
  ThirdPartyController.getSessions(markertId).then(function (data) {
    return res.send(data);
  });
});

app.get("/extraMarketList/:eventId", (req, res) => {
  let eventId = req.params.eventId;
  let eventType = req.query?.eventType;
  eventType = eventUrl[eventType] ? eventUrl[eventType] : eventUrl.cricket;
  ThirdPartyController.getExtraEventList(eventId, eventType).then(function (data) {
    return res.send(data);
  });
});

app.get("/matchOddsNew/:marketId", (req, res) => {
  let markertId = req.params.marketId;
  ThirdPartyController.getMatchOdds(markertId).then(function (data) {
    return res.send(data);
  });
});

app.get("/bookmakerNew/:marketId", (req, res) => {
  let markertId = req.params.marketId;
  ThirdPartyController.getBookmakerMarket(markertId).then(function (data) {
    return res.send(null);
  });
});

app.get("/getDirectMatchList", (req, res) => {
  let type = req.query.type;
  let typeId = gameType[type];
  ThirdPartyController.getDirectMatchList(typeId).then(function (data) {
    return res.send(data);
  });
});

io.on('connection', (socket) => {
  socket.on('score', function (event) {
    let eventId = event.id;
    socket.join(eventId);
  });

  socket.on('leaveScore', function (event) {
    let eventId = event.id;
    socket.leave(eventId);
    const roomHasUsers = io.sockets.adapter.rooms.has(eventId);
    if (!roomHasUsers) {
      clearLiveScoreInterval(eventId);
    }
  });

  socket.on('initLiveData', function (event) {
    let liveGameTypeId = liveGameType[event.liveGameTypeId];
    if (liveGameTypeId) {
      socket.join(liveGameTypeId);

      if (!liveGameObject[liveGameTypeId]) {
        liveGameObject[liveGameTypeId] = true;
        liveGameObject[liveGameTypeId + 'Interval'] = setInterval(getLiveGameData, liveGameTypeTime, liveGameTypeId);
      }
    }
  });

  socket.on("disconnectLiveGame", (event) => {
    let liveGameTypeId = liveGameType[event.liveGameTypeId];
    if (liveGameTypeId) {
      socket.leave(liveGameTypeId);
      const room = io.sockets.adapter.rooms.get(liveGameTypeId);
      try {
        if (!(room && room.size != 0)) {
          liveGameObject[liveGameTypeId] = false;
          clearInterval(liveGameObject[liveGameTypeId + 'Interval']);
          io.of('/').adapter.del(liveGameTypeId);
        }
      } catch (error) {
        console.log("error st disconnect live game ", error);
      }
    }
  });

  socket.on('initCricketData', async function (event) {

    let matchId = event.matchId;
    let roleName = event.roleName;
    if (roleName == 'expert') {
      socket.join(matchId + 'expert');
    } else {
      socket.join(matchId);
    }
    let matchDetail = await internalRedis.hgetall(matchId + "_match");
    let matchIds = localStorage.getItem("matchDBds") ? JSON.parse(localStorage.getItem("matchDBds")) : null;
    if (!matchIntervalIds[matchId]) {
      let marketId = matchDetail?.marketId;
      if (marketId) {
        if (matchIds == null) {
          matchIds = [];
        }
        matchIntervalIds[matchId] = setInterval(getCricketData, liveGameTypeTime, marketId, matchId);
        matchIds.push(matchId);
        localStorage.setItem("matchDBds", JSON.stringify(matchIds));
      }
    }
  });

  socket.on('disconnectCricketData', async function (event) {
    let matchId = event.matchId;
    let roleName = event.roleName;
    let roomName = '';
    if (roleName == 'expert') {
      roomName = matchId + 'expert';
    } else {
      roomName = matchId;
    }
    socket.leave(roomName);
    const room = io.sockets.adapter.rooms.get(matchId);
    try {
      if (!(room && room.size != 0)) {
        clearInterval(matchIntervalIds[matchId]);
        delete matchIntervalIds[matchId];
        let matchIds = localStorage.getItem("matchDBds") ? JSON.parse(localStorage.getItem("matchDBds")) : null;
        if (matchIds) {
          matchIds.splice(matchIds.indexOf(matchId), 1);
          localStorage.setItem("matchDBds", JSON.stringify(matchIds));
        }
      }
    } catch (error) {
      console.log("error at disconnectCricketData ", error);
    }
  });

  socket.on('disconnect', async () => {
    socket.leaveAll();
  });

  socket.on("leaveAllRoom", () => {
    socket.leaveAll();
  });

});

async function getCricketData(marketId, matchId) {
  let matchDetail = await internalRedis.hgetall(matchId + "_match");
  let returnResult = {};
  let expertResult = {};
  returnResult.id = matchId;
  returnResult.marketId = marketId;
  expertResult.id = matchId;
  expertResult.marketId = marketId;
  if (matchDetail.matchType == 'football') {
    await getFootBallData(matchDetail, returnResult, expertResult);
    io.to(matchId).emit("liveData" + matchId, returnResult);
    io.to(matchId + 'expert').emit("liveData" + matchId, expertResult);
    return;
  }
  let isAPISessionActive = matchDetail.apiSessionActive ? JSON.parse(matchDetail.apiSessionActive) : false;
  let isManualSessionActive = matchDetail.manualSessionActive ? JSON.parse(matchDetail.manualSessionActive) : false;
  let ismatchOddActive = matchDetail.matchOdd ? (JSON.parse(matchDetail.matchOdd)).isActive : false;
  let ismarketCompleteMatchActive = matchDetail.marketCompleteMatch ? (JSON.parse(matchDetail.marketCompleteMatch)).isActive : false;
  let ismarketBookmakerActive = matchDetail.marketBookmaker ? (JSON.parse(matchDetail.marketBookmaker)).isActive : false;
  let ismarketTiedMatchActive = matchDetail.marketTiedMatch ? (JSON.parse(matchDetail.marketTiedMatch)).isActive : false;

  let promiseRequestArray = []
  let oddIds = [];
  let index = 0;
  let sessionAPI = [], sessionManual = []

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
      if(result){
        result?.map(session => {
          let sessionIndex = sessionAPI.findIndex(obj => obj.selectionId == session.SelectionId);
          if (sessionIndex > -1) {
            session["id"] = sessionAPI[sessionIndex].id // liveSession[session.SelectionId];
            session["activeStatus"] = sessionAPI[sessionIndex].activeStatus;
            session["min"] = sessionAPI[sessionIndex].minBet,
              session["max"] = sessionAPI[sessionIndex].maxBet,
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
          }
          expertSession.push(obj);
          onlyLiveSession.push(obj);
        }
      })
      returnResult.apiSession = onlyLiveSession;
      expertResult.apiSession = expertSession;
      index++;
    }
  }

  let redisPromise = []
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
    returnResult.quickbookmaker = []
    if (manuallyMatchDetails.tiedMatch2) {
      let json = JSON.parse(manuallyMatchDetails.tiedMatch2);
      if (json.isActive) {
        returnResult["manualTideMatch"] = json;
      }
    }
    if (manuallyMatchDetails.quickbookmaker1) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker1);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.quickbookmaker2) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker2);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.quickbookmaker3) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker3);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.completeManual) {
      let json = JSON.parse(manuallyMatchDetails.completeManual);
      if (json.isActive) {
        returnResult["completeManual"] = json;
      }
    }
  }

  io.to(matchId).emit("liveData" + matchId, returnResult);
  io.to(matchId + 'expert').emit("liveData" + matchId, expertResult);
}

async function getFootBallData(matchDetail, returnResult, expertResult) {
  let liveIds = [], matchId = matchDetail.id;
  let promiseRequestArray = [];
  let typeIdObject = {}  // it will store the marketId as key and key as value so find id, min, max and other
  let firstHalfGoldLive = Object.keys(matchDetail).filter(key => key.startsWith("firstHalfGoal"));
  returnResult["firstHalfGoal"] = [];
  expertResult["firstHalfGoal"] = [];
  firstHalfGoldLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  })

  let halfTimeLive = Object.keys(matchDetail).filter(key => key.startsWith("halfTime"));
  returnResult["halfTime"] = [];
  expertResult["halfTime"] = [];
  halfTimeLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  })

  let matchOddLive = Object.keys(matchDetail).filter(key => key.startsWith("matchOdd"));
  matchOddLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  })

  let overUnderLive = Object.keys(matchDetail).filter(key => key.startsWith("overUnder"));
  returnResult["overUnder"] = [];
  expertResult["overUnder"] = [];
  overUnderLive.map(key => {
    let value = matchDetail[key];
    value = JSON.parse(value);
    let isLive = value.isActive;
    liveIds.push(value.marketId);
    typeIdObject[value.marketId] = key;
  })

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
  if(results){
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

      if(key.startsWith("firstHalfGoal")){
        expertResult["firstHalfGoal"].push(result);
        if (result.isActive) {
          returnResult["firstHalfGoal"].push(result);
        }
      } else
      if(key.startsWith("overUnder")){
        expertResult["overUnder"].push(result);
        if (result.isActive) {
          returnResult["overUnder"].push(result);
        }
      } else
      {
        expertResult[value.type] = result;
        if (result.isActive) {
          returnResult[value.type] = result
        }
      }
    });
  }

  let redisPromise = []
  redisPromise.push(internalRedis.hgetall(matchId + "_manualBetting"));

  let manuallyResponse = await Promise.allSettled(redisPromise);
  let manuallyMatchDetails = manuallyResponse[0].value;

  if (manuallyMatchDetails) {
    returnResult.quickbookmaker = []
    if (manuallyMatchDetails.quickbookmaker1) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker1);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.quickbookmaker2) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker2);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
      }
    }
    if (manuallyMatchDetails.quickbookmaker3) {
      let json = JSON.parse(manuallyMatchDetails.quickbookmaker3);
      if (json.isActive) {
        returnResult.quickbookmaker.push(json);
      }
    }
  }

}

function ClearAllSocketRoom() {
  const rooms = io.of('/').adapter.rooms;
  for (const [roomId, room] of rooms) {
    room.forEach((socketId) => {
      io.sockets.sockets.get(socketId).leave(room);
    });
    io.of('/').adapter.rooms.delete(room);
  }
}

function clearLiveScoreInterval(eventId) {
  if (eventId) {
    clearInterval(IntervalIds[eventId]);
    let eventIds = JSON.parse(localStorage.getItem("eventIds"));
    eventIds.splice(eventIds.indexOf(eventId), 1);
    localStorage.setItem("eventIds", JSON.stringify(eventIds));
  }
}

async function getLiveGameData(gameType) {
  let result = await ThirdPartyController.getLiveGameData(gameType);
  io.to(gameType).emit("liveGameData" + gameType, result);
  let data = result.data;
  if (data && data.t1 && data.t1[0]) {
    let mid = 0;
    try {
      mid = parseFloat(data.t1[0].mid);
    } catch {
    }
    if (mid <= 0) {
      let result = await ThirdPartyController.getliveGameResultTop10(gameType);
      io.to(gameType).emit("liveGameResultTop10" + gameType, result);
    }
  }
}

server.listen(port, () => {
  console.log(`Betting app listening at Port:${port}`)

  let matchDBds = localStorage.getItem("matchDBds") ? JSON.parse(localStorage.getItem("matchDBds")) : null;
  if (matchDBds && matchDBds.length) {
    matchDBds.map(async matchId => {
      let matchDetail = await internalRedis.hgetall(matchId + "_match");
      let marketId = matchDetail?.marketId;
      if (marketId) {
        matchIntervalIds[matchId] = setInterval(getCricketData, liveGameTypeTime, marketId, matchId);
      }
    })
  }

});
