const userRepository = require("../repositories/user.repository");
const TenantScope = require("../helpers/tenant-scope.helper");

class UserService {
  async getUsers(searchHelper, actingUser) {
    const scopeFilters = TenantScope.scopeFilters(actingUser);

    return await userRepository.findAll(searchHelper, scopeFilters);
  }

  async getUserById(id, actingUser) {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    TenantScope.assertAccess(actingUser, user, "User not found");

    return user;
  }

  async createUser(data, actingUser) {
    const existingUser = await userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Non-super_admin can only ever create users under their own company —
    // this also naturally blocks an Admin from creating a super_admin,
    // since the User model's pre-validate hook rejects a super_admin with
    // a companyId set. Super Admin is left free to pass (or omit)
    // companyId directly, since a super_admin target user has none.
    const companyId =
      actingUser.role === "super_admin"
        ? data.companyId
        : TenantScope.resolveCompanyId(actingUser, data.companyId);

    return await userRepository.create({
      ...data,
      companyId,
    });
  }

  async updateUser(id, data, actingUser) {
    const existingUser = await userRepository.findById(id);

    if (!existingUser) {
      throw new Error("User not found");
    }

    TenantScope.assertAccess(actingUser, existingUser, "User not found");

    // companyId can't be changed via update, by anyone — moving a user to
    // a different tenant isn't a thing this endpoint does.
    const { companyId, ...safeData } = data;

    const user = await userRepository.update(id, safeData);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async deleteUser(id, actingUser) {
    const existingUser = await userRepository.findById(id);

    if (!existingUser) {
      throw new Error("User not found");
    }

    TenantScope.assertAccess(actingUser, existingUser, "User not found");

    const user = await userRepository.delete(id);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}

module.exports = new UserService();
