const notificationLogRepository = require("../repositories/notification-log.repository");
const User = require("../models/user.model");

class NotificationLogService {
  async _scopeFor(user) {
    if (user.role === "super_admin") return {};
    if (user.role === "staff") return { userId: user._id };

    const companyUsers = await User.find({ companyId: user.companyId }).select(
      "_id",
    );
    return { userId: { $in: companyUsers.map((u) => u._id) } };
  }

  async getAll(searchHelper, user) {
    const scope = await this._scopeFor(user);
    return await notificationLogRepository.findAll(searchHelper, scope);
  }

  async getById(id, user) {
    const scope = await this._scopeFor(user);
    const log = await notificationLogRepository.findById(id, scope);
    if (!log) {
      const err = new Error("Notification log not found");
      err.statusCode = 404;
      throw err;
    }
    return log;
  }

  async create(data) {
    if (!data.userId) {
      const err = new Error("userId is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.channel) {
      const err = new Error("channel is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.templateCode) {
      const err = new Error("templateCode is required");
      err.statusCode = 400;
      throw err;
    }
    if (!data.status) {
      const err = new Error("status is required");
      err.statusCode = 400;
      throw err;
    }

    return await notificationLogRepository.create({
      ...data,
      sentAt: data.sentAt || new Date(),
    });
  }

  async remove(id, user) {
    const scope = user.role === "super_admin" ? {} : await this._scopeFor(user);
    const log = await notificationLogRepository.delete(id, scope);
    if (!log) {
      const err = new Error("Notification log not found");
      err.statusCode = 404;
      throw err;
    }
    return log;
  }

  async log(userId, channel, templateCode, status, error = null) {
    return await notificationLogRepository.create({
      userId,
      channel,
      templateCode,
      status,
      error,
      sentAt: new Date(),
    });
  }
}

module.exports = new NotificationLogService();
