AI-powered running analytics backend with Strava integration, real-time webhooks, and GPT-4 coaching.

## 🏗️ Architecture

```
src/
├── index.js                    # Server entry point
├── app.js                      # Express app setup
├── config/                     # Configuration
│   ├── env.js                  # Environment variables
│   ├── database.js             # Supabase client
│   └── constants.js            # App constants
├── middleware/                 # Express middleware
│   ├── auth.js                 # Authentication
│   ├── errorHandler.js         # Error handling
│   ├── logger.js               # Request logging
│   └── validation.js           # Input validation
├── services/                   # Business logic
│   ├── strava.service.js       # Strava API integration
│   ├── database.service.js     # Database operations
│   ├── openai.service.js       # AI analysis
│   └── webhook.service.js      # Webhook processing
├── controllers/                # Request handlers
│   ├── strava.controller.js    # Strava endpoints
│   ├── runs.controller.js      # Run analysis
│   ├── chat.controller.js      # AI chat
│   └── webhook.controller.js   # Webhooks
└── routes/                     # API routes
    ├── index.js                # Route aggregator
    ├── strava.routes.js        # /api/strava/*
    ├── runs.routes.js          # /api/runs/*
    ├── chat.routes.js          # /api/chat/*
    └── webhook.routes.js       # /webhook/*
```

## ✨ Features

- ✅ **Layered Architecture** - Routes → Controllers → Services → Database
- ✅ **Error Handling** - Centralized error handling with proper status codes
- ✅ **Logging** - Request/response logging in development
- ✅ **Validation** - Input validation middleware
- ✅ **Type Safety** - Consistent data transformation
- ✅ **Separation of Concerns** - Clear responsibility boundaries
- ✅ **Testable** - Each layer can be tested independently
- ✅ **Scalable** - Easy to add new features

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Production Server
```bash
npm start
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Strava Integration
```
POST   /api/strava/connect      # Connect Strava account
GET    /api/strava/activities   # Sync activities
```

### Run Analysis
```
POST   /api/runs/analyze        # Analyze run with AI
```

### AI Chat
```
POST   /api/chat                # Chat about a run
```

### Webhooks
```
GET    /webhook/strava          # Webhook verification
POST   /webhook/strava          # Webhook events
GET    /webhook/strava/info     # Setup info
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No (default: 3001) |
| `STRAVA_CLIENT_ID` | Strava API client ID | Yes |
| `STRAVA_CLIENT_SECRET` | Strava API client secret | Yes |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | Webhook verification token | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `OPENAI_MODEL` | OpenAI model (default: gpt-4) | No |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |

## 🧪 Testing

```bash
npm test
```

## 📦 Deployment

### Option 1: Render.com
1. Connect GitHub repository
2. Set environment variables
3. Deploy!

### Option 2: Railway.app
```bash
railway up
```

### Option 3: Docker
```bash
docker build -t speedster-backend .
docker run -p 3001:3001 speedster-backend
```

## 🛠️ Development

### Adding a New Feature

1. **Create Service** (`src/services/feature.service.js`)
```javascript
class FeatureService {
  async doSomething() {
    // Business logic here
  }
}
module.exports = new FeatureService();
```

2. **Create Controller** (`src/controllers/feature.controller.js`)
```javascript
const featureService = require('../services/feature.service');

class FeatureController {
  async handleRequest(req, res, next) {
    try {
      const result = await featureService.doSomething();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
module.exports = new FeatureController();
```

3. **Create Routes** (`src/routes/feature.routes.js`)
```javascript
const express = require('express');
const router = express.Router();
const featureController = require('../controllers/feature.controller');

router.get('/', featureController.handleRequest);

module.exports = router;
```

4. **Register Routes** (`src/routes/index.js`)
```javascript
router.use('/feature', require('./feature.routes'));
```

## 🔍 Error Handling

All errors are caught and formatted consistently:

```javascript
{
  "error": "Human-readable error message",
  "stack": "Stack trace (dev only)"
}
```

### Custom Errors

```javascript
const { AppError } = require('../middleware/errorHandler');

throw new AppError('Custom error message', 400);
```

## 📊 Logging

Request/response logs in development:

```
➡️  POST /api/runs/analyze
✅ POST /api/runs/analyze - 200 (1234ms)
```

## 🔐 Authentication

All `/api/*` routes require authentication:

```javascript
headers: {
  Authorization: 'Bearer <supabase_jwt_token>'
}
```

## 📝 Code Style

- **Services**: Handle business logic and external APIs
- **Controllers**: Handle request/response formatting
- **Middleware**: Handle cross-cutting concerns
- **Routes**: Define endpoints and apply middleware
- **Config**: Centralize configuration

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

ISC

## 🙏 Acknowledgments

- Strava API
- OpenAI GPT-4
- Supabase

---

Made with ❤️ for runners
