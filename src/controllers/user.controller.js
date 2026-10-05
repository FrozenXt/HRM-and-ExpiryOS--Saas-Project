const userService = require("../services/user.service");
const SearchHelper = require("../helpers/search.helper");

const { successResponse, errorResponse } = require("../utils/api-response");

class UserController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);

      const result = await userService.getUsers(searchHelper, req.user);

      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Users fetched successfully", {
        data: result.data,

        pagination: {
          page: searchHelper.getPage(),
          limit: searchHelper.getLimit(),
          total: result.total,
          total_pages: totalPages,
        },
      });
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async show(req, res) {
    try {
      const user = await userService.getUserById(req.params.id, req.user);

      return successResponse(res, "User fetched successfully", user);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async store(req, res) {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.profileImage = `/uploads/profiles/${req.file.filename}`;
      }
      const user = await userService.createUser(data, req.user);
      return successResponse(res, "User created successfully", user, 201);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async update(req, res) {
    try {
      const user = await userService.updateUser(
        req.params.id,
        req.body,
        req.user,
      );

      return successResponse(res, "User updated successfully", user);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async destroy(req, res) {
    try {
      await userService.deleteUser(req.params.id, req.user);

      return successResponse(res, "User deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async uploadUserProfileImage(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, "Profile image is required.", 400);
      }

      const user = await userService.updateProfileImage(
        req.params.id, // target user, not req.user._id
        req.file,
        req.user,
      );

      return successResponse(res, "Profile image uploaded successfully", user);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  // Logged-in user changes their own photo
  async uploadProfileImage(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, "Profile image is required.", 400);
      }

      const user = await userService.updateProfileImage(
        req.user._id,
        req.file,
        req.user,
      );

      return successResponse(res, "Profile image uploaded successfully", user);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async getMe(req, res) {
    try {
      const user = await userService.getMyProfile(req.user);
      return successResponse(res, "Profile fetched successfully", user);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 404);
    }
  }

  async updateMe(req, res) {
    try {
      const user = await userService.updateMyProfile(req.user, req.body);
      return successResponse(res, "Profile updated successfully", user);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      await userService.changeMyPassword(
        req.user,
        currentPassword,
        newPassword,
      );
      return successResponse(res, "Password changed successfully");
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400);
    }
  }
}

module.exports = new UserController();
