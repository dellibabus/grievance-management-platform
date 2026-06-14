import { AppDataSource } from "../config/data-source";
import { Notification } from "../entities/Notification";
import { User } from "../entities/User";
import { sendNotificationToUser } from "./socketService";

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  referenceId: string | null = null
): Promise<Notification | null> => {
  try {
    const notifRepo = AppDataSource.getRepository(Notification);

    const notif = new Notification();
    const user = new User();
    user.id = userId;

    notif.user = user;
    notif.title = title;
    notif.message = message;
    notif.type = type;
    notif.reference_id = referenceId;
    notif.is_read = false;

    const saved = await notifRepo.save(notif);

    // Dispatch real-time WebSocket event
    sendNotificationToUser(userId, {
      title,
      message,
      type,
      reference_id: referenceId
    });

    return saved;
  } catch (error: unknown) {
    console.error("Failed to create notification:", error);
    return null;
  }
};
