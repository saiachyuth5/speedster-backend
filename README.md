# Speedster Backend

Backend API server for the Speedster running analytics application.

## Features

- Strava OAuth integration
- Run activity analysis with AI
- Chat functionality for run insights
- Activity data processing and storage

## Tech Stack

- Node.js
- Express
- OpenAI API
- MongoDB (planned)

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
PORT=3001
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
OPENAI_API_KEY=your_openai_api_key
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Strava Authentication
- `POST /api/auth/strava` - Exchange authorization code for access token

### Activities
- `GET /api/strava/activities` - Fetch user's running activities

### Analysis
- `POST /api/analyze-run` - Analyze a specific run
- `POST /api/chat` - Chat about run details and get AI insights

## Environment Variables

- `PORT` - Server port (default: 3001)
- `STRAVA_CLIENT_ID` - Your Strava API client ID
- `STRAVA_CLIENT_SECRET` - Your Strava API client secret
- `OPENAI_API_KEY` - OpenAI API key for run analysis

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request