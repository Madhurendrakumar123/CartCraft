const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  res.status(201).json({
    success: true,
    message: "Registration successful. Verify your email to log in.",
    data: result
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body);

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
    data: result
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerification(req.body);

  res.status(200).json({
    success: true,
    ...result
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  me
};
