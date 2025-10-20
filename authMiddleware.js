const supabase = require('./supabaseClient');

/**
 * Authentication middleware for validating Supabase JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = async (req, res, next) => {
    try {
        // Extract the Bearer token from the Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            console.log('❌ Authentication failed: No token provided');
            return res.status(401).json({
                error: 'Authentication required',
                message: 'No authentication token provided'
            });
        }

        // Check if it's a Bearer token
        if (!authHeader.startsWith('Bearer ')) {
            console.log('❌ Authentication failed: Invalid token format');
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Token must be Bearer token'
            });
        }

        // Extract the token
        const token = authHeader.split(' ')[1];

        // Verify the token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) {
            console.log('❌ Authentication failed:', error.message);
            
            // Handle specific error cases
            if (error.message.includes('expired')) {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Your session has expired. Please log in again.'
                });
            }
            
            if (error.message.includes('invalid')) {
                return res.status(401).json({
                    error: 'Invalid token',
                    message: 'The provided authentication token is invalid'
                });
            }

            // Generic auth error
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Could not verify authentication token'
            });
        }

        if (!user) {
            console.log('❌ Authentication failed: No user found');
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'User not found'
            });
        }

        // Attach the user object to the request
        req.user = user;
        console.log('✅ Authentication successful for user:', user.id);
        next();

    } catch (error) {
        // Handle unexpected server errors
        console.error('❌ Server error during authentication:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An unexpected error occurred during authentication'
        });
    }
};

module.exports = authMiddleware;