const userService = require("../services/user.service");
const SearchHelper = require("../helpers/search.helper");

const { successResponse, errorResponse } = require("../utils/api-response");

class UserController {
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);

      const result = await userService.getUsers(searchHelper);

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
      return errorResponse(res, error.message);
    }
  }

  async show(req, res) {
    try {
      const user = await userService.getUserById(req.params.id);

      return successResponse(res, "User fetched successfully", user);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async store(req, res) {
    try {
      const user = await userService.createUser(req.body);

      return successResponse(res, "User created successfully", user, 201);
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const user = await userService.updateUser(req.params.id, req.body);

      return successResponse(res, "User updated successfully", user);
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }

  async destroy(req, res) {
    try {
      await userService.deleteUser(req.params.id);

      return successResponse(res, "User deleted successfully");
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }
}

module.exports = new UserController();
