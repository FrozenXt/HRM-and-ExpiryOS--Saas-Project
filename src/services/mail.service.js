const nodemailer = require("nodemailer");
const CompanySettings = require("../models/company-settings.model");
const { decrypt } = require("../utils/encryption");

const TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // companyId -> { transport, from, at }

async function resolveConfig(companyId) {
  if (companyId) {
    const s = await CompanySettings.findOne({ companyId })
      .select("+mailSettings.smtpPassword")
      .lean();
    const m = s?.mailSettings;
    if (m?.smtpHost && m?.fromEmail) {
      const port = m.smtpPort || 587;
      return {
        host: m.smtpHost,
        port,
        secure: port === 465,
        requireTLS: port !== 465 && m.useTls !== false,
        user: m.smtpUsername || null,
        pass: m.smtpPassword ? decrypt(m.smtpPassword) : null,
        from: m.fromName ? `"${m.fromName}" <${m.fromEmail}>` : m.fromEmail,
      };
    }
  }

  if (!process.env.SMTP_HOST) {
    throw new Error("No SMTP configured for this company or for the platform");
  }
  const port = Number(process.env.SMTP_PORT) || 587;
  return {
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  };
}

async function getTransport(companyId) {
  const key = String(companyId || "platform");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;

  const cfg = await resolveConfig(companyId);
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: cfg.requireTLS,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 15000,
    socketTimeout: 20000,
  });
  const entry = { transport, from: cfg.from, at: Date.now() };
  cache.set(key, entry);
  return entry;
}

async function sendMail({ companyId, to, subject, html, text, attachments }) {
  const { transport, from } = await getTransport(companyId);
  return transport.sendMail({ from, to, subject, html, text, attachments });
}

// Call after a company changes its mail settings.
const clearCache = (companyId) => cache.delete(String(companyId || "platform"));

module.exports = { sendMail, clearCache };
