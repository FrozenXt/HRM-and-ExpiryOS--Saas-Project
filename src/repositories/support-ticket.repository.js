const SupportTicket = require("../models/support-ticket.model");

const USER_FIELDS = "firstName lastName name email role profileImage";

const POPULATE = [
  { path: "createdBy", select: USER_FIELDS },
  { path: "assignedTo", select: USER_FIELDS },
  { path: "lastReplyBy", select: USER_FIELDS },
  { path: "companyId", select: "legalName tradeName logoUrl" },
];

const OPEN = { status: { $nin: ["resolved", "closed"] } };

class SupportTicketRepository {
  async findAll(searchHelper, scopeFilter) {
    // $and keeps the role scope safe even if the search filters contain $or.
    const filters = { $and: [searchHelper.getFilters(), scopeFilter] };

    const [data, total] = await Promise.all([
      SupportTicket.find(filters)
        .select("-history")
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate(POPULATE)
        .lean(),
      SupportTicket.countDocuments(filters),
    ]);

    return { data, total };
  }

  async findById(id, scopeFilter) {
    return await SupportTicket.findOne({ _id: id, ...scopeFilter })
      .populate([...POPULATE, { path: "history.by", select: USER_FIELDS }])
      .lean();
  }

  async create(data) {
    return await SupportTicket.create(data);
  }

  // `update` is a full Mongo update document ({ $set, $inc, $push }).
  async update(id, scopeFilter, update) {
    return await SupportTicket.findOneAndUpdate(
      { _id: id, ...scopeFilter },
      update,
      { new: true, runValidators: true },
    )
      .populate(POPULATE)
      .lean();
  }

  async delete(id, scopeFilter) {
    return await SupportTicket.findOneAndDelete({ _id: id, ...scopeFilter });
  }

  // Counts for the whole role scope (ignores the search filters), so the
  // list screen can show its stat cards without another API call.
  async summary(scopeFilter) {
    const [result] = await SupportTicket.aggregate([
      { $match: scopeFilter },
      {
        $facet: {
          total: [{ $count: "n" }],
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          byPriority: [
            { $match: OPEN },
            { $group: { _id: "$priority", count: { $sum: 1 } } },
          ],
          byCategory: [
            { $match: OPEN },
            { $group: { _id: "$category", count: { $sum: 1 } } },
          ],
          unassigned: [
            { $match: { ...OPEN, assignedTo: null } },
            { $count: "n" },
          ],
          urgent: [
            { $match: { ...OPEN, priority: "urgent" } },
            { $count: "n" },
          ],
        },
      },
    ]);
    return result;
  }
}

module.exports = new SupportTicketRepository();
module.exports.USER_FIELDS = USER_FIELDS;
