/**
 * Server-side Turnstile verification example (Node.js/Express)
 * Include this in your server routes where you need to verify Turnstile tokens
 */
import { turnstile } from '@shared-utils/utils';

// Configure Turnstile for server-side verification
turnstile.setOptions({
  secretKey: process.env.TURNSTILE_SECRET_KEY, // Set this environment variable
  // Optional: Use your deployed Cloudflare Worker instead of direct API
  // apiUrl: 'https://your-worker.your-subdomain.workers.dev/verify',
  interceptor: (action, data) => {
    console.log(`Turnstile ${action}:`, data);
    
    // Example: Log verification attempts
    if (action === 'verify-complete') {
      console.log('Turnstile verification result:', {
        success: data.result.success,
        timestamp: data.result.challenge_ts,
        hostname: data.result.hostname,
        errors: data.result['error-codes'],
      });
    }
  }
});

// Express.js middleware for Turnstile verification
export const verifyTurnstile = async (req, res, next) => {
  try {
    const token = req.body['cf-turnstile-response'] || req.body.turnstileToken;
    
    if (!token) {
      return res.status(400).json({
        error: 'Turnstile token is required',
        code: 'MISSING_TURNSTILE_TOKEN'
      });
    }

    // Get client IP
    const clientIP = req.ip || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);

    // Verify token
    const result = await turnstile.verify(token, clientIP);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Turnstile verification failed',
        code: 'TURNSTILE_VERIFICATION_FAILED',
        details: result['error-codes']
      });
    }

    // Add verification result to request for downstream use
    req.turnstile = result;
    next();
    
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return res.status(500).json({
      error: 'Internal server error during Turnstile verification',
      code: 'TURNSTILE_INTERNAL_ERROR'
    });
  }
};

// Example route using the middleware
export const setupTurnstileRoutes = (app) => {
  // Contact form with Turnstile protection
  app.post('/api/contact', verifyTurnstile, async (req, res) => {
    const { name, email, message } = req.body;
    
    try {
      // Process the contact form (save to database, send email, etc.)
      console.log('Processing contact form from verified user:', {
        name,
        email,
        turnstile: req.turnstile
      });
      
      res.json({ 
        success: true, 
        message: 'Contact form submitted successfully' 
      });
    } catch (error) {
      console.error('Contact form processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process contact form' 
      });
    }
  });

  // Login with Turnstile protection
  app.post('/api/auth/login', verifyTurnstile, async (req, res) => {
    const { username, password } = req.body;
    
    try {
      // Authenticate user
      // ... authentication logic here
      
      console.log('Login attempt from verified user:', {
        username,
        turnstile: req.turnstile
      });
      
      res.json({ 
        success: true, 
        message: 'Login successful' 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ 
        error: 'Authentication failed' 
      });
    }
  });
};

export default turnstile;
