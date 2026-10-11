const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const readline = require("readline");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const mongoose = require("mongoose");
const BackupLog = require("../models/backup-log.model");

const { EJSON } = mongoose.mongo.BSON || require("bson");

const BACKUP_DIR = path.resolve(
  process.env.BACKUP_DIR || path.join(__dirname, "..", "..", "backups"),
);
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS) || 14;
const MIN_KEEP_FULL = 3;
const BATCH = 500;

// Never exported at all.
const ALWAYS_SKIP = new Set(["backuplogs"]);
// Company exports leave these out (credentials, queues, logs).
const COMPANY_SKIP = new Set([
  "refreshtokens",
  "emailoutboxes",
  "notifications",
  "notificationlogs",
  "notificationtemplates",
  "auditlogs",
  "counters",
  "plans",
]);
// Secrets removed from company exports. A full backup keeps everything,
// because it has to restore the system exactly.
const COMPANY_PROJECTION = {
  users: { password: 0 },
  companysettings: { "mailSettings.smtpPassword": 0 },
};

const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};

let running = false;

class BackupService {
  /* ---------- running a backup ---------- */

  async run({ scope, companyId = null, trigger, user = null }) {
    if (!["full", "company"].includes(scope)) fail("Invalid scope");
    if (scope === "company" && !mongoose.isValidObjectId(companyId)) {
      fail("A valid companyId is required for a company backup");
    }
    if (running)
      fail("A backup is already running. Try again in a minute.", 409);

    running = true;
    const started = Date.now();
    const log = await BackupLog.create({
      scope,
      companyId: scope === "company" ? companyId : null,
      trigger,
      status: "running",
      createdBy: user?._id || null,
    });

    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName =
      scope === "full"
        ? `full-${stamp}.ndjson.gz`
        : `company-${companyId}-${stamp}.ndjson.gz`;
    const filePath = path.join(BACKUP_DIR, fileName);
    const stats = { collections: {}, documents: 0 };

    try {
      await pipeline(
        Readable.from(this._lines(scope, companyId, stats)),
        zlib.createGzip({ level: 6 }),
        fs.createWriteStream(filePath),
      );

      await this._verify(filePath, stats);
      const checksum = await this._sha256(filePath);

      log.set({
        status: "success",
        fileName,
        sizeBytes: fs.statSync(filePath).size,
        documents: stats.documents,
        collections: Object.keys(stats.collections).length,
        checksum,
        verified: true,
        durationMs: Date.now() - started,
      });
      await log.save();

      await this.prune().catch((e) =>
        console.error("[backup] prune failed:", e.message),
      );
      return log;
    } catch (err) {
      fs.rmSync(filePath, { force: true });
      log.set({
        status: "failed",
        error: err.message,
        durationMs: Date.now() - started,
      });
      await log.save();
      throw err;
    } finally {
      running = false;
    }
  }

  // One JSON object per line. Documents are stored as Extended JSON so
  // ObjectIds and Dates survive the round trip.
  async *_lines(scope, companyId, stats) {
    const db = mongoose.connection.db;
    const oid =
      scope === "company"
        ? new mongoose.Types.ObjectId(String(companyId))
        : null;

    yield `${JSON.stringify({
      manifest: {
        version: 1,
        scope,
        companyId: companyId ? String(companyId) : null,
        database: db.databaseName,
        createdAt: new Date().toISOString(),
      },
    })}\n`;

    const names = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .sort();

    let buf = [];
    for (const name of names) {
      if (name.startsWith("system.") || ALWAYS_SKIP.has(name)) continue;

      let filter = {};
      let projection;
      if (scope === "company") {
        if (COMPANY_SKIP.has(name)) continue;
        filter = name === "companies" ? { _id: oid } : { companyId: oid };
        projection = COMPANY_PROJECTION[name];
      }

      const cursor = db
        .collection(name)
        .find(filter, projection ? { projection } : undefined);

      let n = 0;
      for await (const doc of cursor) {
        buf.push(
          `{"c":${JSON.stringify(name)},"d":${EJSON.stringify(doc, { relaxed: false })}}\n`,
        );
        n += 1;
        if (buf.length >= BATCH) {
          yield buf.join("");
          buf = [];
        }
      }
      if (n) {
        stats.collections[name] = n;
        stats.documents += n;
      }
    }
    if (buf.length) yield buf.join("");

    // The closing line proves the file is complete.
    yield `${JSON.stringify({ end: { documents: stats.documents, collections: stats.collections } })}\n`;
  }

  // Reads the file back and checks it is complete and the counts match.
  async _verify(filePath, stats) {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath).pipe(zlib.createGunzip()),
      crlfDelay: Infinity,
    });
    let docs = 0;
    let end = null;
    for await (const line of rl) {
      if (!line) continue;
      const obj = JSON.parse(line);
      if (obj.c) docs += 1;
      else if (obj.end) end = obj.end;
    }
    if (!end) throw new Error("Verification failed: backup file is incomplete");
    if (docs !== stats.documents || end.documents !== stats.documents) {
      throw new Error(
        `Verification failed: wrote ${stats.documents} documents, read back ${docs}`,
      );
    }
  }

  _sha256(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      fs.createReadStream(filePath)
        .on("data", (d) => hash.update(d))
        .on("end", () => resolve(hash.digest("hex")))
        .on("error", reject);
    });
  }

  /* ---------- retention ---------- */

  async prune() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);

    const keep = new Set(
      (
        await BackupLog.find({
          status: "success",
          scope: "full",
          fileName: { $ne: null },
        })
          .sort({ createdAt: -1 })
          .limit(MIN_KEEP_FULL)
          .select("_id")
          .lean()
      ).map((x) => String(x._id)),
    );

    const old = await BackupLog.find({
      status: "success",
      fileName: { $ne: null },
      createdAt: { $lt: cutoff },
    });

    for (const log of old) {
      if (keep.has(String(log._id))) continue;
      fs.rmSync(this._pathFor(log.fileName), { force: true });
      log.status = "expired";
      log.fileName = null;
      await log.save();
    }
  }

  /* ---------- API helpers ---------- */

  // Never trust a name from the client: resolve it inside BACKUP_DIR only.
  _pathFor(fileName) {
    const p = path.resolve(BACKUP_DIR, fileName);
    if (!p.startsWith(BACKUP_DIR + path.sep)) fail("Invalid backup path", 400);
    return p;
  }

  _scopeFilter(user) {
    return user.role === "super_admin"
      ? {}
      : { scope: "company", companyId: user.companyId };
  }

  async list(user, { page = 1, limit = 20 } = {}) {
    const filter = this._scopeFilter(user);
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const pg = Math.max(Number(page) || 1, 1);
    const [data, total] = await Promise.all([
      BackupLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((pg - 1) * lim)
        .limit(lim)
        .populate("createdBy", "firstName lastName")
        .populate("companyId", "legalName tradeName")
        .lean(),
      BackupLog.countDocuments(filter),
    ]);
    return {
      data,
      pagination: {
        page: pg,
        limit: lim,
        total,
        total_pages: Math.ceil(total / lim),
      },
    };
  }

  async status(user) {
    const filter = this._scopeFilter(user);
    const [lastSuccess, lastFailed, agg] = await Promise.all([
      BackupLog.findOne({ ...filter, status: "success" })
        .sort({ createdAt: -1 })
        .lean(),
      BackupLog.findOne({ ...filter, status: "failed" })
        .sort({ createdAt: -1 })
        .lean(),
      BackupLog.aggregate([
        { $match: { ...filter, status: "success", fileName: { $ne: null } } },
        {
          $group: {
            _id: null,
            bytes: { $sum: "$sizeBytes" },
            files: { $sum: 1 },
          },
        },
      ]),
    ]);

    const lastFullOk =
      user.role === "super_admin"
        ? await BackupLog.findOne({ scope: "full", status: "success" })
            .sort({ createdAt: -1 })
            .lean()
        : null;
    const ageHours = lastFullOk
      ? Math.round((Date.now() - new Date(lastFullOk.createdAt)) / 3_600_000)
      : null;

    return {
      lastSuccess,
      lastFailed:
        lastFailed &&
        (!lastSuccess || lastFailed.createdAt > lastSuccess.createdAt)
          ? lastFailed
          : null,
      storedFiles: agg[0]?.files || 0,
      storedBytes: agg[0]?.bytes || 0,
      schedule:
        user.role === "super_admin"
          ? process.env.BACKUP_CRON || "0 2 * * *"
          : null,
      timezone: process.env.BACKUP_TZ || "Asia/Kathmandu",
      retentionDays: RETENTION_DAYS,
      // A full backup older than 26 hours means the daily job missed a run.
      fullBackupOverdue:
        user.role === "super_admin" ? ageHours === null || ageHours > 26 : null,
    };
  }

  async runManual(user, { scope, companyId }) {
    if (user.role === "super_admin") {
      return this.run({
        scope: scope || "full",
        companyId,
        trigger: "manual",
        user,
      });
    }
    // Admin: only their own company, never the full database.
    if (!user.companyId) fail("No company on this account", 403);
    return this.run({
      scope: "company",
      companyId: user.companyId,
      trigger: "manual",
      user,
    });
  }

  async getForDownload(user, id) {
    const log = await BackupLog.findOne({
      _id: id,
      ...this._scopeFilter(user),
    });
    if (!log || log.status !== "success" || !log.fileName)
      fail("Backup not found", 404);
    const filePath = this._pathFor(log.fileName);
    if (!fs.existsSync(filePath)) fail("Backup file is missing from disk", 404);
    return { filePath, fileName: log.fileName };
  }

  async remove(user, id) {
    if (user.role !== "super_admin")
      fail("Only a super admin can delete backups", 403);
    const log = await BackupLog.findById(id);
    if (!log) fail("Backup not found", 404);
    if (log.status === "running") fail("A running backup can't be deleted");
    if (log.fileName) fs.rmSync(this._pathFor(log.fileName), { force: true });
    await log.deleteOne();
  }
}

module.exports = new BackupService();
