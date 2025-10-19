require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const supabase = require('./supabaseClient');
const authMiddleware = require('./authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post('/api/strava/connect', authMiddleware, async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;
  
  console.log('📥 Received Strava code for user:', userId);
  console.log('🔑 Using Client ID:', process.env.STRAVA_CLIENT_ID);
  console.log('🔐 Using Client Secret:', process.env.STRAVA_CLIENT_SECRET?.substring(0, 10) + '...');
  
  try {
    // Exchange code for Strava token
    const stravaResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code'
    });
    
    const {
      access_token,
      refresh_token,
      expires_at,
      athlete
    } = stravaResponse.data;

    console.log('✅ Strava token received for athlete:', athlete.id);

    // Save tokens and athlete info to Supabase
    const { data: profile, error: upsertError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        strava_id: athlete.id,
        strava_access_token: access_token,
        strava_refresh_token: refresh_token,
        strava_token_expires_at: new Date(expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        returning: true
      });

    if (upsertError) {
      console.error('❌ Database error:', upsertError);
      throw new Error('Failed to save Strava connection');
    }

    console.log('✅ Saved Strava connection for user:', userId);
    
    // Return success response with athlete info
    res.json({
      success: true,
      athlete: {
        id: athlete.id,
        username: athlete.username,
        firstname: athlete.firstname,
        lastname: athlete.lastname,
        profile: athlete.profile_medium
      }
    });
  } catch (error) {
    console.error('❌ Error connecting Strava:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to connect Strava account',
      details: error.response?.data || error.message
    });
  }
});

// Get Strava activities
app.get('/api/strava/activities', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Get user's Strava token from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('strava_access_token, strava_token_expires_at')
      .eq('user_id', userId)
      .single();
    
    if (profileError || !profile) {
      console.error('❌ Database error:', profileError);
      return res.status(404).json({ error: 'Strava connection not found' });
    }
    
    // Check if token is expired
    if (new Date(profile.strava_token_expires_at) <= new Date()) {
      return res.status(401).json({ error: 'Strava token expired' });
    }
    
    // Fetch activities from Strava
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${profile.strava_access_token}` },
      params: { per_page: 30 }
    });
    
    // Filter only running activities
    const stravaRuns = response.data.filter(activity => activity.type === 'Run');
    
    // Prepare runs for database
    const runsToUpsert = stravaRuns.map(run => ({
      user_id: userId,
      strava_activity_id: run.id.toString(),
      name: run.name,
      date: new Date(run.start_date).toISOString(),
      distance: run.distance,
      duration: run.moving_time,
      pace: ((run.moving_time / 60) / (run.distance / 1000)).toFixed(2),
      avg_hr: run.average_heartrate,
      cadence: run.average_cadence,
      elevation: run.total_elevation_gain,
      updated_at: new Date().toISOString()
    }));
    
    // Save runs to database
    const { error: upsertError } = await supabase
      .from('runs')
      .upsert(runsToUpsert, {
        onConflict: 'strava_activity_id',
        returning: false
      });
      
    if (upsertError) {
      console.error('❌ Error saving runs:', upsertError);
      throw new Error('Failed to save runs to database');
    }
    
    // Fetch saved runs with analysis status
    const { data: savedRuns, error: fetchError } = await supabase
      .from('runs')
      .select(`
        id,
        strava_activity_id,
        name,
        date,
        distance,
        duration,
        pace,
        avg_hr,
        cadence,
        elevation,
        run_analyses(id)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });
      
    if (fetchError) {
      console.error('❌ Error fetching saved runs:', fetchError);
      throw new Error('Failed to fetch runs from database');
    }
    
    // Map response to include analyzed status
    const mappedRuns = savedRuns.map(run => ({
      id: run.id,
      strava_activity_id: run.strava_activity_id,
      name: run.name,
      date: run.date,
      distance: run.distance,
      duration: run.duration,
      pace: run.pace,
      avgHR: run.avg_hr,
      cadence: run.cadence,
      elevation: run.elevation,
      analyzed: run.run_analyses.length > 0
    }));
    
    console.log(`✅ Retrieved ${mappedRuns.length} runs for user:`, userId);
    res.json(mappedRuns);
  } catch (error) {
    console.error('❌ Error fetching activities:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch activities',
      details: error.response?.data || error.message
    });
  }
});

// Analyze run with OpenAI
app.post('/api/analyze-run', authMiddleware, async (req, res) => {
  const { runData } = req.body;
  const userId = req.user.id;

  // Validate required data
  if (!runData || !runData.id) {
    return res.status(400).json({ error: 'Missing required run data' });
  }
  
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
    // Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from('run_analyses')
      .select('id')
      .eq('run_id', runData.id)
      .single();

    if (existingAnalysis) {
      return res.status(400).json({ 
        error: 'Analysis already exists',
        message: 'This run has already been analyzed'
      });
    }

    // Get analysis from OpenAI
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

    // Save analysis to database
    const { data: savedAnalysis, error: dbError } = await supabase
      .from('run_analyses')
      .insert({
        run_id: runData.id,
        user_id: userId,
        summary: analysis.summary,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error('Failed to save analysis');
    }

    console.log('✅ Saved analysis for run:', runData.id);
    
    // Return the analysis with database ID
    res.json({
      id: savedAnalysis.id,
      ...analysis
    });
  } catch (error) {
    console.error('❌ Error analyzing run:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to analyze run',
      details: error.response?.data || error.message
    });
  }
});

// Chat with AI about run
app.post('/api/chat', authMiddleware, async (req, res) => {
  const { question, runData } = req.body;
  const userId = req.user.id;

  // Validate required data
  if (!runData || !runData.id || !question) {
    return res.status(400).json({ error: 'Missing required run data or question' });
  }
  
  const context = `Run context: ${(runData.distance / 1000).toFixed(1)}km, ${runData.pace} pace, ${runData.avgHR || 'N/A'} HR, ${runData.cadence || 'N/A'} cadence`;
  
  try {
    // Get existing conversation if it exists
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id, messages')
      .eq('user_id', userId)
      .eq('run_id', runData.id)
      .single();

    // Get AI response
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

    const answer = response.data.choices[0].message.content;

    // Prepare new message objects
    const newMessages = [
      { role: 'user', content: question, timestamp: new Date().toISOString() },
      { role: 'assistant', content: answer, timestamp: new Date().toISOString() }
    ];

    // Save or update conversation
    if (existingConversation) {
      // Append to existing conversation
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          messages: [...existingConversation.messages, ...newMessages],
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConversation.id);

      if (updateError) {
        console.error('❌ Error updating conversation:', updateError);
        throw new Error('Failed to update conversation');
      }

      console.log('✅ Updated conversation for run:', runData.id);
    } else {
      // Create new conversation
      const { error: insertError } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          run_id: runData.id,
          messages: newMessages,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ Error creating conversation:', insertError);
        throw new Error('Failed to create conversation');
      }

      console.log('✅ Created new conversation for run:', runData.id);
    }

    // Return the answer in the existing format
    res.json({ answer });
  } catch (error) {
    console.error('❌ Chat error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to process chat',
      details: error.response?.data || error.message
    });
  }
});

// Test Supabase connection
app.get('/api/test/db', authMiddleware, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      console.error('❌ Database test error:', error);
      return res.status(500).json({
        error: 'Database connection test failed',
        details: error.message
      });
    }

    console.log('✅ Database connection test successful');
    res.json({
      success: true,
      message: 'Database connection successful',
      profile
    });
  } catch (error) {
    console.error('❌ Unexpected test error:', error);
    res.status(500).json({
      error: 'Test failed',
      details: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Speedster Backend running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});