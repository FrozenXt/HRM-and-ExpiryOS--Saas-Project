const SupportTicketComment = require("../models/support-ticket-comment.model");

const USER_FIELDS = "firstName lastName name email role profileImage";

class SupportTicketCommentRepository {
  async findByTicket(ticketId, includeInternal) {
    const filter = { ticketId };
    if (!includeInternal) filter.isInternal = false;

    return await SupportTicketComment.find(filter)
      .sort({ createdAt: 1 })
      .populate("authorId", USER_FIELDS)
      .lean();
  }

  async findByTicketRaw(ticketId) {
    return await SupportTicketComment.find({ ticketId })
      .select("attachments")
      .lean();
  }

  async create(data) {
    const doc = await SupportTicketComment.create(data);
    return await SupportTicketComment.findById(doc._id)
      .populate("authorId", USER_FIELDS)
      .lean();
  }

  async deleteByTicket(ticketId) {
    return await SupportTicketComment.deleteMany({ ticketId });
  }
}

module.exports = new SupportTicketCommentRepository();
