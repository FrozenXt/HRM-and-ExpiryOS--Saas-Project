const cron = require("node-cron"); // swap for whatever scheduler your outbox job uses
const resignationService = require("../services/resignation.service");
const transferService = require("../services/transfer.service");

// Runs every day at 00:05. Both methods catch their own per-record errors,
// so one bad row never stops the rest.
function startHrLifecycleJob() {
  cron.schedule("5 0 * * *", async () => {
    try {
      await transferService.applyDue();
      await resignationService.completeDue();
    } catch (err) {
      console.error("[hr-lifecycle] job failed:", err.message);
    }
  });
}

module.exports = { startHrLifecycleJob };
