const notificationTemplateRepository = require("../repositories/notification-template.repository");

class NotificationTemplateService {
  async getAll(searchHelper) {
    return await notificationTemplateRepository.findAll(searchHelper);
  }

  async getById(id) {
    const template = await notificationTemplateRepository.findById(id);
    if (!template) {
      const err = new Error("Notification template not found");
      err.statusCode = 404;
      throw err;
    }
    return template;
  }

  async create(data) {
    if (!data.code) {
      const err = new Error("code is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.channel) {
      const err = new Error("channel is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.body) {
      const err = new Error("body is required");
      err.statusCode = 400;
      throw err;
    }

    const existing = await notificationTemplateRepository.findByCode(data.code);
    if (existing) {
      const err = new Error(
        `A template with code "${data.code}" already exists`,
      );
      err.statusCode = 400;
      throw err;
    }

    return await notificationTemplateRepository.create(data);
  }

  async update(id, data) {
    if (data.code) {
      const existing = await notificationTemplateRepository.findByCode(
        data.code,
      );
      if (existing && String(existing._id) !== String(id)) {
        const err = new Error(
          `A template with code "${data.code}" already exists`,
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const template = await notificationTemplateRepository.update(id, data);
    if (!template) {
      const err = new Error("Notification template not found");
      err.statusCode = 404;
      throw err;
    }
    return template;
  }

  async remove(id) {
    const template = await notificationTemplateRepository.delete(id);
    if (!template) {
      const err = new Error("Notification template not found");
      err.statusCode = 404;
      throw err;
    }
    return template;
  }
}

module.exports = new NotificationTemplateService();
