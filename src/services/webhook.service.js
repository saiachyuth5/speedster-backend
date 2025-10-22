const stravaService = require('./strava.service');
const databaseService = require('./database.service');

class WebhookService {
  /**
   * Handle activity creation webhook
   */
  async handleActivityCreate(activityId, athleteId) {
    console.log(`📥 Processing create event for activity ${activityId}`);
    
    const profile = await databaseService.getUserProfileByStravaId(athleteId);
    if (!profile) {
      console.error(`❌ No user found for Strava athlete ${athleteId}`);
      return;
    }

    if (new Date(profile.strava_token_expires_at) <= new Date()) {
      console.error(`❌ Strava token expired for user ${profile.id}`);
      return;
    }

    const activity = await stravaService.getActivityDetails(activityId, profile.strava_access_token);

    if (activity.type !== 'Run') {
      console.log(`ℹ️ Activity ${activityId} is not a run (${activity.type}), skipping`);
      return;
    }

    console.log(`🏃 Processing run: ${activity.name} (${activityId})`);

    const runData = stravaService.transformActivity(activity, profile.id);
    await databaseService.saveRuns([runData]);

    console.log(`✅ Successfully saved run ${activityId} for user ${profile.id}`);
  }

  /**
   * Handle activity update webhook
   */
  async handleActivityUpdate(activityId, athleteId) {
    console.log(`🔄 Processing update event for activity ${activityId}`);
    
    const profile = await databaseService.getUserProfileByStravaId(athleteId);
    if (!profile) {
      console.error(`❌ No user found for Strava athlete ${athleteId}`);
      return;
    }

    // Check if run exists
    const { data: existingRun } = await databaseService.getUserRuns(profile.id);
    const run = existingRun?.find(r => r.strava_activity_id === activityId.toString());

    if (!run) {
      console.log(`ℹ️ Activity ${activityId} not in database, treating as create`);
      return this.handleActivityCreate(activityId, athleteId);
    }

    if (new Date(profile.strava_token_expires_at) <= new Date()) {
      console.error(`❌ Strava token expired for user ${profile.id}`);
      return;
    }

    const activity = await stravaService.getActivityDetails(activityId, profile.strava_access_token);
    const runData = stravaService.transformActivity(activity, profile.id);
    
    // Remove user_id from updates
    delete runData.user_id;
    delete runData.strava_activity_id;
    
    await databaseService.updateRun(run.id, profile.id, runData);

    console.log(`✅ Successfully updated run ${activityId} for user ${profile.id}`);
  }

  /**
   * Handle activity deletion webhook
   */
  async handleActivityDelete(activityId, athleteId) {
    console.log(`🗑️ Processing delete event for activity ${activityId}`);
    
    const profile = await databaseService.getUserProfileByStravaId(athleteId);
    if (!profile) {
      console.error(`❌ No user found for Strava athlete ${athleteId}`);
      return;
    }

    await databaseService.deleteRunByStravaId(activityId, profile.id);

    console.log(`✅ Successfully deleted run ${activityId} for user ${profile.id}`);
  }
}

module.exports = new WebhookService();
