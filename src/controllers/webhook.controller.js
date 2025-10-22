const webhookService = require('../services/webhook.service');
const config = require('../config/env');
const constants = require('../config/constants');

class WebhookController {
  /**
   * Verify webhook subscription
   * GET /webhook/strava
   */
  verify(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔔 Webhook verification request');
    console.log('Mode:', mode, 'Token:', token);

    if (mode === 'subscribe' && token === config.STRAVA_WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ Webhook verified');
      return res.json({ 'hub.challenge': challenge });
    }
    
    console.error('❌ Webhook verification failed');
    res.status(constants.HTTP_STATUS.FORBIDDEN).json({ error: 'Forbidden' });
  }

  /**
   * Handle webhook events
   * POST /webhook/strava
   */
  async handleEvent(req, res) {
    const event = req.body;
    
    console.log('🔔 Webhook event:', JSON.stringify(event, null, 2));
    
    // Acknowledge immediately (Strava expects 200 within 2s)
    res.status(constants.HTTP_STATUS.OK).json({ success: true });

    // Process asynchronously
    try {
      const { aspect_type, object_type, object_id, owner_id } = event;

      if (object_type !== 'activity') {
        console.log('ℹ️ Ignoring non-activity event:', object_type);
        return;
      }

      switch (aspect_type) {
        case 'create':
          await webhookService.handleActivityCreate(object_id, owner_id);
          break;
        
        case 'update':
          await webhookService.handleActivityUpdate(object_id, owner_id);
          break;
        
        case 'delete':
          await webhookService.handleActivityDelete(object_id, owner_id);
          break;
        
        default:
          console.log('⚠️ Unknown event type:', aspect_type);
      }
    } catch (error) {
      console.error('❌ Error processing webhook:', error.message);
      // Don't throw - we already sent 200
    }
  }

  /**
   * Get webhook info
   * GET /webhook/strava/info
   */
  info(req, res) {
    res.json({
      message: 'Strava Webhook Endpoint',
      verification_url: `${req.protocol}://${req.get('host')}/webhook/strava`,
      verify_token: config.STRAVA_WEBHOOK_VERIFY_TOKEN ? '✅ Set' : '❌ Not set',
      instructions: {
        step1: 'Ensure this server is publicly accessible (use ngrok for local dev)',
        step2: 'Add STRAVA_WEBHOOK_VERIFY_TOKEN to your .env file',
        step3: 'Register webhook at: https://www.strava.com/settings/api',
        step4: 'Or use: POST https://www.strava.com/api/v3/push_subscriptions',
        step5: 'Callback URL should be: https://your-domain.com/webhook/strava'
      },
      curl_command: `curl -X POST https://www.strava.com/api/v3/push_subscriptions \\
  -F client_id=<YOUR_CLIENT_ID> \\
  -F client_secret=<YOUR_CLIENT_SECRET> \\
  -F 'callback_url=https://YOUR_DOMAIN/webhook/strava' \\
  -F 'verify_token=<YOUR_VERIFY_TOKEN>'`
    });
  }
}

module.exports = new WebhookController();
