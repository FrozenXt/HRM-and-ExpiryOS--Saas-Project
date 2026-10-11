const cron = require("node-cron");
const backupService = require("../services/backup.service");

let task = null;

module.exports = {
  start() {
    if (task) return;
    const expr = process.env.BACKUP_CRON || "0 2 * * *";
    task = cron.schedule(
      expr,
      async () => {
        try {
          const log = await backupService.run({
            scope: "full",
            trigger: "scheduled",
          });
          console.log(
            `[backup] ok: ${log.fileName} (${log.documents} documents)`,
          );
        } catch (err) {
          // Logged in BackupLog too; the dashboard shows it as failed.
          console.error("[backup] scheduled run failed:", err.message);
        }
      },
      { timezone: process.env.BACKUP_TZ || "Asia/Kathmandu" },
    );
    console.log(`[backup] scheduled: ${expr}`);
  },
};
