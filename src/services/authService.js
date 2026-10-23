const Joi = require("joi");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

async function register(input) {
  const data = validate(registerSchema, input);

  const name = data.name;
  const email = data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(data.password, 12);

  let user;

  try {
    user = await authRepository.createUser({
      name,
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

  return {
    user: publicUser(user),
    accessToken: createAccessToken(user)
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

  return {
    user: publicUser(user),
    accessToken: createAccessToken(user)
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
  getCurrentUser
};
