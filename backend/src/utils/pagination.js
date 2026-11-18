const MAX_LIMIT = 100;

function getPagination(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

function buildMeta({ page, limit }, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 1 };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { getPagination, buildMeta, escapeRegex };
