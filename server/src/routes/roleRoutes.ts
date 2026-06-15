import { Router } from "express";
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  createPermission
} from "../controllers/roleController";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

// GET /api/roles/permissions
router.get("/permissions", authenticate, listPermissions);

// POST /api/roles/permissions
router.post("/permissions", authenticate, createPermission);

// GET /api/roles
router.get("/", authenticate, listRoles);

// POST /api/roles
router.post("/", authenticate, createRole);

// PUT /api/roles/:id
router.put("/:id", authenticate, updateRole);

// DELETE /api/roles/:id
router.delete("/:id", authenticate, deleteRole);

export default router;