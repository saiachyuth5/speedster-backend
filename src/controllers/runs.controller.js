const openaiService = require('../services/openai.service');
const stravaService = require('../services/strava.service');
const databaseService = require('../services/database.service');

class RunsController {
  /**
   * Analyze a run with AI
   * POST /api/runs/analyze
   */
  async analyze(req, res, next) {
    try {
      const { runData } = req.body;
      const userId = req.user.id;
      
      console.log('📊 Analyzing run:', runData.id);
      
      // Check for existing analysis
      const existingAnalysis = await databaseService.getAnalysis(runData.id);
      if (existingAnalysis) {
        console.log('✅ Returning cached analysis for run:', runData.id);
        return res.json({
          id: existingAnalysis.id,
          summary: existingAnalysis.summary,
          insights: existingAnalysis.insights || [],
          recommendations: existingAnalysis.recommendations || [],
          fromCache: true
        });
      }
      
      // Enrich run data with cadence if missing
      let enrichedRunData = { ...runData };
      
      if (!runData.cadence || runData.cadence === 0) {
        console.log('🔍 Fetching cadence from Strava...');
        
        const profile = await databaseService.getUserProfile(userId);
        if (profile?.strava_access_token) {
          try {
            const activity = await stravaService.getActivityDetails(
              runData.strava_activity_id,
              profile.strava_access_token
            );
            
            const cadence = activity.average_cadence 
              ? Math.round(activity.average_cadence * 2) 
              : null;
            
            if (cadence) {
              await databaseService.updateRun(runData.id, userId, { cadence });
              enrichedRunData.cadence = cadence;
              console.log(`✅ Updated cadence: ${cadence} spm`);
            }
          } catch (error) {
            console.warn('⚠️ Failed to fetch cadence:', error.message);
          }
        }
      }
      
      // Generate analysis
      const analysis = await openaiService.analyzeRun(enrichedRunData);
      
      // Save to database
      const savedAnalysis = await databaseService.saveAnalysis(runData.id, userId, analysis);
      
      console.log('✅ Saved analysis for run:', runData.id);
      
      res.json({
        id: savedAnalysis.id,
        ...analysis
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RunsController();
