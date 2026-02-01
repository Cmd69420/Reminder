// ==================== controllers/queue.controller.js ====================
const { notificationQueue } = require('../config/queue');
const logger = require('../utils/logger');

/**
 * Get queue health and statistics
 */
const getQueueHealth = async (req, res, next) => {
  try {
    // Check if queue is ready
    const isReady = await notificationQueue.isReady().catch(() => false);
    
    if (!isReady) {
      return res.json({
        success: true,
        data: {
          status: 'disconnected',
          message: 'Queue is not connected to Redis',
          counts: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0
          }
        }
      });
    }

    // Get job counts
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      notificationQueue.getWaitingCount(),
      notificationQueue.getActiveCount(),
      notificationQueue.getCompletedCount(),
      notificationQueue.getFailedCount(),
      notificationQueue.getDelayedCount(),
      notificationQueue.getPausedCount()
    ]);

    const total = waiting + active + completed + failed + delayed;

    res.json({
      success: true,
      data: {
        status: 'connected',
        message: 'Queue is healthy and operational',
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
          total
        }
      }
    });

  } catch (error) {
    logger.error('Error getting queue health:', error);
    res.json({
      success: true,
      data: {
        status: 'error',
        message: error.message,
        counts: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0
        }
      }
    });
  }
};

/**
 * Get recent failed jobs
 */
const getFailedJobs = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const isReady = await notificationQueue.isReady().catch(() => false);
    
    if (!isReady) {
      return res.json({
        success: true,
        data: { jobs: [] }
      });
    }

    const failedJobs = await notificationQueue.getFailed(0, parseInt(limit) - 1);
    
    const jobs = failedJobs.map(job => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    }));

    res.json({
      success: true,
      data: { jobs }
    });

  } catch (error) {
    logger.error('Error getting failed jobs:', error);
    next(error);
  }
};

/**
 * Retry a failed job
 */
const retryFailedJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    const job = await notificationQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    await job.retry();
    
    logger.info(`Job ${jobId} retried by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Job queued for retry'
    });

  } catch (error) {
    logger.error('Error retrying job:', error);
    next(error);
  }
};

/**
 * Clean old jobs from queue
 */
const cleanQueue = async (req, res, next) => {
  try {
    const { type = 'completed', grace = 3600000 } = req.query; // 1 hour default
    
    const cleaned = await notificationQueue.clean(parseInt(grace), type);
    
    logger.info(`Cleaned ${cleaned.length} ${type} jobs older than ${grace}ms`);

    res.json({
      success: true,
      message: `Cleaned ${cleaned.length} ${type} jobs`,
      data: { count: cleaned.length }
    });

  } catch (error) {
    logger.error('Error cleaning queue:', error);
    next(error);
  }
};

/**
 * Pause the queue
 */
const pauseQueue = async (req, res, next) => {
  try {
    await notificationQueue.pause();
    
    logger.info(`Queue paused by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Queue paused successfully'
    });

  } catch (error) {
    logger.error('Error pausing queue:', error);
    next(error);
  }
};

/**
 * Resume the queue
 */
const resumeQueue = async (req, res, next) => {
  try {
    await notificationQueue.resume();
    
    logger.info(`Queue resumed by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Queue resumed successfully'
    });

  } catch (error) {
    logger.error('Error resuming queue:', error);
    next(error);
  }
};

module.exports = {
  getQueueHealth,
  getFailedJobs,
  retryFailedJob,
  cleanQueue,
  pauseQueue,
  resumeQueue
};