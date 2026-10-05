const Notification = require("../models/notification.model");
const EmailOutbox = require("../models/email-outbox.model");
const NotificationLog = require("../models/notification-log.model");
const NotificationTemplate = require("../models/notification-template.model");
const User = require("../models/user.model");
const Company = require("../models/company.model");
const { sendMail } = require("./mail.service");

const MAX_ATTEMPTS = 5;

// Used when a template code isn't in the NotificationTemplate collection,
// so email works from day one. A row in the database overrides these.
const DEFAULT_TEMPLATES = {
  leave_decided: {
    subject: "Your leave request was {{status}}",
    body: "Hi {{firstName}},\n\nYour {{leaveType}} request ({{fromDate}} to {{toDate}}) was {{status}} by {{decidedBy}}.",
  },
  payroll_released: {
    subject: "Your payslip for {{period}} is ready",
    body: "Hi {{firstName}},\n\nYour payroll for {{period}} has been released. Net pay: {{netPay}}.\nYour payslip is attached.",
  },
  generic: {
    subject: "{{title}}",
    body: "Hi {{firstName}},\n\n{{message}}",
  },
};

const escapeHtml = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const fill = (str, vars) =>
  String(str || "").replace(/{{\s*(\w+)\s*}}/g, (_, k) => vars[k] ?? "");

function layout({ companyName, bodyText }) {
  const paragraphs = escapeHtml(bodyText)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;background:#f4f6f8;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;padding:28px;color:#1f2937;font-size:14px;line-height:1.55">
      ${paragraphs}
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:22px 0">
      <div style="font-size:12px;color:#6b7280">${escapeHtml(companyName || "")}</div>
    </div></div>`;
}

async function renderEmail(code, vars, companyName) {
  const tpl =
    (await NotificationTemplate.findOne({ code, channel: "email" }).lean()) ||
    DEFAULT_TEMPLATES[code] ||
    DEFAULT_TEMPLATES.generic;
  const safeVars = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, String(v ?? "")]),
  );
  const subject = fill(tpl.subject || "{{title}}", safeVars);
  const text = fill(tpl.body, safeVars);
  return { subject, text, html: layout({ companyName, bodyText: text }) };
}

/**
 * The one entry point every feature calls. It never throws, so a failed
 * notification can't break the request that triggered it.
 *
 * notify({
 *   userId, companyId, type, title, message, link, entityType, entityId,
 *   email: { templateCode, variables, attachments }   // optional
 * })
 */
async function notify(opts) {
  try {
    const {
      userId,
      companyId = null,
      type,
      title,
      message = "",
      link = null,
      entityType = null,
      entityId = null,
      email,
    } = opts;
    if (!userId || !type || !title) return null;

    const notification = await Notification.create({
      userId,
      companyId,
      type,
      title,
      message,
      link,
      entityType,
      entityId,
    });

    if (email) {
      const [user, company] = await Promise.all([
        User.findById(userId).select("email firstName lastName status").lean(),
        companyId
          ? Company.findById(companyId).select("legalName tradeName").lean()
          : null,
      ]);
      if (user?.email && user.status === "active") {
        const companyName = company?.tradeName || company?.legalName || "";
        const templateCode = email.templateCode || "generic";
        const vars = {
          title,
          message,
          firstName: user.firstName,
          companyName,
          ...(email.variables || {}),
        };
        const rendered = await renderEmail(templateCode, vars, companyName);
        await EmailOutbox.create({
          userId,
          companyId,
          to: user.email,
          templateCode,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          attachments: email.attachments || [],
        });
      }
    }
    return notification;
  } catch (err) {
    console.error("[notify] failed:", err.message);
    return null;
  }
}

const notifyMany = (userIds, opts) =>
  Promise.all(
    [...new Set(userIds.map(String))].map((userId) =>
      notify({ ...opts, userId }),
    ),
  );

/* ---------- outbox worker (called by the cron job) ---------- */

async function processOutbox(limit = 25) {
  const now = new Date();

  // Rows stuck in "sending" (server died mid-send) go back to pending.
  await EmailOutbox.updateMany(
    { status: "sending", lockedAt: { $lt: new Date(now - 10 * 60 * 1000) } },
    { $set: { status: "pending", lockedAt: null } },
  );

  for (let i = 0; i < limit; i++) {
    // Claiming is atomic, so two workers never send the same email.
    const row = await EmailOutbox.findOneAndUpdate(
      { status: "pending", nextAttemptAt: { $lte: new Date() } },
      {
        $set: { status: "sending", lockedAt: new Date() },
        $inc: { attempts: 1 },
      },
      { sort: { nextAttemptAt: 1 }, new: true },
    );
    if (!row) break;

    try {
      await sendMail({
        companyId: row.companyId,
        to: row.to,
        subject: row.subject,
        html: row.html,
        text: row.text,
        attachments: row.attachments,
      });
      row.status = "sent";
      row.sentAt = new Date();
      row.lastError = null;
      await row.save();
      await NotificationLog.create({
        userId: row.userId,
        channel: "email",
        templateCode: row.templateCode,
        status: "sent",
      });
    } catch (err) {
      const final = row.attempts >= MAX_ATTEMPTS;
      row.status = final ? "failed" : "pending";
      row.lockedAt = null;
      row.lastError = err.message;
      // 2, 4, 8, 16 minutes
      row.nextAttemptAt = new Date(
        Date.now() + Math.pow(2, row.attempts) * 60 * 1000,
      );
      await row.save();
      if (final) {
        await NotificationLog.create({
          userId: row.userId,
          channel: "email",
          templateCode: row.templateCode,
          status: "failed",
          error: err.message,
        });
      }
    }
  }
}

/* ---------- in-app API ---------- */

async function list(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const filter = { userId };
  if (unreadOnly) filter.readAt = null;
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const pg = Math.max(Number(page) || 1, 1);
  const [data, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((pg - 1) * lim)
      .limit(lim)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, readAt: null }),
  ]);
  return { data, total, unread, page: pg, limit: lim };
}

const unreadCount = (userId) =>
  Notification.countDocuments({ userId, readAt: null });

const markRead = (userId, id) =>
  Notification.findOneAndUpdate(
    { _id: id, userId, readAt: null },
    { readAt: new Date() },
    { new: true },
  );

const markAllRead = (userId) =>
  Notification.updateMany({ userId, readAt: null }, { readAt: new Date() });

// In-app only, one insert for many users. Never throws.
async function notifyBulk(userIds, opts) {
  try {
    const ids = [...new Set(userIds.map(String))];
    if (!ids.length) return;
    const {
      companyId = null,
      type,
      title,
      message = "",
      link = null,
      entityType = null,
      entityId = null,
      expireAt = null,
    } = opts;
    await Notification.insertMany(
      ids.map((userId) => ({
        userId,
        companyId,
        type,
        title,
        message,
        link,
        entityType,
        entityId,
        expireAt,
      })),
      { ordered: false },
    );
  } catch (err) {
    console.error("[notifyBulk] failed:", err.message);
  }
}

async function adminHrIds(companyId, skip = []) {
  if (!companyId) return [];
  const users = await User.find({
    companyId,
    role: { $in: ["admin", "hr"] },
    status: "active",
  })
    .select("_id")
    .lean();
  const skipSet = new Set(skip.map(String));
  return users.map((u) => String(u._id)).filter((id) => !skipSet.has(id));
}

module.exports = {
  notify,
  notifyMany,
  notifyBulk,
  adminHrIds,
  processOutbox,
  list,
  unreadCount,
  markRead,
  markAllRead,
};
