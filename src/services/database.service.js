const supabase = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const constants = require('../config/constants');

class DatabaseService {
  /**
   * Get user profile with Strava tokens
   */
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      throw new AppError(constants.ERROR_MESSAGES.PROFILE_NOT_FOUND, constants.HTTP_STATUS.NOT_FOUND);
    }
    
    return data;
  }

  /**
   * Get user profile by Strava athlete ID
   */
  async getUserProfileByStravaId(stravaId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('strava_id', stravaId.toString())
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data;
  }

  /**
   * Save Strava tokens and athlete info
   */
  async saveStravaConnection(userId, tokens) {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        strava_id: tokens.athlete.id.toString(),
        strava_access_token: tokens.access_token,
        strava_refresh_token: tokens.refresh_token,
        strava_token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('❌ Failed to save Strava connection:', error);
      throw new AppError('Failed to save Strava connection', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Save multiple runs to database
   */
  async saveRuns(runs) {
    const { error } = await supabase
      .from('runs')
      .upsert(runs, {
        onConflict: 'strava_activity_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('❌ Failed to save runs:', error);
      throw new AppError('Failed to save runs to database', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get user's runs with analysis status
   */
  async getUserRuns(userId) {
    const { data, error } = await supabase
      .from('runs')
      .select(`
        id,
        strava_activity_id,
        name,
        date,
        distance,
        duration,
        pace,
        avg_heart_rate,
        cadence,
        elevation_gain,
        run_analyses(id)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('❌ Failed to fetch runs:', error);
      throw new AppError('Failed to fetch runs from database', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    
    return data;
  }

  /**
   * Get single run by ID
   */
  async getRunById(runId, userId) {
    const { data, error } = await supabase
      .from('runs')
      .select('*')
      .eq('id', runId)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      throw new AppError('Run not found', constants.HTTP_STATUS.NOT_FOUND);
    }
    
    return data;
  }

  /**
   * Update run data
   */
  async updateRun(runId, userId, updates) {
    const { error } = await supabase
      .from('runs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', runId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Failed to update run:', error);
      throw new AppError('Failed to update run', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Delete run by Strava activity ID
   */
  async deleteRunByStravaId(stravaActivityId, userId) {
    const { error } = await supabase
      .from('runs')
      .delete()
      .eq('strava_activity_id', stravaActivityId.toString())
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Failed to delete run:', error);
      throw new AppError('Failed to delete run', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get existing analysis for a run
   */
  async getAnalysis(runId) {
    const { data, error } = await supabase
      .from('run_analyses')
      .select('id, summary, insights, recommendations')
      .eq('run_id', runId)
      .single();
    
    if (error) {
      return null;
    }
    
    return data;
  }

  /**
   * Save analysis to database
   */
  async saveAnalysis(runId, userId, analysis) {
    const { data, error } = await supabase
      .from('run_analyses')
      .insert({
        run_id: runId,
        user_id: userId,
        summary: analysis.summary,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to save analysis:', error);
      throw new AppError('Failed to save analysis', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
    
    return data;
  }

  /**
   * Get conversation for a run
   */
  async getConversation(userId, runId) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, messages')
      .eq('user_id', userId)
      .eq('run_id', runId)
      .single();
    
    if (error) {
      return null;
    }
    
    return data;
  }

  /**
   * Create new conversation
   */
  async createConversation(userId, runId, messages) {
    const { error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        run_id: runId,
        messages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ Failed to create conversation:', error);
      throw new AppError('Failed to create conversation', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Update existing conversation
   */
  async updateConversation(conversationId, messages) {
    const { error } = await supabase
      .from('conversations')
      .update({
        messages,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
    
    if (error) {
      console.error('❌ Failed to update conversation:', error);
      throw new AppError('Failed to update conversation', constants.HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Transform database run to API format
   */
  transformRunToAPI(run) {
    return {
      id: run.id,
      strava_activity_id: run.strava_activity_id,
      name: run.name,
      date: run.date,
      distance: run.distance,
      duration: run.duration,
      pace: run.pace,
      avgHR: run.avg_heart_rate,
      cadence: run.cadence,
      elevation: run.elevation_gain,
      analyzed: run.run_analyses && run.run_analyses.length > 0
    };
  }
}

module.exports = new DatabaseService();
