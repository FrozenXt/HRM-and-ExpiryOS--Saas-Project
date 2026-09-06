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
          filters[mongoField] = {
            $ne: value,
          };
          break;

        case "gt":
          filters[mongoField] = {
            $gt: value,
          };
          break;

        case "gte":
          filters[mongoField] = {
            $gte: value,
          };
          break;

        case "lt":
          filters[mongoField] = {
            $lt: value,
          };
          break;

        case "lte":
          filters[mongoField] = {
            $lte: value,
          };
          break;

        case "contains":
          filters[mongoField] = {
            $regex: value,
            $options: "i",
          };
          break;

        case "starts_with":
          filters[mongoField] = {
            $regex: `^${value}`,
            $options: "i",
          };
          break;

        case "ends_with":
          filters[mongoField] = {
            $regex: `${value}$`,
            $options: "i",
          };
          break;

        case "in":
          filters[mongoField] = {
            $in: Array.isArray(value) ? value : String(value).split(","),
          };
          break;

        default:
          break;
      }
    }

    return filters;
  }
}

module.exports = SearchHelper;
