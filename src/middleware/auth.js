const supabase = require('../config/database');
const { ERROR_MESSAGES, HTTP_STATUS } = require('../config/constants');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        error: ERROR_MESSAGES.UNAUTHORIZED 
      });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
        error: ERROR_MESSAGES.UNAUTHORIZED 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      error: ERROR_MESSAGES.UNAUTHORIZED 
    });
  }
};

module.exports = authMiddleware;
