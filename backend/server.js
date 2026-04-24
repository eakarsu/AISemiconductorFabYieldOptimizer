const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./config/schema');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route files
const fs = require('fs');
const routesDir = path.join(__dirname, 'routes');
const excludeFiles = ['aiHelper.js'];
if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir).forEach((file) => {
    if (file.endsWith('.js') && !excludeFiles.includes(file)) {
      const routeName = file.replace('.js', '')
        .replace(/([A-Z])/g, '-$1').toLowerCase(); // camelCase to kebab-case
      const route = require(path.join(routesDir, file));
      app.use(`/api/${routeName}`, route);
      console.log(`Mounted route: /api/${routeName}`);
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
