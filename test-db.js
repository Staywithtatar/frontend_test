require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing database connection...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.log('Please create a .env file with your Supabase connection string.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

const testConnection = async () => {
  let client;
  try {
    console.log('🔌 Attempting to connect...');
    client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('📊 Query test successful:');
    console.log('  Current time:', result.rows[0].current_time);
    console.log('  Database version:', result.rows[0].db_version.split(' ')[0]);
    
    // Test if our tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📋 Available tables:');
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    } else {
      console.log('  No tables found');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    if (error.hint) {
      console.error('Error hint:', error.hint);
    }
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
};

testConnection();
