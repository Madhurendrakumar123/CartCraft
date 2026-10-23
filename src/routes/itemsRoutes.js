const express = require("express");

const {
  listItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} = require("../controllers/itemsController");

const router = express.Router();

router.get("/", listItems);
router.get("/:id", getItemById);
router.post("/", createItem);
router.patch("/:id", updateItem);
router.delete("/:id", deleteItem);

module.exports = router;
