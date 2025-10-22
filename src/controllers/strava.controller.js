const stravaService = require('../services/strava.service');
const databaseService = require('../services/database.service');
const constants = require('../config/constants');

class StravaController {
  /**
   * Connect Strava account
   * POST /api/strava/connect
   */
  async connect(req, res, next) {
    try {
      const { code } = req.body;
      const userId = req.user.id;
      
      console.log('📥 Connecting Strava for user:', userId);
      
      const tokens = await stravaService.exchangeCode(code);
      await databaseService.saveStravaConnection(userId, tokens);
      
      console.log('✅ Strava connected for athlete:', tokens.athlete.id);
      
      res.json({
        success: true,
        athlete: {
          id: tokens.athlete.id,
          username: tokens.athlete.username,
          firstname: tokens.athlete.firstname,
          lastname: tokens.athlete.lastname,
          profile: tokens.athlete.profile_medium
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get and sync activities from Strava
   * GET /api/strava/activities
   */
  async getActivities(req, res, next) {
    try {
      const userId = req.user.id;
      
      console.log('🔄 Syncing activities for user:', userId);
      
      const profile = await databaseService.getUserProfile(userId);
      
      // Check token expiry
      if (new Date(profile.strava_token_expires_at) <= new Date()) {
        return res.status(constants.HTTP_STATUS.UNAUTHORIZED).json({ 
          error: constants.ERROR_MESSAGES.STRAVA_TOKEN_EXPIRED 
        });
      }
      
      // Fetch from Strava
      const activities = await stravaService.fetchActivities(profile.strava_access_token);
      
      // Transform and save
      const runs = activities.map(activity => stravaService.transformActivity(activity, userId));
      await databaseService.saveRuns(runs);
      
      // Get all runs with analysis status
      const savedRuns = await databaseService.getUserRuns(userId);
      const mappedRuns = savedRuns.map(run => databaseService.transformRunToAPI(run));
      
      console.log(`✅ Retrieved ${mappedRuns.length} runs for user:`, userId);
      
      res.json(mappedRuns);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StravaController();
