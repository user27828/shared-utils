/**
 * Express.js middleware example for request logging
 */
import { log } from '@user27828/shared-utils/utils';

// Initialize logger for Express app
log.setOptions({
  server: {
    namespace: 'Express',
    production: ['info', 'warn', 'error']
  }
});

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  log.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'] || 'unknown'
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    log[level](`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      duration: `${duration}ms`,
      responseSize: res.get('Content-Length') || '0'
    });
  });

  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  log.error('Request error:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  next(err);
};

export default log;
