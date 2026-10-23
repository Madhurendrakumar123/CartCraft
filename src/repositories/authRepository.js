const pool = require("../config/db");

async function findByEmail(email) {
  const result = await pool.query(
    `SELECT
       id,
       name,
       email,
       password_hash AS "passwordHash",
       role,
       is_verified AS "isVerified",
       created_at AS "createdAt"
     FROM users
     WHERE email = $1`,
    [email]
  );

  return result.rows[0] || null;
}

async function createUser({ name, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING
       id,
       name,
       email,
       role,
       is_verified AS "isVerified",
       created_at AS "createdAt"`,
    [name, email, passwordHash]
  );

  return result.rows[0];
}

async function findPublicById(id) {
  const result = await pool.query(
    `SELECT
       id,
       name,
       email,
       role,
       is_verified AS "isVerified",
       created_at AS "createdAt"
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
}

module.exports = {
  findByEmail,
  createUser,
  findPublicById
};
