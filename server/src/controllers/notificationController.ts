import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Notification } from "../entities/Notification";
import { AuthenticatedRequest } from "../types/express";

// GET /api/notifications
export const listNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const notifRepo = AppDataSource.getRepository(Notification);
    const notifications = await notifRepo.find({
      where: { user: { id: req.user.id } },
      order: { created_at: "DESC" },
      take: 50 // Limit to last 50 alerts
    });

    return res.status(200).json({
      success: true,
      notifications
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const notifRepo = AppDataSource.getRepository(Notification);

    const notification = await notifRepo.findOne({
      where: { id, user: { id: req.user.id } }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    notification.is_read = true;
    const saved = await notifRepo.save(notification);

    return res.status(200).json({
      success: true,
      notification: saved
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/notifications/read-all
export const markAllRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const notifRepo = AppDataSource.getRepository(Notification);
    await notifRepo.update(
      { user: { id: req.user.id }, is_read: false },
      { is_read: true }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
