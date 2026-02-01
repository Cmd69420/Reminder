// ==================== config/queue.js ====================
const Queue = require('bull');
const Redis = require('ioredis');  // ✅ FIXED: Use ioredis, not redis!

// Parse Redis URL
const redisUrl = new URL(process.env.REDIS_URL);

// Extract auth details
const username = redisUrl.username || 'default';
const password = redisUrl.password;
const host = redisUrl.hostname;
const port = parseInt(redisUrl.port) || 6379;
const isSecure = redisUrl.protocol === 'rediss:';

console.log('Connecting to Redis/Valkey:', {
  host,
  port,
  isSecure,
  hasPassword: !!password,
  username: username
});

// Redis connection options for ioredis
const redisOptions = {
  host: host,
  port: port,
  password: password,
  username: username, // Valkey uses username
  tls: isSecure ? {
    rejectUnauthorized: false
  } : undefined,
  maxRetriesPerRequest: null,      // ✅ Critical for Bull!
  enableReadyCheck: false,          // ✅ Prevents timing issues
  connectTimeout: 10000,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    console.error('Redis reconnect on error:', err.message);
    return true; // Always try to reconnect
  }
};

// Create notification queue with separate connections for each Bull operation
// This prevents ECONNRESET errors by giving Bull dedicated connections
const notificationQueue = new Queue('notifications', {
  createClient: function (type) {
    switch (type) {
      case 'client':
        console.log('Creating Bull Redis client connection...');
        return new Redis(redisOptions);
      case 'subscriber':
        console.log('Creating Bull Redis subscriber connection...');
        return new Redis(redisOptions);
      case 'bclient':
        console.log('Creating Bull Redis blocking client connection...');
        return new Redis(redisOptions);
      default:
        return new Redis(redisOptions);
    }
  },
  settings: {
    stalledInterval: 30000,    // Check for stalled jobs every 30s
    maxStalledCount: 3,        // Max times a job can recover from stalled
    guardInterval: 5000,
    retryProcessDelay: 5000,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,     // Keep last 100 completed jobs
    removeOnFail: 200          // Keep last 200 failed jobs
  }
});

// Queue event listeners
notificationQueue.on('ready', () => {
  console.log('✅ Bull queue connected to Redis/Valkey');
});

notificationQueue.on('error', (error) => {
  console.error('❌ Bull queue error:', error.message);
});

notificationQueue.on('waiting', (jobId) => {
  console.log(`📋 Job ${jobId} is waiting`);
});

notificationQueue.on('active', (job) => {
  console.log(`▶️  Job ${job.id} started processing`);
});

notificationQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

notificationQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

notificationQueue.on('stalled', (job) => {
  console.warn(`⚠️  Job ${job.id} has stalled`);
});

// Create a separate Redis client for direct operations (optional)
// This uses ioredis for consistency
const redisClient = new Redis(redisOptions);

redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis client ready');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis client error:', err.message);
});

redisClient.on('close', () => {
  console.log('ℹ️  Redis client connection closed');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis client reconnecting...');
});

// Test queue is ready
notificationQueue.isReady()
  .then(() => {
    console.log('✅ Bull queue is ready and operational');
  })
  .catch((error) => {
    console.error('❌ Bull queue failed to initialize:', error.message);
  });

module.exports = {
  notificationQueue,
  redisClient
};