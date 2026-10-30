const Joi = require("joi");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const repository = require("../repositories/passwordResetRepository");

const forgotSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required()
});

const resetSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
  otp: Joi.string().pattern(/^\d{6}$/).required(),
  newPassword: Joi.string().min(8).max(72).required()
});

function validate(schema, input) {
  const { error, value } = schema.validate(input, {
    abortEarly: false
  });

  if (error) {
    const err = new Error(
      error.details.map((detail) => detail.message).join("; ")
    );
    err.statusCode = 400;
    throw err;
  }

  return value;
}

function hashOtp(otp) {
  const secret = process.env.OTP_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_SECRET must be configured securely");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(otp)
    .digest("hex");
}

async function forgotPassword(input) {
  const data = validate(forgotSchema, input);
  const email = data.email.toLowerCase();

  const user = await repository.findVerifiedUserByEmail(email);

  // Do not reveal whether an account exists.
  if (user) {
    const otp = crypto.randomInt(100000, 1000000).toString();

    await repository.saveResetOtp(
      user.id,
      hashOtp(otp),
      new Date(Date.now() + 10 * 60 * 1000)
    );

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[DEV ONLY] Password reset OTP for ${email}: ${otp} (expires in 10 minutes)`
      );
    }
  }

  return {
    message: "If a verified account exists, a reset code has been generated."
  };
}

async function resetPassword(input) {
  const data = validate(resetSchema, input);
  const email = data.email.toLowerCase();

  const newPasswordHash = await bcrypt.hash(data.newPassword, 12);

  const result = await repository.resetPasswordWithOtp({
    email,
    otpHash: hashOtp(data.otp),
    newPasswordHash
  });

  if (result.status === "expired") {
    const error = new Error("Reset code expired. Request a new code.");
    error.statusCode = 400;
    throw error;
  }

  if (result.status === "max_attempts") {
    const error = new Error(
      "Too many incorrect attempts. Request a new code."
    );
    error.statusCode = 429;
    throw error;
  }

  if (result.status !== "reset") {
    const error = new Error("Invalid reset code");
    error.statusCode = 400;
    throw error;
  }

  return {
    message: "Password reset successful. Please log in again."
  };
}

module.exports = {
  forgotPassword,
  resetPassword
};
