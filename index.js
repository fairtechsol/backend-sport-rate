const express = require('express'); // using express
const socketIO = require('socket.io');
const Redis = require('ioredis');
const http2 = require("http2"); // Use http2 instead of http
const http = require("http");
const fs = require("fs");
var cors = require('cors');
const path = require('path');
require("dotenv").config();
const compression = require('compression');
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 60, checkperiod: 60 });

let app = express();
// Check environment to determine SSL setup
let server;

if (process.env.NODE_ENV == "production" || process.env.NODE_ENV == "dev") {
  // Production SSL configuration with Let's Encrypt certificates
  const sslOptions = {
    key: fs.readFileSync(`/etc/letsencrypt/live/${process.env.SSL_PATH}/privkey.pem`),
    cert: fs.readFileSync(`/etc/letsencrypt/live/${process.env.SSL_PATH}/fullchain.pem`),
    allowHTTP1: true, // Allows HTTP/1.1 fallback
  };
  // Create an HTTP/2 server with SSL options
  server = http2.createSecureServer(sslOptions, app);
  console.log("Running with HTTPS in production mode");
} else {
  // Create an HTTP server for local development
  server = http.createServer(app);
  console.log("Running with HTTP in development mode");
}
app.use(cors());
// Configure compression for ALL HTTP traffic
app.use(compression({
  brotli: {
    quality: 4, // 4-6 is ideal for APIs (balance speed/size)
  },
  level: 6, // gzip level 6 (optimal balance)
  threshold: '1kb', // Skip compressing tiny responses
}));


const ThirdPartyController = require('./thirdPartyController');
let io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"], // Enable both WebSocket and polling
  perMessageDeflate: {
    threshold: 1024,  // Only compress messages larger than 1024 bytes
    zlibDeflateOptions: { level: 6 }, // Maximum compression
    zlibInflateOptions: { chunkSize: 64 * 1024 }, // Efficient decompression
    clientNoContextTakeover: true, // Reduce memory usage
    serverNoContextTakeover: true, // Reduce memory usage
    serverMaxWindowBits: 10, // Low memory usage
  }
});
app.set('socketio', io);

if (process.env.NODE_ENV !== 'production') {
  __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, "public")));
}

const port = process.env.port ? parseInt(process.env.port) : 3200 // setting the port
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

// Create a Map to store match IDs instead of using localStorage
const matchDBMap = new Map();

let matchIntervalIds = {};
const CheckAndClearInterval = (matchId) => {
  // to check is any user exist in the interval or not. if not then close the interval
  const room = io.sockets.adapter.rooms.get(matchId);
  const roomExpert = io.sockets.adapter.rooms.get(`${matchId}expert`);

  try {
    if (!(room && room.size != 0) && !(roomExpert && roomExpert.size != 0)) {
      if (matchIntervalIds[matchId]) {
        let intervalId = matchIntervalIds[matchId];
        setTimeout(() => {
          clearInterval(intervalId);
        }, 10000);
      }
      delete matchIntervalIds[matchId];
      if (matchDBMap.has(matchId)) {
        matchDBMap.delete(matchId);
      }
    }
  } catch (error) {
    console.log("error at disconnectCricketData ", error);
  }
}
exports.CheckAndClearInterval = CheckAndClearInterval;

const { getFootBallData, getCricketData, getHorseRacingData, getGreyHoundRacingData } = require('./getGameData');

// Handle other Redis events if needed
internalRedis.on('error', (error) => {
  console.error('Error:', error);
});

app.get("/", (req, res) => {
  return res.send("call the api");
});


const gameType = {
  football: 1,
  tennis: 2,
  golf: 3,
  cricket: 4,
  boxing: 6,
  horseRacing: 7,
  greyhoundRacing: 4339,
  politics: 5
}
const eventUrl = {
  football: "under_over_goal_market_list",
  cricket: "cricket_extra_market_list",
  tennis: "set_winner"
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
  const { apiType } = req.query;
  ThirdPartyController.getMatchOdds(markertId, apiType).then(function (data) {
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
  const { apiType } = req.query;

  ThirdPartyController.getMatchOdds(markertId, apiType).then(function (data) {
    return res.send(data);
  });
});

app.get("/sportsList", (req, res) => {
  let type = req.query.type;
  let typeId = gameType[type];

  if (myCache.has(type)) {
    return res.send(myCache.get(type));
  }

  ThirdPartyController.sportsList(typeId).then(function (data) {
    myCache.set(type, data, 60);
    return res.send(data);
  });
});

app.get("/getAllRateCricket/:eventId", (req, res) => {
  let eventId = req.params.eventId;
  let { apiType } = req.query;
  apiType = apiType || 2;
  if (!eventId) {
    return res.send([]);
  }

  ThirdPartyController.getAllRateCricket(eventId, apiType).then(function (data) {
    return res.send(data);
  });
});

app.get("/getAllRateFootBallTennis/:eventId", (req, res) => {
  let eventId = req.params.eventId;
  let { apiType } = req.query;
  apiType = apiType || 3;
  if (!eventId) {
    return res.send([]);
  }

  ThirdPartyController.getAllRateFootBallTennis(eventId, apiType).then(function (data) {
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

app.get("/cricketScore", (req, res) => {
  let { eventId } = req.query;
  if (!eventId) {
    return res.send([]);
  }
  ThirdPartyController.getCricketScore(eventId).then(function (data) {
    return res.send(data);
  });
});

app.get("/getIframeUrl/:eventid", async (req, res) => {
  const [scoreResult, tvResult] = await Promise.allSettled([
    req.query.isScore == 'true' ? ThirdPartyController.getScoreIframeUrl(req.params.eventid, gameType[req.query.sportType]) : null,
    req.query.isTv == 'true' ? ThirdPartyController.gettvIframeUrl(req.params.eventid, gameType[req.query.sportType]) : null
  ]);
  const scoreData = scoreResult.status === 'fulfilled' ? scoreResult.value : [];
  const tvData = tvResult.status === 'fulfilled' ? tvResult.value : [];

  res.send({ scoreData, tvData });
});

io.on('connection', async (socket) => {
  let matchIdArray = []
  // Extract the match id from the client's handshake headers or auth object
  const roleName = socket.handshake.query.roleName;
  try {
    // Parse the string back into an array
    matchIdArray = socket.handshake.query.matchIdArray?.split(',') || [];
  } catch (err) {
    console.error("Error parsing matchId array:", err);
  }
  // If no match id is provided, disconnect the client
  if (!matchIdArray.length || !roleName) {
    socket.disconnect();
    return;
  }

  matchIdArray.forEach(async (matchId) => {
    if (roleName == 'expert') {
      socket.join(matchId + 'expert');
    } else {
      socket.join(matchId);
    }

    if (!matchIntervalIds[matchId]) {
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
        matchDBMap.set(matchId, true);
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
    //    socket.leave(roomName);
    //    CheckAndClearInterval(matchId);
  });

  socket.on('disconnect', async () => {
    socket.leaveAll();
  });

  socket.on("leaveAllRoom", () => {
    socket.leaveAll();
  });

});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1); // Exit to let PM2 restart the process
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1); // Exit to let PM2 restart the process
});


server.listen(port, () => {
  console.log(`Betting app listening at Port:${port}`)
  if (matchDBMap.size > 0) {
    matchDBMap.forEach(async (value, matchId) => {
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

});
