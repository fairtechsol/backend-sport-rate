
const Redis = require('ioredis');
exports.internalRedis = new Redis({
    host: process.env.INTERNAL_REDIS_HOST || 'localhost',
    port: process.env.INTERNAL_REDIS_PORT || 6379,
    password: process.env.INTERNAL_REDIS_PASSWORD || ''
  });