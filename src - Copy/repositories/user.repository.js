const User = require("../models/user.model");

class UserRepository {
  async findAll(searchHelper) {
    const filters = searchHelper.getFilters();

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

  async findById(id) {
    return await User.findById(id);
  }

  async findByEmail(email) {
    return await User.findOne({ email });
  }

  async create(data) {
    return await User.create(data);
  }

  async update(id, data) {
    return await User.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    return await User.findByIdAndDelete(id);
  }
}

module.exports = new UserRepository();
