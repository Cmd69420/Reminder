const Queue = require('bull');
const Redis = require('redis');

// Parse Redis URL for Bull (it needs host, port, password separately)
const redisUrl = new URL(process.env.REDIS_URL);

const redisConfig = {
  redis: {
    host: redisUrl.hostname,
    port: redisUrl.port || 6379,
    password: redisUrl.password,
    tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  }
};

// Create notification queue
const notificationQueue = new Queue('notifications', redisConfig);

notificationQueue.on('ready', () => {
  console.log('✅ Bull queue connected to Redis');
});

notificationQueue.on('error', (error) => {
  console.error('❌ Bull queue error:', error);
});

// Create Redis client for direct operations (optional)
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: process.env.REDIS_URL.startsWith('rediss://'),
    rejectUnauthorized: false
  }
});

redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis client error:', err);
});

redisClient.connect().catch(console.error);

module.exports = {
  notificationQueue,
  redisClient
};