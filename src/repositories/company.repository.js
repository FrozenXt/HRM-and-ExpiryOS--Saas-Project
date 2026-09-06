const mongoose = require("mongoose");
const Company = require("../models/company.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

class CompanyRepository {
  async findAll(searchHelper) {
    const filters = searchHelper.getFilters();

    const [data, total] = await Promise.all([
      Company.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),

      Company.countDocuments(filters),
    ]);

    return {
      data,
      total,
    };
  }

  async findById(id) {
    return await Company.findById(id);
  }

  async findByRegistrationNumber(registrationNumber) {
    return await Company.findOne({ registrationNumber });
  }

  async existsByPlanId(planId) {
    return await Company.exists({ planId });
  }

  async createWithAdmin({ companyData, adminData }) {
    const companyId = new mongoose.Types.ObjectId();

    const hashedPassword = await bcrypt.hash(adminData.password, 12);
    const adminUser = await User.create({
      ...adminData,

      password: hashedPassword,

      role: "admin",
      companyId,
    });

    try {
      const company = await Company.create({
        ...companyData,
        _id: companyId,
        adminUserId: adminUser._id,
        verificationStatus: "pending",
      });

      return company;
    } catch (error) {
      // Roll back the admin user so we don't leave it orphaned with a
      // companyId that points at a Company that was never created.
      await User.findByIdAndDelete(adminUser._id);
      throw error;
    }
  }

  async update(id, data) {
    return await Company.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await Company.findByIdAndDelete(id);
  }
}

module.exports = new CompanyRepository();
