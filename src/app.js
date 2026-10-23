const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const healthRoutes = require("./routes/healthRoutes");

const app = express();

// Security-related HTTP headers.
app.use(helmet());

// Allow the configured frontend origin.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  })
);

// Parse incoming JSON request bodies.
app.use(express.json({ limit: "1mb" }));

// API routes.
app.use("/api/health", healthRoutes);

// Handle unknown routes.
app.use((req, res, next) => {
  const error = new Error(
    `Route not found: ${req.method} ${req.originalUrl}`
  );

  error.statusCode = 404;
  next(error);
});

// Centralized error handler. Keep this last.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;

  const message =
    process.env.NODE_ENV === "production" && statusCode >= 500
      ? "Internal server error"
      : err.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message
  });
});

module.exports = app;
