const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Test connection to XAMPP MySQL database
  await testConnection();

  app.listen(PORT, () => {
    console.log(`
=====================================================
  KYNETIX COLLECTIVE - NODE.JS MVC SERVER
=====================================================
  Status:  ONLINE
  Port:    ${PORT}
  Mode:    ${process.env.NODE_ENV || 'development'}
  Web UI:  http://localhost:${PORT}/
  API:     http://localhost:${PORT}/api/health
=====================================================
    `);
  });
}

startServer();
