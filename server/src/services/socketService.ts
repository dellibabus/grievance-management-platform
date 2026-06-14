import { Server } from "socket.io";

let ioInstance: Server | null = null;

export const setIoInstance = (io: Server) => {
  ioInstance = io;
};

export const getIoInstance = (): Server | null => {
  return ioInstance;
};

export const sendNotificationToUser = (
  userId: string,
  data: { title: string; message: string; type: string; reference_id?: string | null }
) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit("notification", data);
  }
};

export const sendNewComplaintToDistrict = (districtId: string, complaintData: unknown) => {
  if (ioInstance) {
    ioInstance.to(`district:${districtId}`).emit("complaint:new", complaintData);
  }
};
