const subscriptionService = require("../services/subscription.service");
const SearchHelper = require("../helpers/search.helper");

const { successResponse, errorResponse } = require("../utils/api-response");

class SubscriptionController {
  // Super Admin — paginated/filtered view across every company.
  async index(req, res) {
    try {
      const searchHelper = new SearchHelper(req.body);

      const result = await subscriptionService.listSubscriptions(searchHelper);

      const totalPages = Math.ceil(result.total / searchHelper.getLimit());

      return successResponse(res, "Subscriptions fetched successfully", {
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

  // Company Admin — their own company's subscription, re-synced against the
  // current active-employee count first.
  async me(req, res) {
    try {
      const companyId = req.user.companyId;

      if (!companyId) {
        return errorResponse(res, "No company associated with this user", 400);
      }

      const { subscription } =
        await subscriptionService.syncEmployeeCount(companyId);

      return successResponse(
        res,
        "Subscription fetched successfully",
        subscription,
      );
    } catch (error) {
      return errorResponse(res, error.message);
    }
  }

  // Company Admin — subscribe to / change plan. Price and employee count are
  // computed server-side; only planId and billingCycle come from the client.
  async subscribe(req, res) {
    try {
      const companyId = req.user.companyId;

      if (!companyId) {
        return errorResponse(res, "No company associated with this user", 400);
      }

      const subscription = await subscriptionService.subscribe(
        companyId,
        req.body,
      );

      return successResponse(
        res,
        "Subscription updated successfully",
        subscription,
      );
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }

  // Super Admin — manual override, mainly Enterprise custom pricing or
  // correcting status.
  async update(req, res) {
    try {
      const subscription = await subscriptionService.adminUpdate(
        req.params.id,
        req.body,
      );

      return successResponse(
        res,
        "Subscription updated successfully",
        subscription,
      );
    } catch (error) {
      return errorResponse(res, error.message, 404);
    }
  }
}

module.exports = new SubscriptionController();
