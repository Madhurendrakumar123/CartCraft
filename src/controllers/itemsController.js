const itemsService = require("../services/itemsService");
const asyncHandler = require("../utils/asyncHandler");

const listItems = asyncHandler(async (req, res) => {
  const result = await itemsService.listItems(req.query);

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination
  });
});

const getItemById = asyncHandler(async (req, res) => {
  const item = await itemsService.getItemById(req.params.id);

  res.status(200).json({
    success: true,
    data: item
  });
});

const createItem = asyncHandler(async (req, res) => {
  const item = await itemsService.createItem(req.body);

  res.status(201).json({
    success: true,
    message: "Item created successfully",
    data: item
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await itemsService.updateItem(
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Item updated successfully",
    data: item
  });
});

const deleteItem = asyncHandler(async (req, res) => {
  const result = await itemsService.deleteItem(req.params.id);

  res.status(200).json({
    success: true,
    message: "Item deactivated successfully",
    data: result
  });
});

module.exports = {
  listItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
};
