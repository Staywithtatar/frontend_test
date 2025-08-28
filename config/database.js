const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
  allowExitOnIdle: true
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Handle pool connect events
pool.on('connect', (client) => {
  console.log('🔌 New client connected to database');
});

// Handle pool acquire events
pool.on('acquire', (client) => {
  console.log('🔑 Client acquired from pool');
});

// Handle pool release events
pool.on('release', (client) => {
  console.log('🔓 Client released back to pool');
});

const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const result = await client.query('SELECT NOW()');
    console.log('📊 Database query test successful:', result.rows[0]);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Graceful shutdown
const closePool = async () => {
  console.log('🔄 Closing database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
};

module.exports = { pool, testConnection, closePool };
