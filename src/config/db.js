const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "cartcraft",
  user: process.env.DB_USER || "madhurendra_app",
  password: process.env.DB_PASSWORD,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on("error", (error) => {
  console.error(
    "Unexpected idle PostgreSQL client error:",
    error.message
  );
});

module.exports = pool;
