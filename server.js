require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post('/api/auth/strava', async (req, res) => {
  const { code } = req.body;
  
  console.log('📥 Received code:', code);
  console.log('🔑 Using Client ID:', process.env.STRAVA_CLIENT_ID);
  console.log('🔐 Using Client Secret:', process.env.STRAVA_CLIENT_SECRET?.substring(0, 10) + '...');
  
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code'
    });
    
    console.log('✅ Token received successfully!');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Strava auth error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Get Strava activities
app.get('/api/strava/activities', async (req, res) => {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' });
  }
  
  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 30 }
    });
    
    // Filter only running activities
    const runs = response.data.filter(activity => activity.type === 'Run');
    res.json(runs);
  } catch (error) {
    console.error('Strava API error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Analyze run with OpenAI
app.post('/api/analyze-run', async (req, res) => {
  const { runData } = req.body;
  
  const prompt = `Analyze this running activity and provide coaching insights:

Distance: ${(runData.distance / 1000).toFixed(1)} km
Duration: ${Math.floor(runData.duration / 60)}:${String(runData.duration % 60).padStart(2, '0')}
Pace: ${runData.pace} min/km
Average Heart Rate: ${runData.avgHR || 'N/A'} bpm
Cadence: ${runData.cadence || 'N/A'} spm
Elevation Gain: ${Math.round(runData.elevation || 0)}m

Provide a JSON response with:
1. "summary": A brief 2-3 sentence summary of the run quality and performance
2. "insights": Array of 2-3 insights with "title", "detail", and "type" (tip/positive/warning)
3. "recommendations": Array of 2-3 actionable recommendations

Focus on: injury prevention, training load, pace management, and form optimization.

Return ONLY valid JSON, no other text.`;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert running coach focused on injury prevention and performance. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content;
    const analysis = JSON.parse(content);
    res.json(analysis);
  } catch (error) {
    console.error('OpenAI error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Chat with AI about run
app.post('/api/chat', async (req, res) => {
  const { question, runData } = req.body;
  
  const context = `Run context: ${(runData.distance / 1000).toFixed(1)}km, ${runData.pace} pace, ${runData.avgHR || 'N/A'} HR, ${runData.cadence || 'N/A'} cadence`;
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert running coach. Be concise, actionable, and focus on injury prevention. Keep responses under 150 words.' },
        { role: 'user', content: `${context}\n\nRunner's question: ${question}` }
      ],
      temperature: 0.7,
      max_tokens: 300
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ answer: response.data.choices[0].message.content });
  } catch (error) {
    console.error('Chat error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Speedster Backend running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});