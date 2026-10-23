const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const itemsRoutes = require("./routes/itemsRoutes");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/items", itemsRoutes);

app.use((req, res, next) => {
  const error = new Error(
    `Route not found: ${req.method} ${req.originalUrl}`
  );

  error.statusCode = 404;
  next(error);
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  if (err.code === "23505") {
    statusCode = 409;
    message = "A record with this value already exists";
  } else if (err.code === "23503") {
    statusCode = 400;
    message = "The referenced category does not exist";
  } else if (err.code === "23514") {
    statusCode = 400;
    message = "Data violates a database constraint";
  }

  if (statusCode >= 500) {
    console.error(err);

    if (process.env.NODE_ENV === "production") {
      message = "Internal server error";
    }
  }

  return res.status(statusCode).json({
    success: false,
    message
  });
});

module.exports = app;
