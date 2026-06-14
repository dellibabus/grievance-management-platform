import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { District } from "../entities/District";
import { Mandal } from "../entities/Mandal";
import { Village } from "../entities/Village";
import { Category } from "../entities/Category";
import { Role } from "../entities/Role";

export const getDistricts = async (_req: Request, res: Response) => {
  try {
    const distRepo = AppDataSource.getRepository(District);
    const districts = await distRepo.find({ order: { name: "ASC" } });
    return res.status(200).json({ success: true, districts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMandals = async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params;
    const mandalRepo = AppDataSource.getRepository(Mandal);
    const mandals = await mandalRepo.find({
      where: { district: { id: districtId } },
      order: { name: "ASC" }
    });
    return res.status(200).json({ success: true, mandals });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getVillages = async (req: Request, res: Response) => {
  try {
    const { mandalId } = req.params;
    const villageRepo = AppDataSource.getRepository(Village);
    const villages = await villageRepo.find({
      where: { mandal: { id: mandalId } },
      order: { name: "ASC" }
    });
    return res.status(200).json({ success: true, villages });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const catRepo = AppDataSource.getRepository(Category);
    const categories = await catRepo.find({
      where: { is_active: true },
      order: { name: "ASC" }
    });
    return res.status(200).json({ success: true, categories });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getRoles = async (_req: Request, res: Response) => {
  try {
    const roleRepo = AppDataSource.getRepository(Role);
    const roles = await roleRepo.find({ order: { name: "ASC" } });
    return res.status(200).json({ success: true, roles });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
