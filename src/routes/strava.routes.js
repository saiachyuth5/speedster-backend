const express = require('express');
const router = express.Router();
const stravaController = require('../controllers/strava.controller');
const auth = require('../middleware/auth');
const { validateStravaConnect } = require('../middleware/validation');

router.post('/connect', auth, validateStravaConnect, stravaController.connect);
router.get('/activities', auth, stravaController.getActivities);

module.exports = router;
