// ==================== routes/whatsapp.routes.js ====================
const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');

// Webhook for incoming WhatsApp messages
router.post('/webhook', whatsappController.handleIncomingMessage);

// Webhook for message status updates
router.post('/status', whatsappController.handleStatusCallback);

module.exports = router;