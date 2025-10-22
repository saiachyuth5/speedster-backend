# Backend Refactoring Guide

## Why Refactor?

Your current `server.js` has **713 lines** with all endpoints mixed together. This makes it:
- ❌ Hard to maintain and debug
- ❌ Difficult for multiple developers to work on
- ❌ Harder to test individual features
- ❌ Risky to deploy (one bug affects everything)
- ❌ Difficult to reuse code

## Production-Ready Structure

```
speedster-backend/
├── src/
│   ├── index.js                 # App entry point (start server)
│   ├── app.js                   # Express app setup (middleware, routes)
│   ├── config/
│   │   ├── database.js          # Supabase client config
│   │   ├── env.js               # Environment variables validation
│   │   └── constants.js         # App constants
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   ├── errorHandler.js     # Global error handling
│   │   ├── validation.js        # Request validation
│   │   └── logger.js            # Request logging
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── strava.routes.js     # Strava OAuth & activities
│   │   ├── runs.routes.js       # Run analysis endpoints
│   │   ├── chat.routes.js       # AI chat endpoints
│   │   └── webhook.routes.js    # Strava webhooks
│   ├── controllers/
│   │   ├── strava.controller.js    # Strava business logic
│   │   ├── runs.controller.js      # Run analysis logic
│   │   ├── chat.controller.js      # Chat logic
│   │   └── webhook.controller.js   # Webhook logic
│   ├── services/
│   │   ├── strava.service.js       # Strava API calls
│   │   ├── openai.service.js       # OpenAI API calls
│   │   ├── database.service.js     # Database operations
│   │   └── webhook.service.js      # Webhook processing
│   ├── models/
│   │   ├── run.model.js            # Run data structure
│   │   ├── analysis.model.js       # Analysis structure
│   │   └── conversation.model.js   # Chat structure
│   ├── utils/
│   │   ├── logger.js               # Logging utility
│   │   ├── validators.js           # Input validation
│   │   └── helpers.js              # Helper functions
│   └── tests/
│       ├── strava.test.js
│       ├── runs.test.js
│       └── webhook.test.js
├── .env
├── .env.example
├── package.json
└── README.md
```

## Why This Structure?

### 1. **Separation of Concerns**
Each file has ONE job:
- **Routes**: Define endpoints and HTTP methods
- **Controllers**: Handle request/response logic
- **Services**: Business logic and external API calls
- **Models**: Data structures and validation
- **Middleware**: Cross-cutting concerns (auth, logging)

### 2. **Easier Testing**
Test each layer independently:
```javascript
// Can test service without HTTP
test('stravaService.getActivities', async () => {
  const activities = await stravaService.getActivities(token);
  expect(activities).toHaveLength(30);
});
```

### 3. **Easier to Scale**
Add features without touching existing code:
```javascript
// Add new feature: training plans
routes/
  ├── training-plans.routes.js    // NEW
controllers/
  ├── training-plans.controller.js // NEW
services/
  ├── training-plans.service.js    // NEW
```

### 4. **Code Reuse**
Use the same service in multiple places:
```javascript
// services/strava.service.js
export async function getActivityDetails(activityId, token) {
  // Used by: webhook, manual sync, analysis
}
```

### 5. **Team Collaboration**
Multiple developers can work simultaneously:
- Dev A works on `chat.controller.js`
- Dev B works on `webhook.controller.js`
- No merge conflicts!

## Example Refactor

### Current (server.js):
```javascript
// 713 lines of mixed concerns!
app.post('/api/strava/connect', authMiddleware, async (req, res) => {
  // 50 lines of code...
});

app.get('/api/strava/activities', authMiddleware, async (req, res) => {
  // 80 lines of code...
});

app.post('/api/analyze-run', authMiddleware, async (req, res) => {
  // 100 lines of code...
});
```

### Refactored:

**src/routes/strava.routes.js** (Clean & readable)
```javascript
const express = require('express');
const router = express.Router();
const stravaController = require('../controllers/strava.controller');
const auth = require('../middleware/auth');

router.post('/connect', auth, stravaController.connect);
router.get('/activities', auth, stravaController.getActivities);

module.exports = router;
```

**src/controllers/strava.controller.js** (Business logic)
```javascript
const stravaService = require('../services/strava.service');
const databaseService = require('../services/database.service');

exports.connect = async (req, res, next) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    
    const tokens = await stravaService.exchangeCode(code);
    await databaseService.saveTokens(userId, tokens);
    
    res.json({ success: true, athlete: tokens.athlete });
  } catch (error) {
    next(error); // Global error handler
  }
};

exports.getActivities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const profile = await databaseService.getUserProfile(userId);
    const activities = await stravaService.fetchActivities(profile.token);
    await databaseService.saveActivities(userId, activities);
    
    const runs = await databaseService.getRuns(userId);
    res.json(runs);
  } catch (error) {
    next(error);
  }
};
```

**src/services/strava.service.js** (External API calls)
```javascript
const axios = require('axios');
const config = require('../config/env');

exports.exchangeCode = async (code) => {
  const response = await axios.post('https://www.strava.com/oauth/token', {
    client_id: config.STRAVA_CLIENT_ID,
    client_secret: config.STRAVA_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code'
  });
  
  return response.data;
};

exports.fetchActivities = async (accessToken) => {
  const response = await axios.get(
    'https://www.strava.com/api/v3/athlete/activities',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 30 }
    }
  );
  
  return response.data.filter(activity => activity.type === 'Run');
};

exports.getActivityDetails = async (activityId, accessToken) => {
  const response = await axios.get(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  return response.data;
};
```

**src/services/database.service.js** (Database operations)
```javascript
const supabase = require('../config/database');

exports.getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) throw new Error('Profile not found');
  return data;
};

exports.saveTokens = async (userId, tokens) => {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      strava_id: tokens.athlete.id.toString(),
      strava_access_token: tokens.access_token,
      strava_refresh_token: tokens.refresh_token,
      strava_token_expires_at: new Date(tokens.expires_at * 1000),
      updated_at: new Date()
    });
    
  if (error) throw new Error('Failed to save tokens');
};

exports.saveActivities = async (userId, activities) => {
  const runs = activities.map(activity => ({
    user_id: userId,
    strava_activity_id: activity.id.toString(),
    name: activity.name,
    distance: Math.round(activity.distance),
    duration: activity.moving_time,
    // ... etc
  }));
  
  const { error } = await supabase
    .from('runs')
    .upsert(runs, { onConflict: 'strava_activity_id' });
    
  if (error) throw new Error('Failed to save activities');
};

exports.getRuns = async (userId) => {
  const { data, error } = await supabase
    .from('runs')
    .select('*, run_analyses(id)')
    .eq('user_id', userId)
    .order('date', { ascending: false });
    
  if (error) throw new Error('Failed to fetch runs');
  return data;
};
```

**src/app.js** (Main app setup)
```javascript
const express = require('express');
const cors = require('cors');
const stravaRoutes = require('./routes/strava.routes');
const runsRoutes = require('./routes/runs.routes');
const webhookRoutes = require('./routes/webhook.routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Routes
app.use('/api/strava', stravaRoutes);
app.use('/api/runs', runsRoutes);
app.use('/webhook', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling (must be last)
app.use(errorHandler);

module.exports = app;
```

**src/index.js** (Entry point)
```javascript
require('dotenv').config();
const app = require('./app');
const config = require('./config/env');

const PORT = config.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ Speedster Backend running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔔 Webhook: http://localhost:${PORT}/webhook/strava`);
});
```

## Benefits Summary

| Aspect | Before (713 lines) | After (Refactored) |
|--------|-------------------|-------------------|
| **File size** | 713 lines | ~50 lines per file |
| **Testability** | Hard | Easy |
| **Reusability** | None | High |
| **Team work** | Conflicts | Smooth |
| **Debugging** | Search all code | Check specific file |
| **Adding features** | Risky | Safe |

## When to Refactor?

✅ **Now is a good time because:**
- Your app is still small (manageable)
- You're asking the right questions
- You haven't shipped to customers yet

❌ **Don't refactor if:**
- You're rushing to demo/ship
- Code works and you're not adding features
- You're still experimenting with the idea

## Should You Refactor Now?

**My recommendation:** 

1. **For learning**: Yes! Refactor one route (e.g., Strava) to understand the pattern
2. **For this project**: Maybe wait until you add 2-3 more major features
3. **For your portfolio**: Definitely refactor before showing to employers

Want me to help you refactor one section to see the pattern?
