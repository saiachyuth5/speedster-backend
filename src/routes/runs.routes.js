const express = require('express');
const router = express.Router();
const runsController = require('../controllers/runs.controller');
const auth = require('../middleware/auth');
const { validateAnalyzeRun } = require('../middleware/validation');

router.post('/analyze', auth, validateAnalyzeRun, runsController.analyze);

module.exports = router;
