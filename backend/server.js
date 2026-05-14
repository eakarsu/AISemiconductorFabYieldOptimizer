const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initializeDatabase } = require('./config/schema');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

// Serve uploaded files (wafer images)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount auth routes (public)
const authRoute = require('./routes/auth');
app.use('/api/auth', authRoute);
// === Batch 07 Gaps & Frontend Mounts ===
app.use('/api/gap-no-yieldprediction-modeldriven', require('./routes/gap-no-yieldprediction-modeldriven'));
app.use('/api/gap-no-rootcauseanalysis-ai-only-manual-records', require('./routes/gap-no-rootcauseanalysis-ai-only-manual-records'));
app.use('/api/gap-no-processoptimization-parameter-recs', require('./routes/gap-no-processoptimization-parameter-recs'));
app.use('/api/gap-no-defectprediction-ratetype-ml', require('./routes/gap-no-defectprediction-ratetype-ml'));
app.use('/api/gap-no-equipmenthealthforecast', require('./routes/gap-no-equipmenthealthforecast'));
app.use('/api/gap-no-reciperecommendation-ai', require('./routes/gap-no-reciperecommendation-ai'));
app.use('/api/gap-no-realtime-spc-charting-records-only', require('./routes/gap-no-realtime-spc-charting-records-only'));
app.use('/api/gap-no-integration-with-fab-equipment-secsgem', require('./routes/gap-no-integration-with-fab-equipment-secsgem'));
app.use('/api/gap-no-equipment-calibration-tracking', require('./routes/gap-no-equipment-calibration-tracking'));
app.use('/api/gap-no-meserp-integration', require('./routes/gap-no-meserp-integration'));
app.use('/api/gap-no-alertingnotifications-system', require('./routes/gap-no-alertingnotifications-system'));
app.use('/api/gap-limited-auditrbac-for-sensitive-recipe-data', require('./routes/gap-limited-auditrbac-for-sensitive-recipe-data'));
// === End Batch 07 ===

// Mount all other route files with auth middleware
const fs = require('fs');
const routesDir = path.join(__dirname, 'routes');
const excludeFiles = ['aiHelper.js', 'auth.js'];
if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir).forEach((file) => {
    if (file.endsWith('.js') && !excludeFiles.includes(file)) {
      const routeName = file.replace('.js', '')
        .replace(/([A-Z])/g, '-$1').toLowerCase();
      const route = require(path.join(routesDir, file));
      app.use(`/api/${routeName}`, authMiddleware, route);
      console.log(`Mounted route: /api/${routeName} (auth protected)`);
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found' } });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
