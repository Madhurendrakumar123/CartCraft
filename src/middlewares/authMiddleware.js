const jwt = require("jsonwebtoken");

function protect(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const token = authorization.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.sub || !["customer", "admin"].includes(payload.role)) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token"
      });
    }

    req.user = {
      id: String(payload.sub),
      role: payload.role
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token"
    });
  }
}

function restrictTo(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action"
      });
    }

    return next();
  };
}

module.exports = {
  protect,
  restrictTo
};
