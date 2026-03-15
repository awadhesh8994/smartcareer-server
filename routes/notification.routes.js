import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getNotifications, markAsRead, markAllRead, deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();
router.use(protect);

router.get("/",           getNotifications);
router.patch("/:id/read", markAsRead);
router.patch("/read-all", markAllRead);
router.delete("/:id",     deleteNotification);

export default router;
