// ==================== routes/queue.routes.js ====================
const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queue.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get queue health/status
router.get('/health', queueController.getQueueHealth);

// Get failed jobs
router.get('/failed', queueController.getFailedJobs);

// Retry a failed job
router.post('/retry/:jobId', queueController.retryFailedJob);

// Clean queue (remove old jobs)
router.post('/clean', queueController.cleanQueue);

// Pause queue
router.post('/pause', queueController.pauseQueue);

// Resume queue
router.post('/resume', queueController.resumeQueue);

module.exports = router;