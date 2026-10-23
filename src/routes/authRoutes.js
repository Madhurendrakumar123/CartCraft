const express = require("express");

const authController = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

const {
  loginLimiter,
  registerLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter
} = require("../middlewares/rateLimiters");

const router = express.Router();

router.post(
  "/register",
  registerLimiter,
  authController.register
);

router.post(
  "/login",
  loginLimiter,
  authController.login
);

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

router.get("/me", protect, authController.me);

module.exports = router;
