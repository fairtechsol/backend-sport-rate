const express = require('express'); // using express
const socketIO = require('socket.io');
const Redis = require('ioredis');
const http = require('http')
var cors = require('cors');
var LocalStorage = require('node-localstorage').LocalStorage;
const cron = require('node-cron');
const path = require('path');

let app = express();
let server = http.createServer(app)
app.use(cors());

const EventEmitter = require('events');
const Stream = new EventEmitter();

// Store connected clients by match ID
const clients = {};

// Function to send SSE to clients for a specific match ID
function sendSSE(matchId, data) {
  if (clients[matchId]) {
    clients[matchId].forEach(client => {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
}

require("dotenv").config();
const ThirdPartyController = require('./thirdPartyController');
let io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
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
exports.internalRedis = internalRedis;
exports.io = io;
const { getFootBallData, getCricketData, getTennisData, getHorseRacingData, getGreyHoundRacingData } = require('./getGameData');

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
  boxing: 6,
  horseRacing: 7,
  greyhoundRacing: 4339
}
const eventUrl = {
  football: "under_over_goal_market_list",
  cricket: "cricket_extra_market_list",
  tennis: "set_winner"
}

const liveGameType = {
  teen8: "teen8",
  teen20: "teen20",
  Teen: "Teen",
}

const casinoGameType = {
  dragonTiger: "DRAGON_TIGER_20",
  teen20: "TEEN_20",
  lucky7: "LUCKY7",
  card32: "CARD_32",
  abj: "ABJ",
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

app.get("/casino/rates/:type", (req, res) => {
  const { type } = req.params;
  let typeId = casinoGameType[type];
  
  ThirdPartyController.getCasinoRates(typeId).then(function (data) {
    return res.send(data);
  });
});

app.get("/casino/result/:roundId", (req, res) => {
  const { roundId } = req.params;
  
  ThirdPartyController.getCasinoResult(roundId).then(function (data) {
    return res.send(data);
  });
});

app.get("/casino/topTen/result/:type", (req, res) => {
  const { type } = req.params;
  let typeId = casinoGameType[type];
  
  ThirdPartyController.getCasinoTopTenResults(typeId).then(function (data) {
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
        switch (matchDetail.matchType) {
          case 'football':
            matchIntervalIds[matchId] = setInterval(getFootBallData, liveGameTypeTime, marketId, matchId);
            break;
          case 'cricket':
            matchIntervalIds[matchId] = setInterval(getCricketData, liveGameTypeTime, marketId, matchId);
            break;
          case 'tennis':
            matchIntervalIds[matchId] = setInterval(getTennisData, liveGameTypeTime, marketId, matchId);
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



// Middleware to handle SSE requests
app.get('/match/:id', (req, res) => {
  const matchId = req.params.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  Stream.on("push", function (matchId, data) {
    res.write("event: " + String(matchId) + "\n" + "data: " + JSON.stringify(data) + "\n\n");
  });
});

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

// // Simulate sending data for each match every 5 seconds
// setInterval(() => {
//   // console.log("clients ", clients);
//   let matchId = Math.floor(Math.random() * 100);
//   if (matchId % 10) {
//     const data = {
//       matchId: matchId,
//       score: Math.floor(Math.random() * 100),
//       time: new Date().toLocaleTimeString()
//     };
//     Stream.emit("push", matchId, { msg: data });
//   } else {
//     Stream.emit("push", 1, { msg: "admit one" });
//   }
// }, 5000);
