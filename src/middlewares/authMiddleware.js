const jwt = require("jsonwebtoken");
const sessionRepository = require("../repositories/sessionRepository");

async function protect(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  let payload;

  try {
    payload = jwt.verify(
      authorization.slice("Bearer ".length),
      process.env.JWT_SECRET
    );
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token"
    });
  }

  if (
    !payload.sub ||
    !Number.isInteger(payload.ver) ||
    !["customer", "admin"].includes(payload.role)
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid access token"
    });
  }

  try {
    const currentUser =
      await sessionRepository.findAccessStateById(payload.sub);

    if (
      !currentUser ||
      Number(currentUser.tokenVersion) !== payload.ver
    ) {
      return res.status(401).json({
        success: false,
        message: "Session invalidated. Please log in again."
      });
    }

    // Use the current database role, not a potentially stale JWT role.
    req.user = {
      id: String(currentUser.id),
      role: currentUser.role
    };

    return next();
  } catch (error) {
    return next(error);
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
