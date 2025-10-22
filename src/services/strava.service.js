const axios = require('axios');
const config = require('../config/env');
const constants = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');

class StravaService {
  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code) {
    try {
      const response = await axios.post(constants.STRAVA_OAUTH_URL, {
        client_id: config.STRAVA_CLIENT_ID,
        client_secret: config.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Strava token exchange failed:', error.response?.data || error.message);
      throw new AppError('Failed to connect Strava account', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetch athlete activities from Strava
   */
  async fetchActivities(accessToken) {
    try {
      const response = await axios.get(`${constants.STRAVA_API_BASE_URL}/athlete/activities`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { per_page: constants.STRAVA_ACTIVITIES_PER_PAGE }
      });
      
      // Filter only running activities
      return response.data.filter(activity => activity.type === 'Run');
    } catch (error) {
      console.error('❌ Failed to fetch Strava activities:', error.response?.data || error.message);
      throw new AppError('Failed to fetch activities from Strava', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get detailed activity information
   */
  async getActivityDetails(activityId, accessToken) {
    try {
      const response = await axios.get(
        `${constants.STRAVA_API_BASE_URL}/activities/${activityId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch activity ${activityId}:`, error.response?.data || error.message);
      throw new AppError('Failed to fetch activity details', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Transform Strava activity to database format
   */
  transformActivity(activity, userId) {
    return {
      user_id: userId,
      strava_activity_id: activity.id.toString(),
      name: activity.name,
      date: new Date(activity.start_date).toISOString(),
      distance: Math.round(activity.distance || 0),
      duration: activity.moving_time,
      pace: ((activity.moving_time / 60) / (activity.distance / 1000)).toFixed(2),
      avg_heart_rate: Math.round(activity.average_heartrate || 0),
      cadence: activity.average_cadence ? Math.round(activity.average_cadence * 2) : null,
      elevation_gain: Math.round(activity.total_elevation_gain || 0),
      updated_at: new Date().toISOString()
    };
  }
}

module.exports = new StravaService();
