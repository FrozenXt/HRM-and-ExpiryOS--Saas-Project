const cron = require("node-cron");
const { processOutbox } = require("../services/notification.service");

let task = null;
let running = false;

module.exports = {
  start() {
    if (task) return;
    task = cron.schedule("* * * * *", async () => {
      if (running) return; // previous run still going
      running = true;
      try {
        await processOutbox();
      } catch (err) {
        console.error("[email-outbox] run failed:", err.message);
      } finally {
        running = false;
      }
    });
  },
};
