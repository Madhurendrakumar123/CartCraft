const express = require("express");

const {
  listItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} = require("../controllers/itemsController");

const {
  protect,
  restrictTo
} = require("../middlewares/authMiddleware");

const router = express.Router();

// Public read APIs
router.get("/", listItems);
router.get("/:id", getItemById);

// Admin-only write APIs
router.post("/", protect, restrictTo("admin"), createItem);
router.patch("/:id", protect, restrictTo("admin"), updateItem);
router.delete("/:id", protect, restrictTo("admin"), deleteItem);

module.exports = router;
