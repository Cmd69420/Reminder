// ==================== config/queue.js ====================
const Queue = require('bull');
const Redis = require('redis');

// Parse Redis URL
const redisUrl = new URL(process.env.REDIS_URL);

// Extract auth details
const username = redisUrl.username || 'default';
const password = redisUrl.password;
const host = redisUrl.hostname;
const port = redisUrl.port || 6379;
const isSecure = redisUrl.protocol === 'rediss:';

console.log('Connecting to Redis/Valkey:', {
  host,
  port,
  isSecure,
  hasPassword: !!password
});

// Bull queue configuration for Valkey/Redis
const redisConfig = {
  redis: {
    host: host,
    port: port,
    password: password,
    username: username, // Valkey uses username
    tls: isSecure ? {
      rejectUnauthorized: false
    } : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10000
  }
};

// Create notification queue
const notificationQueue = new Queue('notifications', redisConfig);

notificationQueue.on('ready', () => {
  console.log('✅ Bull queue connected to Redis/Valkey');
});

notificationQueue.on('error', (error) => {
  console.error('❌ Bull queue error:', error.message);
});

// Create Redis client for direct operations (optional)
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL,
  username: username,
  password: password,
  socket: {
    tls: isSecure,
    rejectUnauthorized: false,
    connectTimeout: 10000
  }
});

redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis client error:', err.message);
});

// Connect the Redis client
redisClient.connect().catch(err => {
  console.error('Failed to connect Redis client:', err.message);
});

module.exports = {
  notificationQueue,
  redisClient
};