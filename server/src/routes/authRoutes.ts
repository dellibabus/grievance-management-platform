import { Router } from "express";
import { register, login, refresh, logout, me } from "../controllers/authController";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

const router = Router();

// POST /api/auth/register (super_admin only, mapped via permission 'manage_users')
router.post("/register", authenticate, authorize(["manage_users"]), register);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/refresh
router.post("/refresh", refresh);

// POST /api/auth/logout
router.post("/logout", optionalAuthenticate, logout);

// GET /api/auth/me
router.get("/me", authenticate, me);

export default router;
