import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Configurations & Database Source
dotenv.config();
import { AppDataSource } from "./config/data-source";

// Services & Routers
import { setIoInstance } from "./services/socketService";
import authRoutes from "./routes/authRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import userRoutes from "./routes/userRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import locationRoutes from "./routes/locationRoutes";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Ensure Upload Directory exists
const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Socket.io Setup
const io = new SocketServer(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});
setIoInstance(io);

// Socket Connection Rooms Mapping
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;
  const districtId = socket.handshake.query.districtId as string;

  if (userId) {
    socket.join(`user:${userId}`);
    // console.log(`Socket joined room: user:${userId}`);
  }

  if (districtId) {
    socket.join(`district:${districtId}`);
    // console.log(`Socket joined room: district:${districtId}`);
  }

  socket.on("disconnect", () => {
    // console.log("Socket client disconnected:", socket.id);
  });
});

// App Middlewares
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static uploads folder
app.use("/uploads", express.static(path.resolve(uploadDir)));

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "System operational" });
});

// Bind routers
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/locations", locationRoutes);

// Catch-all 404 handler
app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

// Global Error Handling Middleware (Strict Type Signatures)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  console.error("Global Error Handled:", err);
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
});

// Initialize Database & Boot Server
AppDataSource.initialize()
  .then(async () => {
    console.log("TypeORM Database connected successfully.");

    server.listen(PORT, () => {
      console.log(`Grievance Management Server running on port ${PORT}`);
    });
  })
  .catch((dbErr) => {
    console.error("Database connection failed on startup:", dbErr);
  });
