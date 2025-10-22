const axios = require('axios');
const config = require('../config/env');
const constants = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');

class OpenAIService {
  /**
   * Generate run analysis using GPT-4
   */
  async analyzeRun(runData) {
    const prompt = this.buildAnalysisPrompt(runData);
    
    try {
      const response = await axios.post(
        constants.OPENAI_API_URL,
        {
          model: config.OPENAI_MODEL,
          messages: [
            { role: 'system', content: constants.ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          temperature: constants.OPENAI_TEMPERATURE
        },
        {
          headers: {
            'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ OpenAI analysis failed:', error.response?.data || error.message);
      throw new AppError('Failed to generate analysis', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Generate chat response for run questions
   */
  async chat(question, runData) {
    const context = `Run context: ${(runData.distance / 1000).toFixed(1)}km, ${runData.pace} pace, ${runData.avgHR || 'N/A'} HR, ${runData.cadence || 'N/A'} cadence`;
    
    try {
      const response = await axios.post(
        constants.OPENAI_API_URL,
        {
          model: config.OPENAI_MODEL,
          messages: [
            { role: 'system', content: constants.CHAT_SYSTEM_PROMPT },
            { role: 'user', content: `${context}\n\nRunner's question: ${question}` }
          ],
          temperature: constants.OPENAI_TEMPERATURE,
          max_tokens: constants.OPENAI_CHAT_MAX_TOKENS
        },
        {
          headers: {
            'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('❌ OpenAI chat failed:', error.response?.data || error.message);
      throw new AppError('Failed to process chat', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Build analysis prompt from run data
   */
  buildAnalysisPrompt(runData) {
    return `Analyze this running activity and provide coaching insights:

Distance: ${(runData.distance / 1000).toFixed(1)} km
Duration: ${Math.floor(runData.duration / 60)}:${String(runData.duration % 60).padStart(2, '0')}
Pace: ${runData.pace} min/km
Average Heart Rate: ${runData.avgHR || 'N/A'} bpm
Cadence: ${runData.cadence || 'N/A'} spm
Elevation Gain: ${Math.round(runData.elevation || 0)}m

Provide a JSON response with:
1. "summary": A brief 2-3 sentence summary of the run quality and performance
2. "insights": Array of 2-3 insights with "title", "detail", and "type" (tip/positive/warning)
3. "recommendations": Array of 2-3 actionable recommendations with "title" and "detail"

Focus on: injury prevention, training load, pace management, and form optimization.
${runData.avgHR ? 'Include heart rate zone analysis.' : 'Note: Heart rate data not available for this run.'}
${runData.cadence ? 'Include cadence analysis for running form.' : 'Note: Cadence data not available for this run.'}

Return ONLY valid JSON, no other text.`;
  }
}

module.exports = new OpenAIService();
