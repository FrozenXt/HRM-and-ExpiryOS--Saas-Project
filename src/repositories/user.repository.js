const User = require("../models/user.model");

class UserRepository {
  async findAll(searchHelper, extraFilters = {}) {
    const filters = { ...searchHelper.getFilters(), ...extraFilters };

    const [data, total] = await Promise.all([
      User.find(filters)
        .sort(searchHelper.getSort())
        .skip(searchHelper.getSkip())
        .limit(searchHelper.getLimit()),

      User.countDocuments(filters),
    ]);

    return {
      data,
      total,
    };
  }

  async findByIdWithPassword(id) {
    return await User.findById(id).select("+password");
  }

  async findById(id) {
    return await User.findById(id);
  }

  // Emails are stored lowercase/trimmed, so normalise before looking up —
  // otherwise "Admin@X.com" would slip past the duplicate-email check.
  async findByEmail(email) {
    return await User.findOne({
      email: String(email || "")
        .trim()
        .toLowerCase(),
    });
  }

  async create(data) {
    return await User.create(data);
  }

  // Loads the document and calls save() (instead of findByIdAndUpdate) so the
  // model's hooks run: pre("save") hashes a changed password exactly once and
  // pre("validate") keeps the role/companyId rules intact.
  async update(id, data) {
    const user = await User.findById(id);
    if (!user) return null;

    user.set(data);

    if (data.password) {
      // A new password should sign the user out everywhere.
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();

    // Never send the password hash back to the client.
    const result = user.toObject();
    delete result.password;
    return result;
  }

  async delete(id) {
    return await User.findByIdAndDelete(id);
  }
}

module.exports = new UserRepository();
