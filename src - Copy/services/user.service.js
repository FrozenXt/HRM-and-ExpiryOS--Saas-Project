const userRepository = require("../repositories/user.repository");

class UserService {
  async getUsers(searchHelper) {
    return await userRepository.findAll(searchHelper);
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async createUser(data) {
    const existingUser = await userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new Error("Email already exists");
    }

    return await userRepository.create(data);
  }

  async updateUser(id, data) {
    const user = await userRepository.update(id, data);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async deleteUser(id) {
    const user = await userRepository.delete(id);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}

module.exports = new UserService();
