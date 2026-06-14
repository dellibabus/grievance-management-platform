import { Router } from "express";
import {
  getDistricts,
  getMandals,
  getVillages,
  getCategories,
  getRoles
} from "../controllers/locationController";

const router = Router();

// GET /api/locations/districts
router.get("/districts", getDistricts);

// GET /api/locations/districts/:districtId/mandals
router.get("/districts/:districtId/mandals", getMandals);

// GET /api/locations/mandals/:mandalId/villages
router.get("/mandals/:mandalId/villages", getVillages);

// GET /api/locations/categories
router.get("/categories", getCategories);

// GET /api/locations/roles
router.get("/roles", getRoles);

export default router;
