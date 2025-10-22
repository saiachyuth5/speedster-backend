const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const auth = require('../middleware/auth');
const { validateChat } = require('../middleware/validation');

router.post('/', auth, validateChat, chatController.chat);

module.exports = router;
