const express = require("express");

const authController = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const {
  loginLimiter,
  registerLimiter
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

router.get("/me", protect, authController.me);

module.exports = router;
