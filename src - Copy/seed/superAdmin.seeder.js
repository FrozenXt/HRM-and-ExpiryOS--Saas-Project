const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

const createSuperAdmin = async () => {
  const email = process.env.SEED_SUPERADMIN_EMAIL || "superadmin@example.com";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Super Admin already exists: ${email} — skipping`);
    return existing;
  }

  const rawPassword = process.env.SEED_SUPERADMIN_PASSWORD || "ChangeMe123!";
  const password = await bcrypt.hash(rawPassword, 12);

  const superAdmin = await User.create({
    firstName: "System",
    lastName: "Administrator",
    email,
    password,
    role: "super_admin", // companyId stays null — enforced by the schema hook
    status: "active",
    mustResetPassword: true, // force a real password on first login
  });

  console.log("Super Admin created:", superAdmin.email);
  if (!process.env.SEED_SUPERADMIN_PASSWORD) {
    console.log(
      `(using default password "${rawPassword}" — set SEED_SUPERADMIN_PASSWORD in .env for anything beyond local dev)`,
    );
  }

  return superAdmin;
};

module.exports = createSuperAdmin;
