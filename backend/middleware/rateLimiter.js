const rateLimit = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => (req.user && req.user.id ? String(req.user.id) : req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Limit is 20 per hour.' },
});

module.exports = { aiRateLimiter };
