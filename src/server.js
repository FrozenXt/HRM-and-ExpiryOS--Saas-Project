require("dotenv").config();

console.log("Mongo URI:", process.env.MONGODB_URI);

const app = require("./app");
const connectDatabase = require("./config/database");
const emailOutboxJob = require("./jobs/email-outbox.job");

// Auto checkout job
const autoCheckoutJob = require("./jobs/auto-checkout.job");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();

  // Start auto-checkout cron job
  autoCheckoutJob.start();
  emailOutboxJob.start();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
