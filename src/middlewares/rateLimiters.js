const { rateLimit } = require("express-rate-limit");

function createLimiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message
    }
  });
}

const loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again later."
);

const registerLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  "Too many registration attempts. Please try again later."
);

const verifyEmailLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many verification attempts. Try again later."
);

const resendVerificationLimiter = createLimiter(
  60 * 60 * 1000,
  3,
  "Too many verification requests. Try again later."
);

const forgotPasswordLimiter = createLimiter(
  60 * 60 * 1000,
  5,
  "Too many password reset requests. Try again later."
);

const resetPasswordLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  "Too many reset attempts. Please try again later."
);

module.exports = {
  loginLimiter,
  registerLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter
};
