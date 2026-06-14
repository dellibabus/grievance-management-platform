import { Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Complaint } from "../entities/Complaint";
import { AuthenticatedRequest } from "../types/express";

// Helper to filter query builder based on role
const applyDashboardScope = (qb: any, role: string, districtId: string | null) => {
  if (role === "district_admin" && districtId) {
    qb.andWhere("complaint.district_id = :scopedDistrictId", { scopedDistrictId: districtId });
  }
};

// GET /api/dashboard/stats
export const getStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { role, districtId } = req.user;
    const compRepo = AppDataSource.getRepository(Complaint);

    const qb = compRepo.createQueryBuilder("complaint")
      .select("complaint.status as status, COUNT(complaint.id) as count")
      .groupBy("complaint.status");

    applyDashboardScope(qb, role, districtId);

    const rawStats = await qb.getRawMany();

    const stats = {
      total: 0,
      pending: 0,
      assigned: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      rejected: 0
    };

    rawStats.forEach((row) => {
      const count = parseInt(row.count, 10) || 0;
      stats.total += count;
      if (row.status in stats) {
        stats[row.status as keyof typeof stats] = count;
      }
    });

    return res.status(200).json({ success: true, stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/by-district
export const getByDistrict = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { role, districtId } = req.user;
    const compRepo = AppDataSource.getRepository(Complaint);

    const qb = compRepo.createQueryBuilder("complaint")
      .innerJoin("complaint.district", "district")
      .select("district.name as name, COUNT(complaint.id) as count")
      .groupBy("district.name")
      .orderBy("count", "DESC");

    applyDashboardScope(qb, role, districtId);

    const rawData = await qb.getRawMany();
    const data = rawData.map((row) => ({
      name: row.name,
      count: parseInt(row.count, 10) || 0
    }));

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/by-category
export const getByCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { role, districtId } = req.user;
    const compRepo = AppDataSource.getRepository(Complaint);

    const qb = compRepo.createQueryBuilder("complaint")
      .innerJoin("complaint.category", "category")
      .select("category.name as name, COUNT(complaint.id) as count")
      .groupBy("category.name")
      .orderBy("count", "DESC");

    applyDashboardScope(qb, role, districtId);

    const rawData = await qb.getRawMany();
    const data = rawData.map((row) => ({
      name: row.name,
      count: parseInt(row.count, 10) || 0
    }));

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/by-status
export const getByStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { role, districtId } = req.user;
    const compRepo = AppDataSource.getRepository(Complaint);

    const qb = compRepo.createQueryBuilder("complaint")
      .select("complaint.status as name, COUNT(complaint.id) as count")
      .groupBy("complaint.status")
      .orderBy("count", "DESC");

    applyDashboardScope(qb, role, districtId);

    const rawData = await qb.getRawMany();
    const data = rawData.map((row) => ({
      name: row.name,
      count: parseInt(row.count, 10) || 0
    }));

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/dashboard/trend (Last 6 months monthly trend)
export const getTrend = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { role, districtId } = req.user;
    const compRepo = AppDataSource.getRepository(Complaint);

    // Compute date boundary: 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const qb = compRepo.createQueryBuilder("complaint")
      .select("TO_CHAR(complaint.created_at, 'YYYY-MM') as month, COUNT(complaint.id) as count")
      .where("complaint.created_at >= :sixMonthsAgo", { sixMonthsAgo })
      .groupBy("month")
      .orderBy("month", "ASC");

    if (role === "district_admin" && districtId) {
      qb.andWhere("complaint.district_id = :scopedDistrictId", { scopedDistrictId: districtId });
    }

    const rawData = await qb.getRawMany();

    // Map month names list to fill in months with zero data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendMap: Record<string, number> = {};
    rawData.forEach((row) => {
      trendMap[row.month] = parseInt(row.count, 10) || 0;
    });

    const data: { month: string; count: number }[] = [];
    const tempDate = new Date(sixMonthsAgo);

    for (let i = 0; i < 6; i++) {
      const yearStr = tempDate.getFullYear();
      const monthNum = tempDate.getMonth() + 1;
      const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
      const key = `${yearStr}-${monthStr}`;

      data.push({
        month: `${monthNames[tempDate.getMonth()]} ${yearStr.toString().substring(2)}`,
        count: trendMap[key] || 0
      });

      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
