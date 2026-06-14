import { Router } from "express";
import { listNotifications, markAsRead, markAllRead } from "../controllers/notificationController";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.use(authenticate);

// GET /api/notifications
router.get("/", listNotifications);

// PUT /api/notifications/read-all
router.put("/read-all", markAllRead);

// PUT /api/notifications/:id/read
router.put("/:id/read", markAsRead);

export default router;
