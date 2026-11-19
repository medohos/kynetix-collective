const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool optimized for XAMPP / MariaDB / MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'kynetix_collective',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Non-fatal connection verification at boot
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL (${process.env.DB_NAME || 'kynetix_collective'}) on port ${process.env.DB_PORT || 3306}`);
    conn.release();
    return true;
  } catch (err) {
    console.error(`[Database Warning] Unable to connect to MySQL: ${err.message}`);
    console.error(`[Tip] Make sure MySQL is running in your XAMPP Control Panel and 'kynetix_schema.sql' has been imported.`);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
