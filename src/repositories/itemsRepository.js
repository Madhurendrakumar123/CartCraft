const pool = require("../config/db");

const itemColumns = `
  i.id,
  i.name,
  i.description,
  i.price,
  i.stock,
  i.category_id AS "categoryId",
  c.name AS "categoryName",
  i.image_url AS "imageUrl",
  i.created_at AS "createdAt",
  i.updated_at AS "updatedAt"
`;

function buildWhere(filters) {
  const values = [];
  const conditions = ["i.is_active = TRUE"];

  function addValue(value) {
    values.push(value);
    return `$${values.length}`;
  }

  if (filters.search) {
    const parameter = addValue(`%${filters.search}%`);
    conditions.push(
      `(i.name ILIKE ${parameter}
        OR COALESCE(i.description, '') ILIKE ${parameter})`
    );
  }

  if (filters.categoryId !== undefined) {
    conditions.push(
      `i.category_id = ${addValue(filters.categoryId)}`
    );
  }

  if (filters.minPrice !== undefined) {
    conditions.push(
      `i.price >= ${addValue(filters.minPrice)}`
    );
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(
      `i.price <= ${addValue(filters.maxPrice)}`
    );
  }

  return {
    where: conditions.join(" AND "),
    values
  };
}

async function findAll(filters) {
  const { where, values } = buildWhere(filters);

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM items i
     WHERE ${where}`,
    values
  );

  const total = countResult.rows[0].total;

  const sortColumns = {
    createdAt: "i.created_at",
    name: "i.name",
    price: "i.price"
  };

  // Column names and direction come from fixed allowlists.
  const sortColumn = sortColumns[filters.sortBy];
  const sortOrder = filters.order === "asc" ? "ASC" : "DESC";

  const limitPosition = values.length + 1;
  const offsetPosition = values.length + 2;

  const queryValues = [
    ...values,
    filters.limit,
    (filters.page - 1) * filters.limit
  ];

  const result = await pool.query(
    `SELECT ${itemColumns}
     FROM items i
     LEFT JOIN categories c ON c.id = i.category_id
     WHERE ${where}
     ORDER BY ${sortColumn} ${sortOrder}, i.id ASC
     LIMIT $${limitPosition}
     OFFSET $${offsetPosition}`,
    queryValues
  );

  return {
    items: result.rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit)
    }
  };
}

async function findById(id) {
  const result = await pool.query(
    `SELECT ${itemColumns}
     FROM items i
     LEFT JOIN categories c ON c.id = i.category_id
     WHERE i.id = $1 AND i.is_active = TRUE`,
    [id]
  );

  return result.rows[0] || null;
}

async function create(data) {
  const result = await pool.query(
    `INSERT INTO items
       (name, description, price, stock, category_id, image_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      data.name,
      data.description ?? null,
      data.price,
      data.stock,
      data.categoryId ?? null,
      data.imageUrl ?? null
    ]
  );

  return findById(result.rows[0].id);
}

async function update(id, data) {
  // Only these explicitly approved fields may be updated.
  const columns = {
    name: "name",
    description: "description",
    price: "price",
    stock: "stock",
    categoryId: "category_id",
    imageUrl: "image_url"
  };

  const keys = Object.keys(data);
  const assignments = keys.map(
    (key, index) => `${columns[key]} = $${index + 2}`
  );

  assignments.push("updated_at = NOW()");

  const values = [id, ...keys.map((key) => data[key])];

  const result = await pool.query(
    `UPDATE items
     SET ${assignments.join(", ")}
     WHERE id = $1 AND is_active = TRUE
     RETURNING id`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return findById(id);
}

async function softDelete(id) {
  const result = await pool.query(
    `UPDATE items
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1 AND is_active = TRUE
     RETURNING id`,
    [id]
  );

  return result.rows.length > 0;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  softDelete
};
