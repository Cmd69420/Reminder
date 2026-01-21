const express = require('express');
const router = express.Router();
const logController = require('../controllers/log.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', logController.getAllLogs);
router.get('/stats', logController.getStats);
router.get('/reminder/:reminder_id', logController.getLogsByReminder);
router.get('/client/:client_id', logController.getLogsByClient);

module.exports = router;