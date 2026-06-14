import { Router } from "express";
import { getStats, getByDistrict, getByCategory, getByStatus, getTrend } from "../controllers/dashboardController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

const router = Router();

// Apply auth + check permission 'view_dashboard' for all dashboard routes
router.use(authenticate);
router.use(authorize(["view_dashboard"]));

// GET /api/dashboard/stats
router.get("/stats", getStats);

// GET /api/dashboard/by-district
router.get("/by-district", getByDistrict);

// GET /api/dashboard/by-category
router.get("/by-category", getByCategory);

// GET /api/dashboard/by-status
router.get("/by-status", getByStatus);

// GET /api/dashboard/trend
router.get("/trend", getTrend);

export default router;
