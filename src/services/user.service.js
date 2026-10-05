const bcrypt = require("bcryptjs"); // use "bcrypt" if that's what the rest of the project uses
const userRepository = require("../repositories/user.repository");
const TenantScope = require("../helpers/tenant-scope.helper");
const { notify, notifyBulk, adminHrIds } = require("./notification.service");

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "A user";

class UserService {
  async _notifyRegistered(newUser, actingUser) {
    try {
      const name = fullName(newUser);
      const companyId = newUser.companyId || null;

      await notify({
        userId: newUser._id,
        companyId,
        type: "user_registered",
        title: "Welcome aboard",
        message: `Your account has been created. You can now sign in with ${newUser.email}.`,
        link: "/profile",
        entityType: "User",
        entityId: newUser._id,
        email: { templateCode: "generic" },
      });

      // super_admin users have no company, so there's no Admin/HR group to tell
      if (companyId) {
        const ids = await adminHrIds(companyId, [actingUser._id, newUser._id]);
        await notifyBulk(ids, {
          companyId,
          type: "user_registered",
          title: "New user registered",
          message: `${fullName(actingUser)} added ${name} (${newUser.role}).`,
          link: "/users",
          entityType: "User",
          entityId: newUser._id,
        });
      }
    } catch (err) {
      console.error("[user] notify failed:", err.message);
    }
  }

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

    const created = await userRepository.create({
      ...data,
      companyId,
    });

    await this._notifyRegistered(created, actingUser);

    return created;
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

  async updateProfileImage(id, file, actingUser) {
    if (!file) {
      throw new Error("Profile image is required");
    }

    const user = await userRepository.findById(id);

    if (!user) {
      throw new Error("User not found");
    }

    TenantScope.assertAccess(actingUser, user, "User not found");

    const profileImage = `/uploads/profiles/${file.filename}`;

    const updatedUser = await userRepository.update(id, {
      profileImage,
    });

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  }

  async getMyProfile(actingUser) {
    const user = await userRepository.findById(actingUser._id);
    if (!user) throw new Error("User not found");
    return user;
  }

  // Only these fields can ever be changed by the user themselves.
  async updateMyProfile(actingUser, data) {
    const allowed = {};
    if (data.firstName !== undefined) allowed.firstName = data.firstName;
    if (data.lastName !== undefined) allowed.lastName = data.lastName;

    if (Object.keys(allowed).length === 0) {
      const err = new Error("Nothing to update");
      err.statusCode = 400;
      throw err;
    }
    return await userRepository.update(actingUser._id, allowed);
  }

  async changeMyPassword(actingUser, currentPassword, newPassword) {
    const fail = (msg) => {
      const err = new Error(msg);
      err.statusCode = 400;
      throw err;
    };

    if (!currentPassword || !newPassword) {
      fail("Current and new password are required");
    }
    if (newPassword.length < 8) {
      fail("New password must be at least 8 characters");
    }
    if (currentPassword === newPassword) {
      fail("New password must be different from the current one");
    }

    const user = await userRepository.findByIdWithPassword(actingUser._id);
    if (!user) fail("User not found");

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) fail("Current password is incorrect");

    // repository.update hashes via pre-save and bumps tokenVersion
    await userRepository.update(user._id, { password: newPassword });
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
