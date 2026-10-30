const service = require("../services/passwordResetService");
const asyncHandler = require("../utils/asyncHandler");

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await service.forgotPassword(req.body);

  res.status(200).json({
    success: true,
    ...result
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await service.resetPassword(req.body);

  res.status(200).json({
    success: true,
    ...result
  });
});

module.exports = {
  forgotPassword,
  resetPassword
};
