const healthService = require("../services/healthService");

function getHealth(req, res) {
  return res.status(200).json({
    success: true,
    message: "CartCraft API is running",
    data: {
      status: "ok",
      timestamp: new Date().toISOString()
    }
  });
}

async function getDatabaseHealth(req, res, next) {
  try {
    const databaseInfo =
      await healthService.getDatabaseHealth();

    return res.status(200).json({
      success: true,
      message: "Database connection successful",
      data: {
        status: "ok",
        database: databaseInfo.database,
        serverTime: databaseInfo.server_time
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHealth,
  getDatabaseHealth
};
