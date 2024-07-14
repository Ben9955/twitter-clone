import { Router } from "express";
import { protectRoute } from "../middleware/protectRoute";
import {
  deleteNotifications,
  getNotifications,
} from "../controllers/notification.controller.js";

const router = Router();

router.get("/", protectRoute, getNotifications);
router.delete("/", protectRoute, deleteNotifications);

export default router;
