import { Router } from "express";
import {
  createComplaint,
  listComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  assignComplaint,
  addUpdate,
  trackComplaint
} from "../controllers/complaintController";
import { authenticate, optionalAuthenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { upload } from "../middlewares/upload";

const router = Router();

// GET /api/complaints/track/:ticket (public, no auth)
router.get("/track/:ticket", trackComplaint);

// POST /api/complaints (public, with optional authentication, attachments up to 5 files)
router.post("/", upload.array("attachments", 5), optionalAuthenticate, createComplaint);

// GET /api/complaints (authenticated users only, returns list filtered by role)
router.get("/", authenticate, listComplaints);

// GET /api/complaints/:id
router.get("/:id", authenticate, getComplaintById);

// PUT /api/complaints/:id (updates status/priority metadata)
router.put("/:id", authenticate, updateComplaint);

// DELETE /api/complaints/:id (super_admin only)
router.delete("/:id", authenticate, authorize(["delete_complaint"]), deleteComplaint);

// POST /api/complaints/:id/assign (assigns complaint to volunteer)
router.post("/:id/assign", authenticate, authorize(["assign_complaint"]), assignComplaint);

// POST /api/complaints/:id/update (adds status comments/timeline updates)
router.post("/:id/update", authenticate, addUpdate);

export default router;
