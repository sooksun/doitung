// scripts/check-database.js
// Check and create database if not exists

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

const DB_NAME = 'okrsdoitung';

// Parse DATABASE_URL or use default for Laragon
let connectionConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
};

// Try to parse from DATABASE_URL if exists
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL.replace('mysql://', 'http://'));
  connectionConfig = {
    host: url.hostname || 'localhost',
    port: url.port ? parseInt(url.port) : 3306,
    user: url.username || 'root',
    password: url.password || '',
  };
}

async function setupDatabase() {
  let connection;
  
  try {
    console.log('Connecting to MySQL server...');
    console.log(`Host: ${connectionConfig.host}:${connectionConfig.port}`);
    console.log(`User: ${connectionConfig.user}`);
    
    // Connect without selecting database
    connection = await mysql.createConnection(connectionConfig);
    console.log('✓ Connected to MySQL server\n');

    // Check if database exists
    const [databases] = await connection.query(
      'SHOW DATABASES LIKE ?',
      [DB_NAME]
    );

    if (databases.length === 0) {
      console.log(`Creating database: ${DB_NAME}...`);
      await connection.query(
        `CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✓ Database '${DB_NAME}' created successfully!\n`);
    } else {
      console.log(`✓ Database '${DB_NAME}' already exists\n`);
    }

    // Test connection to the database
    await connection.query(`USE \`${DB_NAME}\``);
    console.log(`✓ Can connect to database '${DB_NAME}'\n`);

    console.log('Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. npm run db:generate');
    console.log('2. npm run db:push');
    console.log('3. npm run db:seed');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. MySQL is running in Laragon');
    console.error('2. MySQL connection settings are correct');
    console.error('3. User has CREATE DATABASE permission');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();

