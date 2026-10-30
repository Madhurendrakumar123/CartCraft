const { timingSafeEqual } = require("crypto");
const pool = require("../config/db");

async function findVerifiedUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, email
     FROM users
     WHERE email = $1 AND is_verified = TRUE`,
    [email]
  );

  return result.rows[0] || null;
}

async function saveResetOtp(userId, otpHash, expiresAt) {
  await pool.query(
    `INSERT INTO password_reset_otps
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

async function resetPasswordWithOtp({
  email,
  otpHash,
  newPasswordHash
}) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(
      `SELECT
         u.id,
         o.otp_hash AS "otpHash",
         o.expires_at AS "expiresAt",
         o.attempts
       FROM users u
       JOIN password_reset_otps o ON o.user_id = u.id
       WHERE u.email = $1 AND u.is_verified = TRUE
       FOR UPDATE OF u, o`,
      [email]
    );

    if (result.rows.length === 0) {
      await client.query("COMMIT");
      transactionStarted = false;
      return { status: "invalid" };
    }

    const record = result.rows[0];

    if (Number(record.attempts) >= 5) {
      await client.query("COMMIT");
      transactionStarted = false;
      return { status: "max_attempts" };
    }

    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      await client.query(
        "DELETE FROM password_reset_otps WHERE user_id = $1",
        [record.id]
      );

      await client.query("COMMIT");
      transactionStarted = false;
      return { status: "expired" };
    }

    const storedHash = Buffer.from(record.otpHash, "hex");
    const receivedHash = Buffer.from(otpHash, "hex");

    const matches =
      storedHash.length === receivedHash.length &&
      timingSafeEqual(storedHash, receivedHash);

    if (!matches) {
      const updated = await client.query(
        `UPDATE password_reset_otps
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
       SET password_hash = $1,
           token_version = token_version + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, record.id]
    );

    await client.query(
      "DELETE FROM password_reset_otps WHERE user_id = $1",
      [record.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return { status: "reset" };
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
  findVerifiedUserByEmail,
  saveResetOtp,
  resetPasswordWithOtp
};
