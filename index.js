const express = require('express'); // using express
const uWS = require('uWebSockets.js');
const fs = require("fs");
const http2 = require("http2"); // Use http2 instead of http
const http = require("http");
var LocalStorage = require('node-localstorage').LocalStorage;
const path = require('path');
const ThirdPartyController = require('./thirdPartyController');
const { internalRedis } = require('./config/internalRedis');
const { joinMatchRoom, joinMultiMatchRoom } = require('./utils/joinMatchRooms');
const cors = require('cors');
require("dotenv").config();


let app = express();
let uApp,server;

// SSL Configuration
if (process.env.NODE_ENV == "production" || process.env.NODE_ENV == "dev") {
  const sslOptions = {
    key_file_name: `/etc/letsencrypt/live/${process.env.SSL_PATH}/privkey.pem`,
    cert_file_name: `/etc/letsencrypt/live/${process.env.SSL_PATH}/fullchain.pem`
  };
  uApp = uWS.SSLApp(sslOptions);

  // Production SSL configuration with Let's Encrypt certificates
  const sslOptionsServer = {
    key: fs.readFileSync(`/etc/letsencrypt/live/${process.env.SSL_PATH}/privkey.pem`),
    cert: fs.readFileSync(`/etc/letsencrypt/live/${process.env.SSL_PATH}/fullchain.pem`),
    allowHTTP1: true, // Allows HTTP/1.1 fallback
  };

  // Create an HTTP/2 server with SSL options
  server = http2.createSecureServer(sslOptionsServer, app);

  console.log("Running with HTTPS in production mode");
  console.log("Running with HTTPS in production mode");
} else {
  server = http.createServer(app);
  uApp = uWS.App();
  console.log("Running with HTTP in development mode");
}
app.use(cors());

if (process.env.NODE_ENV !== 'production') {
  __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, "public")));
}

localStorage = new LocalStorage('./scratch');

// Redis Setup
const port = process.env.port ? parseInt(process.env.port) : 3200;

internalRedis.on('connect', async () => {
  console.log('Connected to Internal Redis server');
});

// WebSocket clients management
const clients = new Map();
const rooms = new Map();
let matchIntervalIds = {};

// Helper function to broadcast to room
function broadcastToRoom(roomName, message) {
  if (rooms.has(roomName)) {
    rooms.get(roomName).forEach(client => {
      client.send(JSON.stringify(message));
    });
  }
}

// Join room helper
function joinRoom(ws, roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  rooms.get(roomName).add(ws);
}

// Leave room helper
function leaveRoom(ws, roomName) {
  if (rooms.has(roomName)) {
    rooms.get(roomName).delete(ws);
    if (rooms.get(roomName).size === 0) {
      rooms.delete(roomName);
    }
  }
}

// Check and clear interval
function CheckAndClearInterval(matchId) {
  try {
    const room = rooms.get(matchId);
    const roomExpert = rooms.get(`${matchId}expert`);

    if ((!room || room.size === 0) && (!roomExpert || roomExpert.size === 0)) {
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
}

// Game type constants
const gameType = {
  football: 1,
  tennis: 2,
  golf: 3,
  cricket: 4,
  boxing: 6,
  horseRacing: 7,
  greyhoundRacing: 4339,
  politics: 5
};


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

  ThirdPartyController.sportsList(typeId).then(function (data) {
    return res.send(data);
  });
});

app.get("/getAllRateCricket/:eventId", (req, res) => {
  let eventId = req.params.eventId;
  let { apiType } = req.query;
  apiType = apiType || 2;

  ThirdPartyController.getAllRateCricket(eventId, apiType).then(function (data) {
    return res.send(data);
  });
});

app.get("/getAllRateFootBallTennis/:eventId", (req, res) => {
  let eventId = req.params.eventId;
  let { apiType } = req.query;
  apiType = apiType || 3;

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
  ThirdPartyController.getCricketScore(eventId).then(function (data) {
    return res.send(data);
  });
});


server.listen(port, () => {
  console.log(`Betting app listening at Port:${port}`);
  // if (token) {
    joinMultiMatchRoom(matchIntervalIds)
  // }
});

// WebSocket handling
uApp.ws('/*', {
  open: (ws) => {
    clients.set(ws, {
      id: Math.random().toString(36).substr(2, 9)
    });
  },

  message: async (ws, message) => {
    if (message) {
      try {
        const msg = JSON.parse(Buffer.from(message).toString());
  
        switch (msg.event) {
          case 'initCricketData':
            const matchId = msg.matchId;
            const roleName = msg.roleName;
  
            if (roleName == 'expert') {
              joinRoom(ws, matchId + 'expert');
            } else {
              joinRoom(ws, matchId);
            }
            await joinMatchRoom(matchIntervalIds, matchId)
            break;
  
          case 'disconnectCricketData':
            const dcMatchId = msg.matchId;
            const dcRoleName = msg.roleName;
            const roomName = dcRoleName == 'expert' ? dcMatchId + 'expert' : dcMatchId;
  
            leaveRoom(ws, roomName);
            CheckAndClearInterval(dcMatchId);
            break;
  
          case 'leaveAllRoom':
            // Find and leave all rooms this client is in
            rooms.forEach((clients, roomName) => {
              if (clients.has(ws)) {
                leaveRoom(ws, roomName);
              }
            });
            break;
          default:
            return;
        }
      } catch (error) {
        console.log(error)
      }
    }
  },

  close: (ws) => {
    // Remove from all rooms
    rooms.forEach((clients, roomName) => {
      if (clients.has(ws)) {
        leaveRoom(ws, roomName);
      }
    });
    clients.delete(ws);
  }
}).listen(port + 2, (token) => {
  console.log(token);
  if (token) {
    console.log(`WebSocket server (µWebSockets.js) running on ws://localhost:${port}`);
  } else {
    console.log('Failed to listen to port');
  }

});



// Helper function to broadcast data from game intervals
function broadcastGameData(matchId, data) {
  broadcastToRoom(matchId, data);
  broadcastToRoom(matchId + 'expert', data);
}

// Export needed functions
exports.broadcastGameData = broadcastGameData;
exports.CheckAndClearInterval = CheckAndClearInterval;
exports.broadcastToRoom = broadcastToRoom;
