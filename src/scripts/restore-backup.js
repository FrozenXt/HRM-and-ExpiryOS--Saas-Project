// Usage:
//   node scripts/restore-backup.js <file.ndjson.gz>                   (dry run: counts only)
//   node scripts/restore-backup.js <file> --confirm                   (insert missing documents)
//   node scripts/restore-backup.js <file> --confirm --drop            (REPLACE collections in the file)
//   node scripts/restore-backup.js <file> --confirm --uri=mongodb://127.0.0.1:27017/scratch_db
require("dotenv").config();
const fs = require("fs");
const zlib = require("zlib");
const readline = require("readline");
const mongoose = require("mongoose");

const { EJSON } = mongoose.mongo.BSON || require("bson");

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const confirm = args.includes("--confirm");
const drop = args.includes("--drop");
const uri =
  (args.find((a) => a.startsWith("--uri=")) || "").slice(6) ||
  process.env.MONGODB_URI;

if (!file || !fs.existsSync(file)) {
  console.error(
    "Usage: node scripts/restore-backup.js <file.ndjson.gz> [--confirm] [--drop] [--uri=...]",
  );
  process.exit(1);
}

(async () => {
  const counts = {};
  let manifest = null;
  let end = null;

  // Pass 1: read everything and check the file is complete.
  const scan = readline.createInterface({
    input: fs.createReadStream(file).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });
  for await (const line of scan) {
    if (!line) continue;
    const o = JSON.parse(line);
    if (o.manifest) manifest = o.manifest;
    else if (o.end) end = o.end;
    else if (o.c) counts[o.c] = (counts[o.c] || 0) + 1;
  }
  if (!end) {
    console.error("This backup file is incomplete. Refusing to restore.");
    process.exit(1);
  }

  console.log(
    `Backup: ${manifest.scope}, from ${manifest.database}, taken ${manifest.createdAt}`,
  );
  console.table(counts);

  if (!confirm) {
    console.log("\nDry run only. Add --confirm to restore.");
    process.exit(0);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(
    `\nRestoring into "${db.databaseName}"${drop ? " (dropping collections first)" : ""}...`,
  );

  if (drop) {
    for (const name of Object.keys(counts)) {
      await db
        .collection(name)
        .drop()
        .catch(() => {});
    }
  }

  // Pass 2: insert in batches. Existing _ids are skipped, not overwritten.
  const rl = readline.createInterface({
    input: fs.createReadStream(file).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });
  const batches = new Map();
  const flush = async (name) => {
    const docs = batches.get(name);
    if (!docs || !docs.length) return;
    try {
      await db.collection(name).insertMany(docs, { ordered: false });
    } catch (err) {
      if (err.code !== 11000 && !err.writeErrors) throw err; // duplicates are fine
    }
    batches.set(name, []);
  };

  for await (const line of rl) {
    if (!line) continue;
    const o = JSON.parse(line);
    if (!o.c) continue;
    if (!batches.has(o.c)) batches.set(o.c, []);
    batches.get(o.c).push(EJSON.deserialize(o.d, { relaxed: false }));
    if (batches.get(o.c).length >= 500) await flush(o.c);
  }
  for (const name of batches.keys()) await flush(name);

  console.log("Done. Restart the app so indexes are rebuilt.");
  await mongoose.disconnect();
})().catch((e) => {
  console.error("Restore failed:", e.message);
  process.exit(1);
});
