const mongoose = require("mongoose");
const Company = require("../models/company.model");
const User = require("../models/user.model");

class CompanyRepository {
  async findAll(searchHelper) {
    const filters = searchHelper.getFilters();

    const [companies, total] = await Promise.all([
      Company.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit())
        .populate("planId", "name") // add more fields here if needed, e.g. "name price"
        .lean(),

      Company.countDocuments(filters),
    ]);

    // One grouped query for all companies on this page (no N+1).
    const companyIds = companies.map((c) => c._id);
    const counts = await User.aggregate([
      { $match: { companyId: { $in: companyIds } } },
      // Optional: only count active users -> add `isActive: true` to $match
      { $group: { _id: "$companyId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    const data = companies.map((c) => {
      const plan = c.planId && typeof c.planId === "object" ? c.planId : null;
      return {
        ...c,
        // keep planId as a plain id so the edit form keeps working
        planId: plan ? plan._id : c.planId,
        plan: plan ? { _id: plan._id, name: plan.name } : null,
        userCount: countMap.get(String(c._id)) || 0,
      };
    });

    return { data, total };
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

    // Pass the PLAIN password: the User model's pre("save") hook hashes it
    // exactly once. Hashing here as well would double-hash it and break login.
    const adminUser = await User.create({
      ...adminData,
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
