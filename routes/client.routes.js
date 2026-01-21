const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', clientController.getAllClients);
router.get('/:id', clientController.getClientById);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

module.exports = router;