const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

const createAdmin = async () => {
  const password = await bcrypt.hash("password123", 12);

  const admin = await User.create({
    name: "System Administrator",
    email: "admin@example.com",
    password,
    role: "admin",
    status: "active",
  });

  console.log("Admin created:", admin.email);
};

module.exports = createAdmin;
