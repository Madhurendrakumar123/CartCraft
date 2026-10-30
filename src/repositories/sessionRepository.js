const pool = require("../config/db");

async function findAccessStateById(id) {
  const result = await pool.query(
    `SELECT
       id,
       role,
       token_version AS "tokenVersion"
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = { findAccessStateById };
