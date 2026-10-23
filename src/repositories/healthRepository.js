const pool = require("../config/db");

async function getDatabaseInfo() {
  const result = await pool.query(`
    SELECT
      current_database() AS database,
      NOW() AS server_time
  `);

  return result.rows[0];
}

module.exports = { getDatabaseInfo };
