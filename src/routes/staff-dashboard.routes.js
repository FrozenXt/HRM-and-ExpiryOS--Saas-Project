const express = require("express");

const staffDashboardController = require("../controllers/staff-dashboard.controller");
const authenticate = require("../middlewares/auth.middleware");

const router = express.Router();

/**
 * @openapi
 * /api/v1/dashboard/staff:
 *   get:
 *     summary: Get a staff dashboard
 *     description: >
 *       Staff always get their own dashboard — the employeeId query param is
 *       ignored for them. Admin/HR default to their own profile (if they
 *       have one) or can pass employeeId to view anyone in their own
 *       company. Super Admin can pass employeeId for any employee in any
 *       company. month/year default to the current month and scope both
 *       the attendance summary and the calendar.
 *     tags:
 *       - Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: employeeId
 *         in: query
 *         schema:
 *           type: string
 *         description: Ignored for staff. Required for admin/hr/super_admin with no employee profile of their own.
 *       - name: month
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Defaults to the current month.
 *       - name: year
 *         in: query
 *         schema:
 *           type: integer
 *         description: Defaults to the current year.
 *     responses:
 *       200:
 *         description: Dashboard fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employee:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string, example: Sujal Lamichhane }
 *                     email: { type: string }
 *                     joiningDate: { type: string, format: date }
 *                     status: { type: string, example: active }
 *                 company:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string, example: Acme Pvt Ltd }
 *                     tradeName: { type: string }
 *                     logoUrl: { type: string }
 *                 leave:
 *                   type: object
 *                   properties:
 *                     year: { type: integer, example: 2026 }
 *                     balances:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           leaveTypeId: { type: string }
 *                           leaveTypeName: { type: string, example: Sick Leave }
 *                           annualQuota: { type: integer, example: 12 }
 *                           used: { type: integer, example: 2 }
 *                           remaining: { type: integer, example: 10 }
 *                           total: { type: integer, example: 12 }
 *                     totals:
 *                       type: object
 *                       properties:
 *                         used: { type: integer }
 *                         remaining: { type: integer }
 *                         total: { type: integer }
 *                 upcomingHolidays:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string, example: Dashain }
 *                       date: { type: string, format: date }
 *                 upcomingBirthdays:
 *                   type: array
 *                   description: Company-wide, within the next 30 days.
 *                   items:
 *                     type: object
 *                     properties:
 *                       employeeId: { type: string }
 *                       name: { type: string, example: Anita Shrestha }
 *                       date: { type: string, format: date }
 *                 attendance:
 *                   type: object
 *                   properties:
 *                     month: { type: integer }
 *                     year: { type: integer }
 *                     summary:
 *                       type: object
 *                       properties:
 *                         present: { type: integer }
 *                         late: { type: integer }
 *                         half_day: { type: integer }
 *                         absent: { type: integer }
 *                         totalDays: { type: integer }
 *                     calendar:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date: { type: string, format: date }
 *                           checkIn: { type: string, format: date-time, nullable: true }
 *                           checkOut: { type: string, format: date-time, nullable: true }
 *                           durationHours: { type: number, nullable: true }
 *                           status: { type: string, example: present }
 *                           autoCheckedOut: { type: boolean }
 *                           isWithinGeofence: { type: boolean, nullable: true }
 *                 payroll:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       period: { type: string, example: "2026-09" }
 *                       status: { type: string, example: released }
 *                       wageType: { type: string }
 *                       payableDays: { type: number }
 *                       regularHours: { type: number }
 *                       overtimeHours: { type: number }
 *                       grossPay: { type: number }
 *                       overtimePay: { type: number }
 *                       deductions: { type: number }
 *                       netPay: { type: number }
 *                       currencyCode: { type: string, example: NPR }
 *                       currencySymbol: { type: string, example: "₹" }
 *       400:
 *         description: employeeId required, or invalid data
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: That employee is not in your company
 *       404:
 *         description: Employee not found, or no employee profile linked to this user
 */
router.get("/staff", authenticate, staffDashboardController.show);

module.exports = router;
