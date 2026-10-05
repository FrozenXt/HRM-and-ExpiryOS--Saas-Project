// Escapes regex special characters so a search term is matched literally.
const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class SearchHelper {
  constructor(payload = {}) {
    this.page = Math.max(Number(payload.page) || 1, 1);

    this.limit = Math.min(Math.max(Number(payload.limit) || 20, 1), 100);

    this.sort = String(payload.sort || "DESC").toUpperCase();

    this.sortField = payload.sort_field || "_id";

    this.fields = Array.isArray(payload.fields) ? payload.fields : [];
  }

  getPage() {
    return this.page;
  }

  getLimit() {
    return this.limit;
  }

  getSkip() {
    return (this.page - 1) * this.limit;
  }

  getSort() {
    const field = this.sortField === "id" ? "_id" : this.sortField;

    return {
      [field]: this.sort === "ASC" ? 1 : -1,
    };
  }

  getFilters() {
    const filters = {};

    // Adds one operator to a field, keeping any operators already set on it.
    // This is what lets "gte" + "lte" on the same field form a range.
    const addOperator = (field, operator, value) => {
      const current = filters[field];
      const isOperatorObject =
        current &&
        typeof current === "object" &&
        !Array.isArray(current) &&
        !(current instanceof Date) &&
        !(current instanceof RegExp);

      filters[field] = isOperatorObject
        ? { ...current, [operator]: value }
        : { [operator]: value };
    };

    for (const item of this.fields) {
      const { field, operator, value } = item;

      if (!field || !operator) {
        continue;
      }

      const mongoField = field === "id" ? "_id" : field;

      switch (operator.toLowerCase()) {
        case "eq":
          filters[mongoField] = value;
          break;

        case "ne":
          addOperator(mongoField, "$ne", value);
          break;

        case "gt":
          addOperator(mongoField, "$gt", value);
          break;

        case "gte":
          addOperator(mongoField, "$gte", value);
          break;

        case "lt":
          addOperator(mongoField, "$lt", value);
          break;

        case "lte":
          addOperator(mongoField, "$lte", value);
          break;

        case "contains":
          filters[mongoField] = {
            $regex: escapeRegex(value),
            $options: "i",
          };
          break;

        case "starts_with":
          filters[mongoField] = {
            $regex: `^${escapeRegex(value)}`,
            $options: "i",
          };
          break;

        case "ends_with":
          filters[mongoField] = {
            $regex: `${escapeRegex(value)}$`,
            $options: "i",
          };
          break;

        case "in":
          addOperator(
            mongoField,
            "$in",
            Array.isArray(value) ? value : String(value).split(","),
          );
          break;

        default:
          break;
      }
    }

    return filters;
  }
}

module.exports = SearchHelper;
