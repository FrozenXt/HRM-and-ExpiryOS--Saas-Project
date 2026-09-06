require("dotenv").config();
const mongoose = require("mongoose");

const createSuperAdmin = require("./superAdmin.seeder");

const run = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/node-api";

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB:", uri);

    await createSuperAdmin();

    console.log("Seeding complete.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
