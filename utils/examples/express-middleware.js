/**
 * Express.js middleware examples using shared-utils
 * Combines logging and Turnstile verification for complete request handling
 */
import { log, turnstile } from '@shared-utils/utils';

// Configuration would be injected by your application
const CONFIG = {
  turnstileSecretKey: 'your-secret-key-here',  // Injected from your app's env vars
  logLevel: ['info', 'warn', 'error']
};

// Configure utilities for server-side
log.setOptions({
  type: 'server',
  server: {
    namespace: 'ExpressAPI',
    production: CONFIG.logLevel
  }
});

turnstile.setOptions({
  secretKey: CONFIG.turnstileSecretKey  // ✅ Injected configuration
});

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  log.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    query: req.query
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    log[level](`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
      status: res.statusCode,
      duration,
      ip: req.ip
    });
  });

  next();
};

/**
 * Turnstile verification middleware
 */
export const verifyTurnstile = async (req, res, next) => {
  try {
    const token = req.body['cf-turnstile-response'] || req.body.turnstileToken;
    
    if (!token) {
      log.warn('Turnstile token missing', { ip: req.ip, path: req.path });
      return res.status(400).json({
        error: 'Turnstile verification required',
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
      log.warn('Turnstile verification failed', {
        ip: req.ip,
        path: req.path,
        errors: result['error-codes']
      });
      
      return res.status(400).json({
        error: 'Security verification failed',
        code: 'TURNSTILE_VERIFICATION_FAILED',
        details: result['error-codes']
      });
    }

    // Add verification result to request
    req.turnstile = result;
    log.info('Turnstile verification successful', {
      ip: req.ip,
      hostname: result.hostname,
      challenge_ts: result.challenge_ts
    });
    
    next();
    
  } catch (error) {
    log.error('Turnstile verification error', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    
    return res.status(500).json({
      error: 'Internal server error during verification',
      code: 'TURNSTILE_INTERNAL_ERROR'
    });
  }
};

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  log.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  if (res.headersSent) {
    return next(err);
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
};

/**
 * Rate limiting with logging
 */
export const rateLimitLogger = (req, res, next) => {
  // This would typically work with express-rate-limit
  res.on('finish', () => {
    if (res.statusCode === 429) {
      log.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
    }
  });
  next();
};

/**
 * Complete Express app setup example
 */
export const setupExpressApp = (app) => {
  // Basic middleware
  app.use(requestLogger);
  app.use(rateLimitLogger);

  // Protected routes with Turnstile
  app.post('/api/contact', verifyTurnstile, (req, res) => {
    const { name, email, message } = req.body;
    
    log.info('Contact form submitted', {
      name,
      email,
      turnstile: req.turnstile.hostname,
      ip: req.ip
    });

    // Process contact form here
    res.json({ success: true, message: 'Message received' });
  });

  app.post('/api/auth/login', verifyTurnstile, (req, res) => {
    const { username } = req.body;
    
    log.info('Login attempt', {
      username,
      turnstile: req.turnstile.hostname,
      ip: req.ip
    });

    // Process login here
    res.json({ success: true });
  });

  // Error handling (must be last)
  app.use(errorHandler);
  
  return app;
};

export default {
  requestLogger,
  verifyTurnstile,
  errorHandler,
  rateLimitLogger,
  setupExpressApp
};