const express = require("express");
const controller = require("../controllers/notification.controller");
const authenticate = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", authenticate, controller.index);
router.get("/unread-count", authenticate, controller.unreadCount);
router.patch("/read-all", authenticate, controller.readAll);
router.patch("/:id/read", authenticate, controller.read);

module.exports = router;
