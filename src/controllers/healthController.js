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

module.exports = { getHealth };
