const Joi = require("joi");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const authRepository = require("../repositories/authRepository");

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(72).required()
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(1).max(72).required()
});

const verifySchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
  otp: Joi.string().pattern(/^\d{6}$/).required()
});

const resendSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required()
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

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt
  };
}

function createAccessToken(user) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured securely");
  }

  return jwt.sign(
    { role: user.role },
    secret,
    {
      subject: String(user.id),
      expiresIn: process.env.JWT_EXPIRES_IN || "15m"
    }
  );
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

async function issueVerificationOtp(user) {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await authRepository.saveVerificationOtp(
    user.id,
    otpHash,
    expiresAt
  );

  // Development only: actual email delivery is not configured yet.
  if (process.env.NODE_ENV === "development") {
    console.info(
      `[DEV ONLY] Verification OTP for ${user.email}: ${otp} (expires in 10 minutes)`
    );
  }

  return otp;
}

async function register(input) {
  const data = validate(registerSchema, input);
  const email = data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(data.password, 12);

  let user;

  try {
    user = await authRepository.createUser({
      name: data.name,
      email,
      passwordHash
    });
  } catch (error) {
    if (error.code === "23505") {
      const conflict = new Error("Email is already registered");
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  }

  await issueVerificationOtp(user);

  return {
    user: publicUser(user),
    verificationRequired: true
  };
}

async function login(input) {
  const data = validate(loginSchema, input);
  const email = data.email.toLowerCase();
  const user = await authRepository.findByEmail(email);

  const passwordMatches = user
    ? await bcrypt.compare(data.password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isVerified) {
    const error = new Error("Please verify your email before logging in");
    error.statusCode = 403;
    throw error;
  }

  return {
    user: publicUser(user),
    accessToken: createAccessToken(user)
  };
}

async function verifyEmail(input) {
  const data = validate(verifySchema, input);
  const email = data.email.toLowerCase();
  const result = await authRepository.verifyEmailOtp(
    email,
    hashOtp(data.otp)
  );

  if (
    result.status === "verified" ||
    result.status === "already_verified"
  ) {
    return {
      email,
      verified: true
    };
  }

  if (result.status === "expired") {
    const error = new Error("OTP expired. Request a new code.");
    error.statusCode = 400;
    throw error;
  }

  if (result.status === "max_attempts") {
    const error = new Error(
      "Too many invalid OTP attempts. Request a new code."
    );
    error.statusCode = 429;
    throw error;
  }

  const error = new Error("Invalid verification code");
  error.statusCode = 400;
  throw error;
}

async function resendVerification(input) {
  const data = validate(resendSchema, input);
  const email = data.email.toLowerCase();
  const user = await authRepository.findByEmail(email);

  // Use the same response whether the account exists or not.
  if (user && !user.isVerified) {
    await issueVerificationOtp(user);
  }

  return {
    message: "If an unverified account exists, a verification code has been generated."
  };
}

async function getCurrentUser(id) {
  const user = await authRepository.findPublicById(id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 401;
    throw error;
  }

  return publicUser(user);
}

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  getCurrentUser
};
