const NotificationTemplate = require("../models/notification-template.model");

class NotificationTemplateRepository {
  async findAll(searchHelper) {
    const filters = searchHelper.getFilters();

    const [data, total] = await Promise.all([
      NotificationTemplate.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .lean(),
      NotificationTemplate.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id) {
    return await NotificationTemplate.findById(id);
  }

  async findByCode(code) {
    return await NotificationTemplate.findOne({ code });
  }

  async create(data) {
    return await NotificationTemplate.create(data);
  }

  async update(id, data) {
    return await NotificationTemplate.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await NotificationTemplate.findByIdAndDelete(id);
  }
}

module.exports = new NotificationTemplateRepository();
