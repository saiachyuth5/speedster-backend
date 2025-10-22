const { AppError } = require('./errorHandler');
const { HTTP_STATUS } = require('../config/constants');

const validateStravaConnect = (req, res, next) => {
  const { code } = req.body;
  
  if (!code) {
    throw new AppError('Authorization code is required', HTTP_STATUS.BAD_REQUEST);
  }
  
  next();
};

const validateAnalyzeRun = (req, res, next) => {
  const { runData } = req.body;
  
  if (!runData || !runData.id || !runData.strava_activity_id) {
    throw new AppError('Missing required run data', HTTP_STATUS.BAD_REQUEST);
  }
  
  next();
};

const validateChat = (req, res, next) => {
  const { question, runData } = req.body;
  
  if (!runData || !runData.id || !question) {
    throw new AppError('Missing required run data or question', HTTP_STATUS.BAD_REQUEST);
  }
  
  next();
};

module.exports = {
  validateStravaConnect,
  validateAnalyzeRun,
  validateChat
};
