const express = require("express");

const authController = require("../controllers/authController");
const passwordResetController =
  require("../controllers/passwordResetController");

const { protect } = require("../middlewares/authMiddleware");

const {
  loginLimiter,
  registerLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter
} = require("../middlewares/rateLimiters");

const router = express.Router();

router.post("/register", registerLimiter, authController.register);
router.post("/login", loginLimiter, authController.login);

router.post(
  "/verify-email",
  verifyEmailLimiter,
  authController.verifyEmail
);

router.post(
  "/resend-verification",
  resendVerificationLimiter,
  authController.resendVerification
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  passwordResetController.forgotPassword
);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  passwordResetController.resetPassword
);

router.get("/me", protect, authController.me);

module.exports = router;
