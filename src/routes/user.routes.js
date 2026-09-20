const express = require("express");

const userController = require("../controllers/user.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *         firstName:
 *           type: string
 *           example: Sujal
 *         lastName:
 *           type: string
 *           example: Lamichhane
 *         email:
 *           type: string
 *           format: email
 *           example: sujal@example.com
 *         role:
 *           type: string
 *           enum:
 *             - super_admin
 *             - admin
 *             - hr
 *             - staff
 *           example: staff
 *         companyId:
 *           type: string
 *           nullable: true
 *           example: 68ba1234567890abcdef1234
 *         status:
 *           type: string
 *           enum:
 *             - active
 *             - inactive
 *             - blocked
 *             - pending
 *           example: active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/v1/users/list:
 *   post:
 *     summary: Get users
 *     description: Get a paginated and filtered list of users.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 example: 1
 *
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 example: 20
 *
 *               sort:
 *                 type: string
 *                 enum:
 *                   - ASC
 *                   - DESC
 *                 example: DESC
 *
 *               sort_field:
 *                 type: string
 *                 example: createdAt
 *
 *               fields:
 *                 type: array
 *                 description: List of filters to apply.
 *                 items:
 *                   type: object
 *                   properties:
 *                     field:
 *                       type: string
 *                       example: firstName
 *
 *                     operator:
 *                       type: string
 *                       enum:
 *                         - eq
 *                         - ne
 *                         - gt
 *                         - gte
 *                         - lt
 *                         - lte
 *                         - contains
 *                         - starts_with
 *                         - ends_with
 *                         - in
 *                       example: contains
 *
 *                     value:
 *                       type: string
 *                       example: Sujal
 *
 *           example:
 *             page: 1
 *             limit: 20
 *             sort: DESC
 *             sort_field: createdAt
 *             fields:
 *               - field: firstName
 *                 operator: contains
 *                 value: Sujal
 *               - field: status
 *                 operator: eq
 *                 value: active
 *
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *
 *       400:
 *         description: Bad request
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       500:
 *         description: Internal server error
 */
router.post(
  "/list",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  userController.index,
);

/**
 * @openapi
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new HRMS user. Only super_admin and admin users can create users.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - role
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *                 example: Sujal
 *
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *                 example: Lamichhane
 *
 *               email:
 *                 type: string
 *                 format: email
 *                 example: sujal@example.com
 *
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: Password@123
 *
 *               role:
 *                 type: string
 *                 enum:
 *                   - super_admin
 *                   - admin
 *                   - hr
 *                   - staff
 *                 example: staff
 *
 *               companyId:
 *                 type: string
 *                 description: Required for admin, hr, and staff. Must be omitted for super_admin.
 *                 example: 68ba1234567890abcdef1234
 *
 *               status:
 *                 type: string
 *                 enum:
 *                   - active
 *                   - inactive
 *                   - blocked
 *                   - pending
 *                 default: active
 *                 example: active
 *
 *               mustResetPassword:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *
 *     responses:
 *       201:
 *         description: User created successfully
 *
 *       400:
 *         description: Invalid request data
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: You do not have permission to create users
 *
 *       409:
 *         description: Email already exists
 *
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  userController.store,
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Get a single user by their ID.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: User fetched successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: User not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin", "hr"),
  userController.show,
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update a user
 *     description: Update an existing user.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Sujal
 *
 *               lastName:
 *                 type: string
 *                 example: Lamichhane
 *
 *               email:
 *                 type: string
 *                 format: email
 *                 example: sujal@example.com
 *
 *               role:
 *                 type: string
 *                 enum:
 *                   - super_admin
 *                   - admin
 *                   - hr
 *                   - staff
 *                 example: hr
 *
 *               companyId:
 *                 type: string
 *                 example: 68ba1234567890abcdef1234
 *
 *               status:
 *                 type: string
 *                 enum:
 *                   - active
 *                   - inactive
 *                   - blocked
 *                   - pending
 *                 example: active
 *
 *     responses:
 *       200:
 *         description: User updated successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: User not found
 */
router.patch(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  userController.update,
);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Delete a user by their ID.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User MongoDB ObjectId
 *         schema:
 *           type: string
 *           example: 68ba1234567890abcdef1234
 *
 *     responses:
 *       200:
 *         description: User deleted successfully
 *
 *       401:
 *         description: Authentication required or invalid access token
 *
 *       403:
 *         description: Insufficient permissions
 *
 *       404:
 *         description: User not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  userController.destroy,
);

module.exports = router;
