const mongoose = require("mongoose");
const supportTicketRepository = require("../repositories/support-ticket.repository");
const commentRepository = require("../repositories/support-ticket-comment.repository");
const User = require("../models/user.model");
const {
  STATUSES,
  PRIORITIES,
  CATEGORIES,
} = require("../models/support-ticket.model");
const { notifyBulk, adminHrIds } = require("./notification.service");
const {
  unlinkUrls,
} = require("../middlewares/support-ticket-upload.middleware");

const CLOSED = ["resolved", "closed"];

const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};
const oid = (v) => new mongoose.Types.ObjectId(String(v));
const idOf = (v) => String(v?._id || v || "");
const fullName = (u) =>
  u ? u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() : "";
const userBrief = (u) =>
  u && u._id
    ? {
        _id: u._id,
        name: fullName(u),
        email: u.email || "",
        role: u.role || null,
        profileImage: u.profileImage || null,
      }
    : null;
const ticketNo = (n) => `TKT-${String(n || 0).padStart(5, "0")}`;

class SupportTicketService {
  /* ---------------- access rules ---------------- */

  // What each role is allowed to see.
  _scopeFor(user) {
    // Super admin only sees platform tickets, never internal staff -> HR ones.
    if (user.role === "super_admin") return { target: "platform" };

    if (!user.companyId) fail("No company linked to this account", 403);
    const companyId = oid(user.companyId);

    if (user.role === "admin") return { companyId };
    if (user.role === "hr") {
      return {
        companyId,
        $or: [{ target: "company" }, { createdBy: oid(user._id) }],
      };
    }
    return { companyId, createdBy: oid(user._id) }; // staff
  }

  // The people who answer this ticket.
  _isResponder(user, t) {
    if (t.target === "platform") return user.role === "super_admin";
    return (
      ["admin", "hr"].includes(user.role) &&
      String(user.companyId) === idOf(t.companyId)
    );
  }

  _permissions(user, t) {
    const isResponder = this._isResponder(user, t);
    const isRequester = idOf(t.createdBy) === String(user._id);
    return {
      isRequester,
      isResponder,
      canReply: t.status !== "closed",
      canAddInternalNote: isResponder,
      canChangeStatus: isResponder,
      canAssign: isResponder,
      canClose: (isResponder || isRequester) && t.status !== "closed",
      canReopen: (isResponder || isRequester) && CLOSED.includes(t.status),
      canDelete:
        (user.role === "super_admin" && t.target === "platform") ||
        (isRequester && t.status === "open" && !t.commentCount),
    };
  }

  async _find(id, user) {
    if (!mongoose.isValidObjectId(id)) fail("Support ticket not found", 404);
    const t = await supportTicketRepository.findById(id, this._scopeFor(user));
    if (!t) fail("Support ticket not found", 404);
    return t;
  }

  /* ---------------- shaping ---------------- */

  _toAttachments(files = [], user) {
    return files.map((f) => ({
      fileUrl: `/uploads/support-tickets/${f.filename}`,
      fileName: f.originalname,
      mimeType: f.mimetype,
      sizeBytes: f.size,
      uploadedBy: user._id,
    }));
  }

  _shape(t, user) {
    const company =
      t.companyId && t.companyId._id
        ? {
            _id: t.companyId._id,
            name: t.companyId.tradeName || t.companyId.legalName,
            logo: t.companyId.logoUrl || null,
          }
        : null;

    return {
      _id: t._id,
      id_int: t.id_int,
      ticketNo: ticketNo(t.id_int),
      subject: t.subject,
      descriptionPreview: (t.description || "").slice(0, 160),
      category: t.category,
      priority: t.priority,
      status: t.status,
      target: t.target,
      company,
      requester: userBrief(t.createdBy),
      requesterRole: t.createdByRole,
      assignee: userBrief(t.assignedTo),
      lastReplyBy: userBrief(t.lastReplyBy),
      attachmentCount: (t.attachments || []).length,
      commentCount: t.commentCount || 0,
      lastActivityAt: t.lastActivityAt,
      lastReplyAt: t.lastReplyAt,
      firstResponseAt: t.firstResponseAt,
      resolvedAt: t.resolvedAt,
      closedAt: t.closedAt,
      reopenCount: t.reopenCount || 0,
      ageHours: Math.floor((Date.now() - new Date(t.createdAt)) / 3_600_000),
      isOpen: !CLOSED.includes(t.status),
      isUnassigned: !t.assignedTo,
      permissions: this._permissions(user, t),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  _shapeComment(c, user) {
    return {
      _id: c._id,
      message: c.message,
      isInternal: c.isInternal,
      attachments: c.attachments || [],
      author: userBrief(c.authorId),
      authorRole: c.authorRole,
      isMine: idOf(c.authorId) === String(user._id),
      createdAt: c.createdAt,
    };
  }

  _shapeSummary(r) {
    const toMap = (rows, keys) => {
      const map = Object.fromEntries(keys.map((k) => [k, 0]));
      rows.forEach((i) => (map[i._id] = i.count));
      return map;
    };
    const byStatus = toMap(r.byStatus, STATUSES);
    const open = STATUSES.filter((s) => !CLOSED.includes(s)).reduce(
      (n, s) => n + byStatus[s],
      0,
    );
    return {
      total: r.total[0]?.n || 0,
      open,
      resolved: byStatus.resolved,
      closed: byStatus.closed,
      unassigned: r.unassigned[0]?.n || 0,
      urgent: r.urgent[0]?.n || 0,
      byStatus,
      byPriority: toMap(r.byPriority, PRIORITIES),
      byCategory: toMap(r.byCategory, CATEGORIES),
    };
  }

  /* ---------------- status helper ---------------- */

  // Fills $set / $inc / history for a status change. Mutates the passed objects.
  _applyStatus(t, to, user, now, $set, $inc, history) {
    const from = $set.status || t.status;
    const wasClosed = CLOSED.includes(t.status);
    const reopening = wasClosed && !CLOSED.includes(to);

    $set.status = to;
    history.push({
      action: reopening ? "reopened" : "status_changed",
      from,
      to,
      by: user._id,
      at: now,
    });

    if (to === "resolved") {
      $set.resolvedAt = now;
      $set.resolvedBy = user._id;
      $set.closedAt = null;
    }
    if (to === "closed") $set.closedAt = now;
    if (reopening) {
      $set.resolvedAt = null;
      $set.resolvedBy = null;
      $set.closedAt = null;
      $inc.reopenCount = (t.reopenCount || 0) >= 0 ? 1 : 0;
    }
  }

  /* ---------------- notifications (never throw) ---------------- */

  async _responderIds(t) {
    if (t.target === "platform") {
      const admins = await User.find({
        role: "super_admin",
        isActive: { $ne: false },
      })
        .select("_id")
        .lean();
      return admins.map((a) => String(a._id));
    }
    return (await adminHrIds(idOf(t.companyId), [])).map(String);
  }

  async _push(t, actor, toIds, { type, title, message }) {
    try {
      const ids = [...new Set(toIds.map(String))].filter(
        (id) => id !== String(actor._id),
      );
      if (!ids.length) return;
      await notifyBulk(ids, {
        companyId: idOf(t.companyId),
        type,
        title,
        message,
        link: "/support-tickets",
        entityType: "SupportTicket",
        entityId: t._id,
      });
    } catch (err) {
      console.error("[support-ticket] notify failed:", err.message);
    }
  }

  /* ---------------- CRUD ---------------- */

  async getAll(searchHelper, user) {
    const scope = this._scopeFor(user);

    const [{ data, total }, summary] = await Promise.all([
      supportTicketRepository.findAll(searchHelper, scope),
      supportTicketRepository.summary(scope),
    ]);

    return {
      data: data.map((t) => this._shape(t, user)),
      total,
      summary: this._shapeSummary(summary),
    };
  }

  async getById(id, user) {
    const t = await this._find(id, user);
    const perms = this._permissions(user, t);

    const comments = await commentRepository.findByTicket(
      t._id,
      perms.isResponder,
    );

    return {
      ...this._shape(t, user),
      description: t.description,
      attachments: t.attachments || [],
      resolutionNote: t.resolutionNote || null,
      resolvedBy: userBrief(t.resolvedBy),
      comments: comments.map((c) => this._shapeComment(c, user)),
      history: (t.history || []).map((h) => ({
        action: h.action,
        from: h.from,
        to: h.to,
        at: h.at,
        by: userBrief(h.by),
      })),
    };
  }

  async create(data, user, files = []) {
    if (!["admin", "hr", "staff"].includes(user.role)) {
      fail("Only company users can raise a support ticket", 403);
    }
    if (!user.companyId) fail("No company linked to this account", 403);

    const subject = String(data.subject || "").trim();
    const description = String(data.description || "").trim();
    const category = data.category || "other";
    const priority = data.priority || "medium";

    if (subject.length < 3 || subject.length > 150)
      fail("Subject must be 3 to 150 characters");
    if (description.length < 5 || description.length > 5000)
      fail("Description must be 5 to 5000 characters");
    if (!CATEGORIES.includes(category)) fail("Invalid category");
    if (!PRIORITIES.includes(priority)) fail("Invalid priority");

    // staff -> their own company admin/hr. admin/hr -> platform support.
    const target = user.role === "staff" ? "company" : "platform";
    const now = new Date();

    const created = await supportTicketRepository.create({
      companyId: user.companyId,
      target,
      subject,
      description,
      category,
      priority,
      status: "open",
      createdBy: user._id,
      createdByRole: user.role,
      attachments: this._toAttachments(files, user),
      lastActivityAt: now,
      history: [{ action: "created", to: "open", by: user._id, at: now }],
    });

    await this._push(created, user, await this._responderIds(created), {
      type: "support_ticket_created",
      title: "New support ticket",
      message: `${fullName(user) || "A user"} raised ${ticketNo(created.id_int)}: ${subject}`,
    });

    return await this.getById(String(created._id), user);
  }

  async update(id, data, user) {
    const t = await this._find(id, user);
    const perms = this._permissions(user, t);
    const now = new Date();
    const $set = {};
    const $inc = {};
    const history = [];

    // ---- status ----
    if (data.status !== undefined && data.status !== t.status) {
      if (!STATUSES.includes(data.status)) fail("Invalid status");

      if (!perms.isResponder) {
        const canClose = data.status === "closed" && perms.isRequester;
        const canReopen =
          data.status === "open" &&
          perms.isRequester &&
          CLOSED.includes(t.status);
        if (!canClose && !canReopen)
          fail("You are not allowed to set this status", 403);
      }
      this._applyStatus(t, data.status, user, now, $set, $inc, history);
    }

    // ---- responder-only fields ----
    const responderOnly = [
      "priority",
      "category",
      "assignedTo",
      "resolutionNote",
    ];
    if (
      responderOnly.some((k) => data[k] !== undefined) &&
      !perms.isResponder
    ) {
      fail("You are not allowed to change these fields", 403);
    }

    if (data.priority !== undefined && data.priority !== t.priority) {
      if (!PRIORITIES.includes(data.priority)) fail("Invalid priority");
      $set.priority = data.priority;
      history.push({
        action: "priority_changed",
        from: t.priority,
        to: data.priority,
        by: user._id,
        at: now,
      });
    }

    if (data.category !== undefined && data.category !== t.category) {
      if (!CATEGORIES.includes(data.category)) fail("Invalid category");
      $set.category = data.category;
      history.push({
        action: "category_changed",
        from: t.category,
        to: data.category,
        by: user._id,
        at: now,
      });
    }

    if (data.resolutionNote !== undefined) {
      const note = String(data.resolutionNote || "").trim();
      if (note.length > 2000) fail("Resolution note is too long");
      $set.resolutionNote = note || null;
    }

    if (data.assignedTo !== undefined) {
      const newId = data.assignedTo || null;
      if (idOf(newId) !== idOf(t.assignedTo)) {
        if (newId) await this._assertAssignable(newId, t);
        $set.assignedTo = newId;
        history.push({
          action: "assigned",
          from: idOf(t.assignedTo) || null,
          to: newId ? String(newId) : null,
          by: user._id,
          at: now,
        });
        // Picking up an open ticket moves it to in_progress.
        if (newId && !$set.status && t.status === "open") {
          this._applyStatus(t, "in_progress", user, now, $set, $inc, history);
        }
      }
    }

    if (!Object.keys($set).length) return await this.getById(id, user);

    $set.lastActivityAt = now;
    const update = { $set, $push: { history: { $each: history } } };
    if (Object.keys($inc).length) update.$inc = $inc;

    const updated = await supportTicketRepository.update(
      t._id,
      this._scopeFor(user),
      update,
    );
    if (!updated) fail("Support ticket not found", 404);

    // Tell the requester about status changes, and the new assignee.
    if ($set.status && !perms.isRequester) {
      await this._push(updated, user, [idOf(t.createdBy)], {
        type: "support_ticket_status",
        title: "Ticket status updated",
        message: `${ticketNo(t.id_int)} is now ${$set.status.replace(/_/g, " ")}.`,
      });
    }
    if ($set.assignedTo) {
      await this._push(updated, user, [idOf($set.assignedTo)], {
        type: "support_ticket_assigned",
        title: "Ticket assigned to you",
        message: `${ticketNo(t.id_int)}: ${t.subject}`,
      });
    }

    return await this.getById(id, user);
  }

  async addComment(id, data, user, files = []) {
    const t = await this._find(id, user);
    const perms = this._permissions(user, t);

    if (t.status === "closed")
      fail("This ticket is closed. Reopen it to reply.", 400);

    const message = String(data.message || "").trim();
    if (!message && !files.length)
      fail("A message or an attachment is required");
    if (message.length > 5000)
      fail("Message is too long (max 5000 characters)");

    const isInternal =
      perms.isResponder &&
      (data.isInternal === true || data.isInternal === "true");
    const now = new Date();

    const comment = await commentRepository.create({
      ticketId: t._id,
      companyId: idOf(t.companyId),
      authorId: user._id,
      authorRole: user.role,
      message,
      isInternal,
      attachments: this._toAttachments(files, user),
    });

    const $set = { lastActivityAt: now };
    const $inc = {};
    const history = [];

    if (!isInternal) {
      $inc.commentCount = 1;
      $set.lastReplyAt = now;
      $set.lastReplyBy = user._id;

      if (perms.isResponder) {
        if (!t.firstResponseAt) $set.firstResponseAt = now;
        if (!t.assignedTo) {
          $set.assignedTo = user._id;
          history.push({
            action: "assigned",
            to: String(user._id),
            by: user._id,
            at: now,
          });
        }
        if (t.status === "open")
          this._applyStatus(t, "in_progress", user, now, $set, $inc, history);
      } else if (perms.isRequester) {
        if (t.status === "waiting_on_requester")
          this._applyStatus(t, "in_progress", user, now, $set, $inc, history);
        else if (t.status === "resolved")
          this._applyStatus(t, "open", user, now, $set, $inc, history);
      }
    }

    const update = { $set, $inc };
    if (history.length) update.$push = { history: { $each: history } };

    const updated = await supportTicketRepository.update(
      t._id,
      this._scopeFor(user),
      update,
    );

    if (!isInternal) {
      const toIds = perms.isResponder
        ? [idOf(t.createdBy)]
        : t.assignedTo
          ? [idOf(t.assignedTo)]
          : await this._responderIds(t);
      await this._push(t, user, toIds, {
        type: "support_ticket_reply",
        title: "New reply on a ticket",
        message: `${fullName(user) || "Someone"} replied on ${ticketNo(t.id_int)}.`,
      });
    }

    return {
      comment: this._shapeComment(comment, user),
      ticket: this._shape(updated || t, user),
    };
  }

  async remove(id, user) {
    const t = await this._find(id, user);
    if (!this._permissions(user, t).canDelete) {
      fail("You are not allowed to delete this ticket", 403);
    }

    const comments = await commentRepository.findByTicketRaw(t._id);
    await supportTicketRepository.delete(t._id, this._scopeFor(user));
    await commentRepository.deleteByTicket(t._id);

    unlinkUrls(
      [
        ...(t.attachments || []),
        ...comments.flatMap((c) => c.attachments || []),
      ].map((a) => a.fileUrl),
    );
    return t;
  }

  /* ---------------- dropdown data for the form / filters ---------------- */

  async getOptions(user) {
    let assignees = [];

    if (user.role === "super_admin") {
      assignees = await User.find({
        role: "super_admin",
        isActive: { $ne: false },
      })
        .select("firstName lastName name email role profileImage")
        .lean();
    } else if (["admin", "hr"].includes(user.role)) {
      assignees = await User.find({
        companyId: user.companyId,
        role: { $in: ["admin", "hr"] },
        isActive: { $ne: false },
      })
        .select("firstName lastName name email role profileImage")
        .lean();
    }

    return {
      statuses: STATUSES,
      priorities: PRIORITIES,
      categories: CATEGORIES,
      // Where a ticket raised by this user will go.
      createTarget:
        user.role === "staff"
          ? "company"
          : ["admin", "hr"].includes(user.role)
            ? "platform"
            : null,
      canCreate: ["admin", "hr", "staff"].includes(user.role),
      assignees: assignees.map(userBrief),
    };
  }

  async _assertAssignable(userId, t) {
    if (!mongoose.isValidObjectId(userId)) fail("Assignee not found");
    const u = await User.findById(userId)
      .select("role companyId isActive")
      .lean();
    if (!u || u.isActive === false) fail("Assignee not found");

    const ok =
      t.target === "platform"
        ? u.role === "super_admin"
        : ["admin", "hr"].includes(u.role) &&
          String(u.companyId) === idOf(t.companyId);
    if (!ok) fail("This user cannot be assigned to the ticket");
  }
}

module.exports = new SupportTicketService();
