import { Router } from "express";
import { listUsers, createUser, updateUser, deleteUser } from "../controllers/userController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

const router = Router();

// GET /api/users (Access restricted via 'manage_users' permissions)
router.get("/", authenticate, authorize(["manage_users"]), listUsers);

// POST /api/users (Create user, controller restricts to super_admin)
router.post("/", authenticate, authorize(["manage_users"]), createUser);

// PUT /api/users/:id (Update user settings)
router.put("/:id", authenticate, authorize(["manage_users"]), updateUser);

// DELETE /api/users/:id (Delete user, controller restricts to super_admin)
router.delete("/:id", authenticate, authorize(["manage_users"]), deleteUser);

export default router;
