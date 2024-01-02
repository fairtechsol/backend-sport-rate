const express = require('express'); // using express
const socketIO = require('socket.io');
const Redis = require('ioredis');
const http = require('http')
const port = process.env.port ? parseInt(process.env.port) : 3200 // setting the port
let liveScoreTimer = process.env.liveScoreTimer ? parseInt(process.env.liveScoreTimer) : 30000;
let getRateTimer = process.env.getRateTimer ? parseInt(process.env.getRateTimer) : 300;
let liveGameTypeTime = process.env.liveGameTypeTime ? parseInt(process.env.liveGameTypeTime) : 1000;
let app = express();
let server = http.createServer(app)
const ThirdPartyController = require('./thirdPartyController');
let io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})
var cors = require('cors');
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');
app.set('socketio', io);
app.use(cors());

const cron = require('node-cron');
const { match } = require('assert');

require("dotenv").config();

const internalRedis = new Redis({
  host: process.env.INTERNAL_REDIS_HOST || 'localhost',
  port: process.env.INTERNAL_REDIS_PORT || 6379,
  password: process.env.INTERNAL_REDIS_PASSWORD || ''
});
// Listen for the 'connect' event
internalRedis.on('connect', () => {
  console.log('Connected to Internal Redis server');
});
// Handle other Redis events if needed
internalRedis.on('error', (error) => {
  console.error('Error:', error);
});

// const job = cron.schedule('0 22 * * *', () => {
//   console.log('Running cron job every day ', (new Date()).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
//   let marketIds = JSON.parse(localStorage.getItem("marketIds"));
//   marketIds.map(id => {
//     clearInterval(IntervalIds[id]);
//     localStorage.removeItem(id + "market");
//   })
//   let eventIds = JSON.parse(localStorage.getItem("eventIds"));
//   eventIds.map(id => {
//     clearInterval(IntervalIds[id]);
//     localStorage.removeItem(id + "market");
//   })
//   localStorage.removeItem("marketIds");
//   localStorage.removeItem("market");
//   localStorage.removeItem("eventIds");
//   if (IntervalIds.length) {
//     IntervalIds.forEach(clearInterval);
//   }
//   IntervalIds = [];
//   ClearAllSocketRoom()
// });

// job.start();

app.get("/", (req, res) => {
  res.send("call the api");
});

let IntervalIds = [];

let liveGameObject = {}

const gameType = {
  soccer: 1,
  tennis: 2,
  golf: 3,
  cricket: 4,
  boxing: 6
}

const liveGameType = {
  teen8: "teen8",
  teen20: "teen20",
  Teen: "Teen",
}

app.get("/market/:id", (req, res) => {
  let marketId = req.params.id;
  let marketIds = JSON.parse(localStorage.getItem("marketIds"));
  if (marketIds == null || !marketIds.includes(marketId)) {
    IntervalIds.push(marketId);
    IntervalIds[marketId] = setInterval(getMarketRate, getRateTimer, marketId);
    if (marketIds == null) {
      marketIds = [];
    }
    marketIds.push(marketId);
    localStorage.setItem("marketIds", JSON.stringify(marketIds));
  }
  res.send(marketId);
});

app.get("/event/:id", (req, res) => {
  let eventId = req.params.id;
  let eventIds = JSON.parse(localStorage.getItem("eventIds"));
  if (eventIds == null || !eventIds.includes(eventId)) {
    IntervalIds.push(eventId);
    IntervalIds[eventId] = setInterval(getLiveScore, liveScoreTimer, eventId);
    if (eventIds == null) {
      eventIds = [];
    }
    eventIds.push(eventId);
    localStorage.setItem("eventIds", JSON.stringify(eventIds));
  }
  res.send(eventId);
});

async function getLiveScore(eventId) {
  let result = await ThirdPartyController.getLiveScore(eventId);
  io.to(eventId).emit("liveScore" + eventId, result);
}

function getMarketRate(marketId) {
  getRate(marketId).then(function (data) {
    io.to(marketId).emit("matchOdds" + marketId, data['matchOdds']);
    io.to(marketId).emit("bookmaker" + marketId, data['bookmaker']);
    io.to(marketId).emit("session" + marketId, data['session']);
  });
}

async function getRate(marketId) {
  let result = [];
  result['matchOdds'] = await ThirdPartyController.getMatchOdds_old(marketId);
  result['bookmaker'] = await ThirdPartyController.getBookmakerMarket(marketId);
  result['session'] = await ThirdPartyController.getSessions(marketId);
  return result;
}

app.get("/matchList", (req, res) => {
  let type = req.query.type;
  let typeId = gameType[type];
  ThirdPartyController.getMatchList(typeId).then(function (data) {
    res.send(data);
  });
});


app.get("/competitionList", (req, res) => {
  let type = req.query.type;
  let typeId = gameType[type];
  ThirdPartyController.getCompetitionList(typeId).then(function (data) {
    res.send(data);
  });
});

app.get("/eventList/:competitionId", (req, res) => {
  let competitionId = req.params.competitionId
  ThirdPartyController.getEventList(competitionId).then(function (data) {
    res.send(data);
  });
});

app.get("/matchOdds/:marketId", (req, res) => {
  let markertId = req.params.marketId;
  ThirdPartyController.getMatchOdds(markertId).then(function (data) {
    if (data && data[0]) {
      res.send(data[0].runners);
    }
    res.send(null);
  });
});

app.get("/bookmaker/:marketId", (req, res) => {
  let markertId = req.params.marketId;
  ThirdPartyController.getBookmakerMarket(markertId).then(function (data) {
    if (data && data[0]) {
      res.send(data[0].runners);
    }
    res.send(null);
  });
});

app.get("/session/:marketId", (req, res) => {
  let markertId = req.params.marketId;
  ThirdPartyController.getSessions(markertId).then(function (data) {
    res.send(data);
  });
});

app.get("/extraMarketList/:eventId", (req, res) => {
  let eventId = req.params.eventId;
  ThirdPartyController.getExtraEventList(eventId).then(function (data) {
    res.send(data);
  });
});

io.on('connection', (socket) => {
  socket.on('init', function (market) {
    let marketId = market.id;
    socket.join(marketId);
  });

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
    socket.join(matchId);
    let isIntervalExist = await internalRedis.hget("matchInterval", matchId);
    if (!isIntervalExist) {
      let matchDetail = await internalRedis.hgetall(matchId + "_match");
      let marketId = matchDetail.marketId;
      let intervalNumber = setInterval(getCricketData, liveGameTypeTime, marketId, matchId);
      internalRedis.hset("matchInterval", { [matchId]: intervalNumber });
    }
  });

  socket.on('disconnectCricketData', async function (event) {
    let matchId = event.matchId;
    socket.leave(matchId);
    const room = io.sockets.adapter.rooms.get(matchId);
    try {
      if (!(room && room.size != 0)) {
        let isIntervalExist = await internalRedis.hget("matchInterval", matchId);
        console.log("id is ", isIntervalExist);
        if (isIntervalExist) {
          clearInterval(parseInt(isIntervalExist));
          internalRedis.hdel("matchInterval", matchId);
        }
      }
    } catch (error) {
      console.log("error at disconnectCricketData ", error);
    }
  });


  socket.on("disconnect_market", (market) => {
    // clearMarket(market.id);
  });

  socket.on('disconnect', async () => {
    socket.leaveAll();
  });

  socket.on("leaveAllRoom", () => {
    socket.leaveAll();
  });

});

function getCricketData(marketId, matchId) {
  getRate(marketId).then(function (data) {
    io.to(matchId).emit("matchOdds" + matchId, data['matchOdds']);
    io.to(matchId).emit("bookmaker" + matchId, data['bookmaker']);
    io.to(matchId).emit("session" + matchId, data['session']);
  });
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

async function clearMarket(marketId) {
  clearInterval(IntervalIds[marketId]);
  localStorage.removeItem(marketId + "market");
  let marketIds = JSON.parse(localStorage.getItem("marketIds"));
  marketIds.splice(marketIds.indexOf(marketId), 1);
  localStorage.setItem("marketIds", JSON.stringify(marketIds));
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
  let marketIds = JSON.parse(localStorage.getItem("marketIds"));
  if (marketIds && marketIds.length) {
    marketIds.map(marketId => {
      IntervalIds.push(marketId);
      IntervalIds[marketId] = setInterval(getMarketRate, getRateTimer, marketId);
    })
  }

  let eventIds = JSON.parse(localStorage.getItem("eventIds"));
  if (eventIds && eventIds.length) {
    eventIds.map(eventId => {
      IntervalIds.push(eventId);
      IntervalIds[eventId] = setInterval(getLiveScore, liveScoreTimer, eventId);
    })
  }
});
