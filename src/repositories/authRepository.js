const { timingSafeEqual } = require("crypto");
const pool = require("../config/db");

async function findByEmail(email) {
  const result = await pool.query(
    `SELECT
       id,
       name,
       email,
       password_hash AS "passwordHash",
       role,
       token_version AS "tokenVersion",
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

async function saveVerificationOtp(userId, otpHash, expiresAt) {
  await pool.query(
    `INSERT INTO email_verification_otps
       (user_id, otp_hash, expires_at, attempts, created_at)
     VALUES ($1, $2, $3, 0, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       otp_hash = EXCLUDED.otp_hash,
       expires_at = EXCLUDED.expires_at,
       attempts = 0,
       created_at = NOW()`,
    [userId, otpHash, expiresAt]
  );
}

async function verifyEmailOtp(email, suppliedHash) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(
      `SELECT
         u.id,
         u.is_verified AS "isVerified",
         o.otp_hash AS "otpHash",
         o.expires_at AS "expiresAt",
         o.attempts
       FROM users u
       JOIN email_verification_otps o ON o.user_id = u.id
       WHERE u.email = $1
       FOR UPDATE OF u, o`,
      [email]
    );

    if (result.rows.length === 0) {
      await client.query("COMMIT");
      transactionStarted = false;
      return { status: "invalid" };
    }

    const record = result.rows[0];

    if (record.isVerified) {
      await client.query(
        "DELETE FROM email_verification_otps WHERE user_id = $1",
        [record.id]
      );
      await client.query("COMMIT");
      transactionStarted = false;
      return { status: "already_verified" };
    }

    if (Number(record.attempts) >= 5) {
      await client.query("COMMIT");
      transactionStarted = false;
      return { status: "max_attempts" };
    }

    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      await client.query(
        "DELETE FROM email_verification_otps WHERE user_id = $1",
        [record.id]
      );
      await client.query("COMMIT");
      transactionStarted = false;
      return { status: "expired" };
    }

    const storedHash = Buffer.from(record.otpHash, "hex");
    const receivedHash = Buffer.from(suppliedHash, "hex");

    const matches =
      storedHash.length === receivedHash.length &&
      timingSafeEqual(storedHash, receivedHash);

    if (!matches) {
      const updated = await client.query(
        `UPDATE email_verification_otps
         SET attempts = attempts + 1
         WHERE user_id = $1
         RETURNING attempts`,
        [record.id]
      );

      await client.query("COMMIT");
      transactionStarted = false;

      return {
        status: Number(updated.rows[0].attempts) >= 5
          ? "max_attempts"
          : "invalid"
      };
    }

    await client.query(
      `UPDATE users
       SET is_verified = TRUE, updated_at = NOW()
       WHERE id = $1`,
      [record.id]
    );

    await client.query(
      "DELETE FROM email_verification_otps WHERE user_id = $1",
      [record.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return { status: "verified" };
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {});
    }

    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  findByEmail,
  createUser,
  findPublicById,
  saveVerificationOtp,
  verifyEmailOtp
};
