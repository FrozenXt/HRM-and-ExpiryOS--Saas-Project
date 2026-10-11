const express = require("express");
const controller = require("../controllers/backup.controller");
const authenticate = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");

const router = express.Router();
const guard = [authenticate, authorize("super_admin", "admin")];

router.get("/", ...guard, controller.index);
router.get("/status", ...guard, controller.status);
router.post("/", ...guard, controller.run); // super admin: {scope, companyId}; admin: own company only
router.get("/:id/download", ...guard, controller.download);
router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  controller.remove,
);

module.exports = router;
