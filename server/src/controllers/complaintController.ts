import { Request, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/data-source";
import { Complaint } from "../entities/Complaint";
import { Category } from "../entities/Category";
import { District } from "../entities/District";
import { Mandal } from "../entities/Mandal";
import { Village } from "../entities/Village";
import { User } from "../entities/User";
import { Attachment } from "../entities/Attachment";
import { ComplaintUpdate } from "../entities/ComplaintUpdate";
import { Assignment } from "../entities/Assignment";
import { AuthenticatedRequest } from "../types/express";
import { logAction } from "../services/auditLogService";
import { createNotification } from "../services/notificationService";
import { sendNewComplaintToDistrict } from "../services/socketService";
import { sanitizeComplaint } from "../utils/sanitize";

// Zod Validation Schema for creating complaint
const complaintSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  citizen_name: z.string().min(2, "Citizen name must be at least 2 characters"),
  citizen_phone: z.string().regex(/^[6-9]\d{9}$/, "Citizen phone must be a valid 10-digit Indian mobile number"),
  citizen_email: z.string().email("Invalid email format").optional().or(z.literal("")),
  category_id: z.string().uuid("Invalid Category ID"),
  district_id: z.string().uuid("Invalid District ID"),
  mandal_id: z.string().uuid("Invalid Mandal ID"),
  village_id: z.string().uuid("Invalid Village ID").optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "critical"])
});

// POST /api/complaints
export const createComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Parse fields
    const parsed = complaintSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.format() });
    }

    const {
      title,
      description,
      citizen_name,
      citizen_phone,
      citizen_email,
      category_id,
      district_id,
      mandal_id,
      village_id,
      priority
    } = parsed.data;

    const compRepo = AppDataSource.getRepository(Complaint);
    const catRepo = AppDataSource.getRepository(Category);
    const distRepo = AppDataSource.getRepository(District);
    const mandalRepo = AppDataSource.getRepository(Mandal);
    const villageRepo = AppDataSource.getRepository(Village);
    const userRepo = AppDataSource.getRepository(User);

    // Validate relations exist
    const category = await catRepo.findOne({ where: { id: category_id, is_active: true } });
    if (!category) {
      return res.status(400).json({ success: false, message: "Category not found or inactive" });
    }

    const district = await distRepo.findOne({ where: { id: district_id } });
    if (!district) {
      return res.status(400).json({ success: false, message: "District not found" });
    }

    const mandal = await mandalRepo.findOne({ where: { id: mandal_id, district: { id: district_id } } });
    if (!mandal) {
      return res.status(400).json({ success: false, message: "Mandal not found in specified district" });
    }

    let village = null;
    if (village_id) {
      village = await villageRepo.findOne({ where: { id: village_id, mandal: { id: mandal_id } } });
      if (!village) {
        return res.status(400).json({ success: false, message: "Village not found in specified mandal" });
      }
    }

    const complaint = new Complaint();
    complaint.title = title;
    complaint.description = description;
    complaint.status = "pending";
    complaint.priority = priority;
    complaint.category = category;
    complaint.citizen_name = citizen_name;
    complaint.citizen_phone = citizen_phone;
    complaint.citizen_email = citizen_email || null;
    complaint.district = district;
    complaint.mandal = mandal;
    complaint.village = village;
    complaint.assigned_to = null;
    complaint.resolved_at = null;

    // Set created_by if user is logged in
    if (req.user) {
      const creator = await userRepo.findOne({ where: { id: req.user.id } });
      complaint.created_by = creator;
    } else {
      complaint.created_by = null;
    }

    const savedComplaint = await compRepo.save(complaint);

    // Handle Uploaded Attachments
    const attachments: Attachment[] = [];
    if (req.files && Array.isArray(req.files)) {
      const attachRepo = AppDataSource.getRepository(Attachment);
      for (const file of req.files) {
        const attach = new Attachment();
        attach.complaint = savedComplaint;
        attach.file_url = `/uploads/${file.filename}`;
        attach.file_name = file.originalname;
        
        // Match mime-type to file_type enum
        if (file.mimetype.startsWith("image/")) {
          attach.file_type = "image";
        } else if (file.mimetype.startsWith("video/")) {
          attach.file_type = "video";
        } else {
          attach.file_type = "pdf";
        }

        attach.file_size = file.size;

        if (req.user) {
          const uploader = await userRepo.findOne({ where: { id: req.user.id } });
          attach.uploaded_by = uploader;
        } else {
          attach.uploaded_by = null;
        }

        const savedAttach = await attachRepo.save(attach);
        attachments.push(savedAttach);
      }
    }

    // Add initial status update history log
    const updateRepo = AppDataSource.getRepository(ComplaintUpdate);
    const initialUpdate = new ComplaintUpdate();
    initialUpdate.complaint = savedComplaint;
    initialUpdate.status = "pending";
    initialUpdate.comment = "Complaint successfully submitted and registered in the system.";
    
    if (req.user) {
      const updater = await userRepo.findOne({ where: { id: req.user.id } });
      initialUpdate.updated_by = updater!;
    } else {
      // Default to Super Admin as system logger if public guest
      const systemAdmin = await userRepo.findOne({ where: { email: "admin@grievance.com" } });
      initialUpdate.updated_by = systemAdmin!;
    }
    await updateRepo.save(initialUpdate);

    // Trigger Real-Time notification inside district
    sendNewComplaintToDistrict(district.id, {
      id: savedComplaint.id,
      ticket_number: savedComplaint.ticket_number,
      title: savedComplaint.title,
      district: district.name,
      mandal: mandal.name,
      status: savedComplaint.status,
      priority: savedComplaint.priority,
      created_at: savedComplaint.created_at
    });

    // Notify any active district admins
    const districtAdmins = await userRepo.find({
      where: {
        district: { id: district.id },
        role: { name: "district_admin" }
      }
    });

    for (const dAdmin of districtAdmins) {
      await createNotification(
        dAdmin.id,
        "New Grievance Submitted",
        `A new complaint has been filed in your district: Ticket ${savedComplaint.ticket_number}`,
        "complaint_new",
        savedComplaint.id
      );
    }

    // Audit Log
    const actorId = req.user ? req.user.id : null;
    await logAction(
      actorId,
      "CREATE_COMPLAINT",
      "complaints",
      savedComplaint.id,
      { ticket_number: savedComplaint.ticket_number },
      req.ip || "127.0.0.1"
    );

    return res.status(201).json({
      success: true,
      ticket_number: savedComplaint.ticket_number,
      id: savedComplaint.id,
      message: "Grievance submitted successfully"
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/complaints
export const listComplaints = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { role, id: userId, districtId } = req.user;
    const { status, priority, district_id, category_id, search } = req.query;

    const compRepo = AppDataSource.getRepository(Complaint);
    const qb = compRepo.createQueryBuilder("complaint")
      .leftJoinAndSelect("complaint.category", "category")
      .leftJoinAndSelect("complaint.district", "district")
      .leftJoinAndSelect("complaint.mandal", "mandal")
      .leftJoinAndSelect("complaint.village", "village")
      .leftJoinAndSelect("complaint.assigned_to", "assigned_to");

    // Role-based visibility filtration
    if (role === "district_admin") {
      qb.andWhere("complaint.district_id = :uDistrictId", { uDistrictId: districtId });
    } else if (role === "volunteer") {
      qb.andWhere("complaint.assigned_to = :uUserId", { uUserId: userId });
    }

    // Query parameters filtering
    if (status) {
      qb.andWhere("complaint.status = :status", { status });
    }

    if (priority) {
      qb.andWhere("complaint.priority = :priority", { priority });
    }

    if (district_id && (role === "super_admin" || role === "state_admin")) {
      qb.andWhere("complaint.district_id = :district_id", { district_id });
    }

    if (category_id) {
      qb.andWhere("complaint.category_id = :category_id", { category_id });
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      qb.andWhere(
        "(complaint.ticket_number ILIKE :search OR complaint.title ILIKE :search OR complaint.citizen_name ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    qb.orderBy("complaint.created_at", "DESC");

    const complaints = await qb.getMany();

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints: complaints.map(sanitizeComplaint)
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/complaints/:id
export const getComplaintById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const { role, id: userId, districtId } = req.user;

    const compRepo = AppDataSource.getRepository(Complaint);
    const complaint = await compRepo.findOne({
      where: { id },
      relations: ["category", "district", "mandal", "village", "assigned_to", "created_by"]
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // RBAC validation constraints
    if (role === "district_admin" && complaint.district.id !== districtId) {
      return res.status(403).json({ success: false, message: "Forbidden: Complaint belongs to a different district" });
    }

    if (role === "volunteer" && (!complaint.assigned_to || complaint.assigned_to.id !== userId)) {
      return res.status(403).json({ success: false, message: "Forbidden: Complaint is not assigned to you" });
    }

    // Fetch attachments & timeline updates
    const attachRepo = AppDataSource.getRepository(Attachment);
    const updateRepo = AppDataSource.getRepository(ComplaintUpdate);

    const attachments = await attachRepo.find({
      where: { complaint: { id } },
      relations: ["uploaded_by"]
    });

    const updates = await updateRepo.find({
      where: { complaint: { id } },
      relations: ["updated_by"],
      order: { created_at: "ASC" }
    });

    return res.status(200).json({
      success: true,
      complaint: sanitizeComplaint(complaint),
      attachments,
      updates
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/complaints/:id
export const updateComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const { status, priority } = req.body;
    const { role, id: userId, districtId } = req.user;

    const compRepo = AppDataSource.getRepository(Complaint);
    const complaint = await compRepo.findOne({
      where: { id },
      relations: ["district", "assigned_to"]
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // RBAC constraint checking
    if (role === "district_admin" && complaint.district.id !== districtId) {
      return res.status(403).json({ success: false, message: "Forbidden: Complaint belongs to a different district" });
    }

    if (role === "volunteer") {
      if (!complaint.assigned_to || complaint.assigned_to.id !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden: Complaint is not assigned to you" });
      }
      
      // Volunteers can only change status
      if (priority) {
        return res.status(403).json({ success: false, message: "Forbidden: Volunteers cannot modify ticket priority" });
      }
    }

    const userRepo = AppDataSource.getRepository(User);
    const actor = await userRepo.findOne({ where: { id: userId } });
    const updateRepo = AppDataSource.getRepository(ComplaintUpdate);

    let isModified = false;
    let commentText = "";

    if (priority && priority !== complaint.priority) {
      commentText += `Priority adjusted from '${complaint.priority}' to '${priority}'. `;
      complaint.priority = priority;
      isModified = true;
    }

    if (status && status !== complaint.status) {
      commentText += `Status transition from '${complaint.status}' to '${status}'. `;
      complaint.status = status;
      isModified = true;

      if (status === "resolved") {
        complaint.resolved_at = new Date();
      } else if (status !== "resolved") {
        complaint.resolved_at = null;
      }
    }

    if (!isModified) {
      return res.status(400).json({ success: false, message: "No parameters modified" });
    }

    const savedComplaint = await compRepo.save(complaint);

    // Save Timeline update history
    const compUpdate = new ComplaintUpdate();
    compUpdate.complaint = savedComplaint;
    compUpdate.status = savedComplaint.status;
    compUpdate.comment = commentText.trim() || "Ticket metadata updated.";
    compUpdate.updated_by = actor!;
    await updateRepo.save(compUpdate);

    // Notify citizens or other relevant actors if needed (e.g. log audits)
    await logAction(
      userId,
      "UPDATE_COMPLAINT",
      "complaints",
      savedComplaint.id,
      { status: savedComplaint.status, priority: savedComplaint.priority },
      req.ip || "127.0.0.1"
    );

    return res.status(200).json({
      success: true,
      complaint: sanitizeComplaint(savedComplaint),
      message: "Complaint updated successfully"
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/complaints/:id
export const deleteComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;

    const compRepo = AppDataSource.getRepository(Complaint);
    const complaint = await compRepo.findOne({ where: { id } });

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    await compRepo.remove(complaint);

    // Audit Log
    await logAction(
      req.user.id,
      "DELETE_COMPLAINT",
      "complaints",
      id,
      { ticket_number: complaint.ticket_number },
      req.ip || "127.0.0.1"
    );

    return res.status(200).json({ success: true, message: "Complaint deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/complaints/:id/assign
export const assignComplaint = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const { assigned_to_id, notes } = req.body;
    const { role, id: userId, districtId } = req.user;

    if (!assigned_to_id) {
      return res.status(400).json({ success: false, message: "assigned_to_id is required" });
    }

    const compRepo = AppDataSource.getRepository(Complaint);
    const userRepo = AppDataSource.getRepository(User);
    const assignRepo = AppDataSource.getRepository(Assignment);
    const updateRepo = AppDataSource.getRepository(ComplaintUpdate);

    const complaint = await compRepo.findOne({
      where: { id },
      relations: ["district"]
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // RBAC validation constraints
    if (role === "district_admin" && complaint.district.id !== districtId) {
      return res.status(403).json({ success: false, message: "Forbidden: Complaint belongs to a different district" });
    }

    const assignee = await userRepo.findOne({
      where: { id: assigned_to_id },
      relations: ["role", "district"]
    });

    if (!assignee) {
      return res.status(404).json({ success: false, message: "Assignee user not found" });
    }

    // Validate assignee has appropriate role and region
    if (assignee.role.name !== "volunteer" && assignee.role.name !== "district_admin") {
      return res.status(400).json({ success: false, message: "Assignee must be a volunteer or district admin" });
    }

    if (assignee.district && assignee.district.id !== complaint.district.id) {
      return res.status(400).json({ success: false, message: "Assignee must reside in the same district as the complaint" });
    }

    const assigner = await userRepo.findOne({ where: { id: userId } });

    // Save Assignment log
    const assignment = new Assignment();
    assignment.complaint = complaint;
    assignment.assigned_by = assigner!;
    assignment.assigned_to = assignee;
    assignment.notes = notes || "";
    await assignRepo.save(assignment);

    // Update Complaint properties
    complaint.assigned_to = assignee;
    if (complaint.status === "pending") {
      complaint.status = "assigned";
    }
    const savedComplaint = await compRepo.save(complaint);

    // Save Timeline update history
    const updateLog = new ComplaintUpdate();
    updateLog.complaint = savedComplaint;
    updateLog.status = savedComplaint.status;
    updateLog.comment = `Assigned ticket to ${assignee.name}. Notes: ${notes || "None"}`;
    updateLog.updated_by = assigner!;
    await updateRepo.save(updateLog);

    // Create persistent Notification for volunteer assignee
    await createNotification(
      assignee.id,
      "New Complaint Assigned",
      `Grievance ticket ${complaint.ticket_number} has been assigned to you.`,
      "complaint_assigned",
      complaint.id
    );

    // Audit Log
    await logAction(
      userId,
      "ASSIGN_COMPLAINT",
      "complaints",
      complaint.id,
      { ticket_number: complaint.ticket_number, assigned_to: assignee.email },
      req.ip || "127.0.0.1"
    );

    return res.status(200).json({
      success: true,
      message: "Complaint assigned successfully",
      complaint: sanitizeComplaint(savedComplaint)
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/complaints/:id/update (Add comment/timeline update)
export const addUpdate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const { status, comment } = req.body;
    const { role, id: userId, districtId } = req.user;

    if (!comment) {
      return res.status(400).json({ success: false, message: "Comment is required" });
    }

    const compRepo = AppDataSource.getRepository(Complaint);
    const complaint = await compRepo.findOne({
      where: { id },
      relations: ["district", "assigned_to"]
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // RBAC validation constraints
    if (role === "district_admin" && complaint.district.id !== districtId) {
      return res.status(403).json({ success: false, message: "Forbidden: Complaint belongs to a different district" });
    }

    if (role === "volunteer" && (!complaint.assigned_to || complaint.assigned_to.id !== userId)) {
      return res.status(403).json({ success: false, message: "Forbidden: Complaint is not assigned to you" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const updater = await userRepo.findOne({ where: { id: userId } });
    const updateRepo = AppDataSource.getRepository(ComplaintUpdate);

    // Record comments
    const update = new ComplaintUpdate();
    update.complaint = complaint;
    update.comment = comment;
    update.updated_by = updater!;

    let statusText = complaint.status;
    if (status && status !== complaint.status) {
      // Volunteers can only set to in_progress or resolved
      if (role === "volunteer" && status !== "in_progress" && status !== "resolved") {
        return res.status(403).json({ success: false, message: "Forbidden: Volunteers can only set status to 'in_progress' or 'resolved'" });
      }

      complaint.status = status;
      statusText = status;

      if (status === "resolved") {
        complaint.resolved_at = new Date();
      } else {
        complaint.resolved_at = null;
      }
      
      await compRepo.save(complaint);
    }
    
    update.status = statusText;
    await updateRepo.save(update);

    // Audit Log
    await logAction(
      userId,
      "ADD_COMPLAINT_UPDATE",
      "complaints",
      id,
      { comment, status: statusText },
      req.ip || "127.0.0.1"
    );

    return res.status(200).json({
      success: true,
      message: "Comment added and status updated successfully",
      status: statusText
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/complaints/track/:ticket (Public tracking)
export const trackComplaint = async (req: Request, res: Response) => {
  try {
    const { ticket } = req.params;

    const compRepo = AppDataSource.getRepository(Complaint);
    const complaint = await compRepo.findOne({
      where: { ticket_number: ticket },
      relations: ["category", "district", "mandal", "village"]
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found with specified ticket number" });
    }

    const updateRepo = AppDataSource.getRepository(ComplaintUpdate);
    const updates = await updateRepo.find({
      where: { complaint: { id: complaint.id } },
      order: { created_at: "ASC" }
    });

    // Remove sensitive information for privacy protection
    const sanitizedComplaint = {
      ticket_number: complaint.ticket_number,
      title: complaint.title,
      description: complaint.description,
      status: complaint.status,
      priority: complaint.priority,
      category: { name: complaint.category.name },
      district: { name: complaint.district.name },
      mandal: { name: complaint.mandal.name },
      village: complaint.village ? { name: complaint.village.name } : null,
      created_at: complaint.created_at,
      resolved_at: complaint.resolved_at
    };

    const sanitizedUpdates = updates.map((u) => ({
      status: u.status,
      comment: u.comment,
      created_at: u.created_at
    }));

    return res.status(200).json({
      success: true,
      complaint: sanitizedComplaint,
      updates: sanitizedUpdates
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
