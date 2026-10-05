const express = require("express");

const adminDashboardController = require("../controllers/admin-dashboard.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * /api/v1/dashboard/admin:
 *   get:
 *     summary: Get the admin/company dashboard
 *     description: >
 *       Admin/HR always see their own company. Super Admin may pass
 *       companyId for a specific company's dashboard, or omit it for a
 *       platform-wide summary across every company.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: companyId
 *         in: query
 *         schema:
 *           type: string
 *         description: Ignored for admin/hr (forced to their own company). Optional for super_admin.
 *     responses:
 *       200:
 *         description: Dashboard fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: Returned for super_admin with no companyId.
 *                   properties:
 *                     scope: { type: string, example: platform }
 *                     totals:
 *                       type: object
 *                       properties:
 *                         totalCompanies: { type: integer }
 *                         activeCompanies: { type: integer }
 *                         totalEmployees: { type: integer }
 *                     subscriptionBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           status: { type: string, example: active }
 *                           count: { type: integer }
 *                 - type: object
 *                   description: Returned for admin/hr, or super_admin with companyId.
 *                   properties:
 *                     scope: { type: string, example: company }
 *                     company:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string, example: Acme Pvt Ltd }
 *                         tradeName: { type: string }
 *                         plan: { type: string, example: Business }
 *                     employees:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         active: { type: integer }
 *                         inactive: { type: integer }
 *                         byDepartment:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               department: { type: string }
 *                               count: { type: integer }
 *                         list:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               employeeId: { type: string }
 *                               name: { type: string }
 *                               email: { type: string }
 *                               department: { type: string }
 *                               designation: { type: string }
 *                     attendanceToday:
 *                       type: object
 *                       properties:
 *                         date: { type: string, format: date }
 *                         presentCount: { type: integer }
 *                         presentList: { type: array, items: { type: object } }
 *                         lateCount: { type: integer }
 *                         lateList: { type: array, items: { type: object } }
 *                         halfDayCount: { type: integer }
 *                         halfDayList: { type: array, items: { type: object } }
 *                         onLeaveCount: { type: integer }
 *                         onLeaveList: { type: array, items: { type: object } }
 *                         absentCount: { type: integer }
 *                         absentList: { type: array, items: { type: object } }
 *                     subscription:
 *                       type: object
 *                       properties:
 *                         status: { type: string, example: active }
 *                         startDate: { type: string, format: date }
 *                         endDate: { type: string, format: date }
 *                         daysRemaining: { type: integer, nullable: true }
 *                     payroll:
 *                       type: object
 *                       properties:
 *                         period: { type: string, example: "2026-09" }
 *                         draft: { type: object }
 *                         approved: { type: object }
 *                         released: { type: object }
 *                     upcomingBirthdays:
 *                       type: array
 *                       items: { type: object }
 *                     hiring:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         openPostings: { type: integer }
 *                         totalPostings: { type: integer }
 *                         totalCandidates: { type: integer, nullable: true }
 *                     pendingApprovals:
 *                       type: object
 *                       properties:
 *                         leaveRequests: { type: integer }
 *                         draftPayrolls: { type: integer }
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  "/admin",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  adminDashboardController.show,
);

module.exports = router;
