module.exports = {
  // Strava API
  STRAVA_API_BASE_URL: 'https://www.strava.com/api/v3',
  STRAVA_OAUTH_URL: 'https://www.strava.com/oauth/token',
  STRAVA_ACTIVITIES_PER_PAGE: 30,
  
  // OpenAI
  OPENAI_API_URL: 'https://api.openai.com/v1/chat/completions',
  OPENAI_CHAT_MAX_TOKENS: 300,
  OPENAI_TEMPERATURE: 0.7,
  
  // Analysis prompts
  ANALYSIS_SYSTEM_PROMPT: 'You are an expert running coach focused on injury prevention and performance. Always respond with valid JSON only.',
  CHAT_SYSTEM_PROMPT: 'You are an expert running coach. Be concise, actionable, and focus on injury prevention. Keep responses under 150 words.',
  
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
  },
  
  // Error Messages
  ERROR_MESSAGES: {
    MISSING_RUN_DATA: 'Missing required run data',
    STRAVA_CONNECTION_NOT_FOUND: 'Strava connection not found',
    STRAVA_TOKEN_EXPIRED: 'Strava token expired',
    FAILED_TO_ANALYZE_RUN: 'Failed to analyze run',
    FAILED_TO_PROCESS_CHAT: 'Failed to process chat',
    FAILED_TO_FETCH_ACTIVITIES: 'Failed to fetch activities',
    PROFILE_NOT_FOUND: 'User profile not found',
    UNAUTHORIZED: 'Unauthorized access'
  }
};
