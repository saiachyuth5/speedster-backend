const express = require('express');
const router = express.Router();

const stravaRoutes = require('./strava.routes');
const runsRoutes = require('./runs.routes');
const chatRoutes = require('./chat.routes');
const webhookRoutes = require('./webhook.routes');

// API routes
router.use('/strava', stravaRoutes);
router.use('/runs', runsRoutes);
router.use('/chat', chatRoutes);

// Webhook routes (separate from /api)
router.use('/webhook', webhookRoutes);

module.exports = router;
