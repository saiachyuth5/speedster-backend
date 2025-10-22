const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

router.get('/strava', webhookController.verify);
router.post('/strava', webhookController.handleEvent);
router.get('/strava/info', webhookController.info);

module.exports = router;
