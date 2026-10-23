const Joi = require("joi");
const itemsRepository = require("../repositories/itemsRepository");

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().max(2000).allow("", null).default(null),
  price: Joi.number().min(0).max(9999999999.99).precision(2).required(),
  stock: Joi.number().integer().min(0).default(0),
  categoryId: Joi.number().integer().positive().allow(null).default(null),
  imageUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .allow("", null)
    .default(null)
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150),
  description: Joi.string().trim().max(2000).allow("", null),
  price: Joi.number().min(0).max(9999999999.99).precision(2),
  stock: Joi.number().integer().min(0),
  categoryId: Joi.number().integer().positive().allow(null),
  imageUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .allow("", null)
}).min(1);

const listSchema = Joi.object({
  search: Joi.string().trim().max(100).allow("").default(""),
  categoryId: Joi.number().integer().positive(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string()
    .valid("createdAt", "name", "price")
    .default("createdAt"),
  order: Joi.string().valid("asc", "desc").default("desc")
});

function validate(schema, input) {
  const { error, value } = schema.validate(input, {
    abortEarly: false,
    convert: true
  });

  if (error) {
    const validationError = new Error(
      error.details.map((detail) => detail.message).join("; ")
    );

    validationError.statusCode = 400;
    throw validationError;
  }

  return value;
}

function validateId(rawId) {
  const id = Number(rawId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    const error = new Error("Invalid item ID");
    error.statusCode = 400;
    throw error;
  }

  return id;
}

function notFoundError() {
  const error = new Error("Item not found");
  error.statusCode = 404;
  return error;
}

function normalizeNullableStrings(data) {
  if (data.description === "") data.description = null;
  if (data.imageUrl === "") data.imageUrl = null;
  return data;
}

async function listItems(query) {
  const filters = validate(listSchema, query);

  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    const error = new Error("minPrice cannot exceed maxPrice");
    error.statusCode = 400;
    throw error;
  }

  return itemsRepository.findAll(filters);
}

async function getItemById(rawId) {
  const id = validateId(rawId);
  const item = await itemsRepository.findById(id);

  if (!item) throw notFoundError();

  return item;
}

async function createItem(input) {
  const data = normalizeNullableStrings(
    validate(createSchema, input)
  );

  return itemsRepository.create(data);
}

async function updateItem(rawId, input) {
  const id = validateId(rawId);
  const data = normalizeNullableStrings(
    validate(updateSchema, input)
  );

  const item = await itemsRepository.update(id, data);

  if (!item) throw notFoundError();

  return item;
}

async function deleteItem(rawId) {
  const id = validateId(rawId);
  const deleted = await itemsRepository.softDelete(id);

  if (!deleted) throw notFoundError();

  return { id, deleted: true };
}

module.exports = {
  listItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
};
