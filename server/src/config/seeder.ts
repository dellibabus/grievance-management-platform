import { AppDataSource } from "./data-source";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";
import { User } from "../entities/User";
import { Category } from "../entities/Category";
import { District } from "../entities/District";
import { Mandal } from "../entities/Mandal";
import { Village } from "../entities/Village";
import { Complaint } from "../entities/Complaint";
import { ComplaintUpdate } from "../entities/ComplaintUpdate";
import bcrypt from "bcrypt";

export async function runSeeder() {
  console.log("Starting database seeding...");

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Clear existing data in correct dependency order
  const entities = [
    "complaint_updates",
    "assignments",
    "attachments",
    "complaints",
    "refresh_tokens",
    "audit_logs",
    "users",
    "roles",
    "permissions",
    "categories",
    "villages",
    "mandals",
    "districts"
  ];

  for (const entity of entities) {
    try {
      await AppDataSource.query(`TRUNCATE TABLE "${entity}" CASCADE`);
    } catch (e) {
      // Ignore if table does not exist yet
    }
  }

  console.log("Truncated existing tables.");

  // 1. Seed Permissions
  const permList = [
    { name: "create_complaint", description: "Create a grievance ticket" },
    { name: "assign_complaint", description: "Assign complaints to users" },
    { name: "view_all_complaints", description: "View complaints across all locations" },
    { name: "view_district_complaints", description: "View complaints within own district" },
    { name: "view_assigned_complaints", description: "View complaints assigned to self" },
    { name: "manage_users", description: "Create, update and delete platform users" },
    { name: "view_dashboard", description: "View dashboards and metrics" },
    { name: "delete_complaint", description: "Remove complaints (super_admin only)" },
    { name: "export_reports", description: "Export metrics reports" }
  ];

  const permissionsMap: Record<string, Permission> = {};
  for (const p of permList) {
    const perm = new Permission();
    perm.name = p.name;
    perm.description = p.description;
    permissionsMap[p.name] = await AppDataSource.getRepository(Permission).save(perm);
  }
  console.log("Permissions seeded.");

  // 2. Seed Roles
  const rolesData = [
    {
      name: "super_admin" as const,
      permissions: [
        "create_complaint",
        "assign_complaint",
        "view_all_complaints",
        "manage_users",
        "view_dashboard",
        "delete_complaint",
        "export_reports"
      ]
    },
    {
      name: "state_admin" as const,
      permissions: [
        "create_complaint",
        "assign_complaint",
        "view_all_complaints",
        "manage_users",
        "view_dashboard",
        "export_reports"
      ]
    },
    {
      name: "district_admin" as const,
      permissions: [
        "create_complaint",
        "assign_complaint",
        "view_district_complaints",
        "manage_users",
        "view_dashboard",
        "export_reports"
      ]
    },
    {
      name: "volunteer" as const,
      permissions: [
        "create_complaint",
        "view_assigned_complaints"
      ]
    }
  ];

  const rolesMap: Record<string, Role> = {};
  for (const r of rolesData) {
    const role = new Role();
    role.name = r.name;
    role.permissions = r.permissions;
    rolesMap[r.name] = await AppDataSource.getRepository(Role).save(role);
  }
  console.log("Roles seeded.");

  // 3. Seed Categories
  const categoriesData = [
    { name: "Infrastructure", description: "Roads, buildings, bridges, and public amenities defects", icon: "HardHat" },
    { name: "Healthcare", description: "Public health centers, medical supplies, and sanitation services", icon: "HeartPulse" },
    { name: "Education", description: "Government schools, facilities, and education schemes", icon: "GraduationCap" },
    { name: "Water Supply", description: "Drinking water distribution pipelines, leakages, and quality issues", icon: "Droplet" },
    { name: "Electricity", description: "Streetlights, power outages, and dangerous wiring", icon: "Zap" }
  ];

  const categoriesMap: Record<string, Category> = {};
  for (const c of categoriesData) {
    const category = new Category();
    category.name = c.name;
    category.description = c.description;
    category.icon = c.icon;
    category.is_active = true;
    categoriesMap[c.name] = await AppDataSource.getRepository(Category).save(category);
  }
  console.log("Categories seeded.");

  // 4. Seed Districts, Mandals, and Villages
  const locationData = [
    {
      district: "Hyderabad",
      state: "Telangana",
      mandals: [
        { name: "Secunderabad", villages: ["Marredpally", "Trimulgherry", "Bowenpally"] },
        { name: "Khairatabad", villages: ["Banjara Hills", "Ameerpet", "Somajiguda"] },
        { name: "Charminar", villages: ["Falaknuma", "Chandrayangutta", "Bahadurpura"] }
      ]
    },
    {
      district: "Rangareddy",
      state: "Telangana",
      mandals: [
        { name: "Serilingampally", villages: ["Gachibowli", "Madhapur", "Kondapur"] },
        { name: "LB Nagar", villages: ["Vanasthalipuram", "Hayathnagar", "Saroornagar"] },
        { name: "Shamshabad", villages: ["Shamshabad", "Rajendranagar", "Chevella"] }
      ]
    },
    {
      district: "Medchal-Malkajgiri",
      state: "Telangana",
      mandals: [
        { name: "Kukatpally", villages: ["KPHB Colony", "Nizampet", "Bachupally"] },
        { name: "Malkajgiri", villages: ["Safilguda", "Neredmet", "ECIL"] },
        { name: "Quthbullapur", villages: ["Suchitra", "Jeedimetla", "Balanagar"] }
      ]
    },
    {
      district: "Warangal Urban",
      state: "Telangana",
      mandals: [
        { name: "Hanamkonda", villages: ["Kakatiya Nagar", "Subedari", "Mathwada"] },
        { name: "Warangal", villages: ["Kishanpura", "Ramnagar", "Bhadrakali"] },
        { name: "Kazipet", villages: ["Kazipet Town", "Bheemaram", "Sangem"] }
      ]
    },
    {
      district: "Karimnagar",
      state: "Telangana",
      mandals: [
        { name: "Karimnagar Urban", villages: ["Christianpet", "Mukarampura", "Bhagat Nagar"] },
        { name: "Husnabad", villages: ["Husnabad Town", "Akkapally", "Ramadugu"] },
        { name: "Jammikunta", villages: ["Jammikunta Town", "Elgandal", "Veenavanka"] }
      ]
    },
    {
      district: "Visakhapatnam",
      state: "Andhra Pradesh",
      mandals: [
        { name: "Bheemunipatnam", villages: ["Thagarapuvalasa", "Nallarekula", "Bheemili"] },
        { name: "Anandapuram", villages: ["Vellanki", "Gidijala", "Anandapuram"] },
        { name: "Pendurthi", villages: ["Chinna Mushidiwada", "Jerripothulapalem", "Rampuram"] }
      ]
    },
    {
      district: "Guntur",
      state: "Andhra Pradesh",
      mandals: [
        { name: "Guntur Urban", villages: ["Nallapadu", "Adavitakkellapadu", "Gorantla"] },
        { name: "Tenali", villages: ["Tenali Rural", "Pinapadu", "Angalakuduru"] },
        { name: "Mangalagiri", villages: ["Atmakur", "Kaza", "Chinna Kakani"] }
      ]
    },
    {
      district: "Krishna",
      state: "Andhra Pradesh",
      mandals: [
        { name: "Vijayawada Urban", villages: ["Gunadala", "Patamata", "Singh Nagar"] },
        { name: "Gannavaram", villages: ["Savajigudem", "Buddhavaram", "Kesarapalle"] },
        { name: "Kanchikacherla", villages: ["Keezara", "Kunchavaram", "Paritala"] }
      ]
    },
    {
      district: "Nellore",
      state: "Andhra Pradesh",
      mandals: [
        { name: "Nellore Urban", villages: ["Kallurupalli", "Podalakur Road", "Buja Buja Nellore"] },
        { name: "Kavali", villages: ["Kavali Rural", "Maddurupadu", "Rudrakota"] },
        { name: "Gudur", villages: ["Gudur Rural", "Chillakur", "Vindur"] }
      ]
    },
    {
      district: "Chittoor",
      state: "Andhra Pradesh",
      mandals: [
        { name: "Chittoor Urban", villages: ["Murakambattu", "Ganganapalle", "Kondamitta"] },
        { name: "Tirupati Rural", villages: ["Avilala", "Mallvaram", "Tummalagunta"] },
        { name: "Madanapalle", villages: ["Madanapalle Rural", "Kollabylu", "Basinikonda"] }
      ]
    }
  ];

  const districtsMap: Record<string, District> = {};
  const mandalsMap: Record<string, Mandal[]> = {};
  const villagesMap: Record<string, Village[]> = {};

  for (const dData of locationData) {
    const dist = new District();
    dist.name = dData.district;
    dist.state = dData.state;
    const savedDist = await AppDataSource.getRepository(District).save(dist);
    districtsMap[dData.district] = savedDist;

    mandalsMap[savedDist.id] = [];
    for (const mData of dData.mandals) {
      const mandal = new Mandal();
      mandal.name = mData.name;
      mandal.district = savedDist;
      const savedMandal = await AppDataSource.getRepository(Mandal).save(mandal);
      mandalsMap[savedDist.id].push(savedMandal);

      villagesMap[savedMandal.id] = [];
      for (const vName of mData.villages) {
        const village = new Village();
        village.name = vName;
        village.mandal = savedMandal;
        const savedVillage = await AppDataSource.getRepository(Village).save(village);
        villagesMap[savedMandal.id].push(savedVillage);
      }
    }
  }
  console.log("Districts, Mandals, and Villages seeded.");

  // 5. Seed Users
  // Super Admin: admin@grievance.com / Admin@123
  const userRepo = AppDataSource.getRepository(User);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("Admin@123", salt);

  const superAdmin = new User();
  superAdmin.name = "Super Administrator";
  superAdmin.email = "admin@grievance.com";
  superAdmin.password = hashedPassword;
  superAdmin.phone = "9876543210";
  superAdmin.role = rolesMap["super_admin"];
  superAdmin.district = null;
  superAdmin.is_active = true;
  const savedSuperAdmin = await userRepo.save(superAdmin);

  // State Admin
  const stateAdmin = new User();
  stateAdmin.name = "State Admin User";
  stateAdmin.email = "state@grievance.com";
  stateAdmin.password = hashedPassword;
  stateAdmin.phone = "9876543211";
  stateAdmin.role = rolesMap["state_admin"];
  stateAdmin.district = null;
  stateAdmin.is_active = true;
  await userRepo.save(stateAdmin);

  // District Admin: Visakhapatnam
  const vizagAdmin = new User();
  vizagAdmin.name = "Vizag District Admin";
  vizagAdmin.email = "vizag_admin@grievance.com";
  vizagAdmin.password = hashedPassword;
  vizagAdmin.phone = "9876543212";
  vizagAdmin.role = rolesMap["district_admin"];
  vizagAdmin.district = districtsMap["Visakhapatnam"];
  vizagAdmin.is_active = true;
  const savedVizagAdmin = await userRepo.save(vizagAdmin);

  // Volunteer: Visakhapatnam, Bheemunipatnam mandal
  const volunteer = new User();
  volunteer.name = "Vizag Volunteer A";
  volunteer.email = "volunteer_vizag@grievance.com";
  volunteer.password = hashedPassword;
  volunteer.phone = "9876543213";
  volunteer.role = rolesMap["volunteer"];
  volunteer.district = districtsMap["Visakhapatnam"];
  volunteer.is_active = true;
  const savedVolunteer = await userRepo.save(volunteer);

  console.log("Users seeded.");

  // 6. Seed Complaints (10 Sample Complaints)
  const complaintRepo = AppDataSource.getRepository(Complaint);
  const complaintUpdateRepo = AppDataSource.getRepository(ComplaintUpdate);

  const complaintsData = [
    {
      title: "Potholes on Bheemili Beach Road",
      description: "Heavy rains have caused deep potholes on the Beach Road near Bheemunipatnam. Dangerous for two-wheelers.",
      status: "pending" as const,
      priority: "high" as const,
      categoryName: "Infrastructure",
      districtName: "Visakhapatnam",
      mandalIndex: 0,
      villageIndex: 2,
      citizenName: "Ramesh Kumar",
      citizenPhone: "9000123456",
      citizenEmail: "ramesh@example.com",
      assignedTo: null,
      createdBy: null
    },
    {
      title: "Public Health Center Closed during Working Hours",
      description: "The primary health clinic in Anandapuram was closed during afternoon hours. Patients are waiting outside.",
      status: "assigned" as const,
      priority: "critical" as const,
      categoryName: "Healthcare",
      districtName: "Visakhapatnam",
      mandalIndex: 1,
      villageIndex: 2,
      citizenName: "Srinivas Rao",
      citizenPhone: "9123456780",
      citizenEmail: "srinivas@example.com",
      assignedTo: savedVolunteer,
      createdBy: null
    },
    {
      title: "Government School Lacks Clean Toilets",
      description: "Girls' toilets in Vellanki school are unusable due to leakage. Students are facing extreme difficulties.",
      status: "in_progress" as const,
      priority: "high" as const,
      categoryName: "Education",
      districtName: "Visakhapatnam",
      mandalIndex: 1,
      villageIndex: 0,
      citizenName: "Latha Reddy",
      citizenPhone: "9390123456",
      citizenEmail: "latha.reddy@example.com",
      assignedTo: savedVolunteer,
      createdBy: savedVizagAdmin
    },
    {
      title: "Broken Drinking Water Pipeline",
      description: "Drinking water main line is broken in Tenali Rural area. Huge wastage of filtered water and muddy water mix.",
      status: "resolved" as const,
      priority: "medium" as const,
      categoryName: "Water Supply",
      districtName: "Guntur",
      mandalIndex: 1,
      villageIndex: 0,
      citizenName: "K. Satyanarayana",
      citizenPhone: "9848022334",
      citizenEmail: null,
      assignedTo: null,
      createdBy: null
    },
    {
      title: "Frequent Power Cuts in Patamata",
      description: "Power cut happens 4 to 5 times daily in Patamata. Voltage fluctuations are damaging electronic equipment.",
      status: "closed" as const,
      priority: "medium" as const,
      categoryName: "Electricity",
      districtName: "Krishna",
      mandalIndex: 0,
      villageIndex: 1,
      citizenName: "M. Prasad",
      citizenPhone: "7702812345",
      citizenEmail: "prasad@example.com",
      assignedTo: null,
      createdBy: null
    },
    {
      title: "Clogged Drainage in Patamata Main Street",
      description: "Drainage is overflowing onto the street. Unbearable smell and mosquito breeding threat for residents.",
      status: "pending" as const,
      priority: "medium" as const,
      categoryName: "Infrastructure",
      districtName: "Krishna",
      mandalIndex: 0,
      villageIndex: 1,
      citizenName: "M. Prasad",
      citizenPhone: "7702812345",
      citizenEmail: "prasad@example.com",
      assignedTo: null,
      createdBy: null
    },
    {
      title: "Lack of Doctors in Kavali PHC",
      description: "Only one doctor is serving Kavali Rural health center, leading to 3+ hours wait times for critical patients.",
      status: "pending" as const,
      priority: "high" as const,
      categoryName: "Healthcare",
      districtName: "Nellore",
      mandalIndex: 1,
      villageIndex: 0,
      citizenName: "D. Hari",
      citizenPhone: "8885566778",
      citizenEmail: "hari@example.com",
      assignedTo: null,
      createdBy: null
    },
    {
      title: "Damaged Solar Street Lights in Tummalagunta",
      description: "Over 10 solar street lights are completely non-functional for past 3 months. High risk of thefts and accidents.",
      status: "pending" as const,
      priority: "low" as const,
      categoryName: "Electricity",
      districtName: "Chittoor",
      mandalIndex: 1,
      villageIndex: 2,
      citizenName: "S. Venkatesh",
      citizenPhone: "6300112233",
      citizenEmail: "venky@example.com",
      assignedTo: null,
      createdBy: null
    },
    {
      title: "No Books Distributed in Madanapalle School",
      description: "Students of 6th grade haven't received government English textbooks even after 2 months of school opening.",
      status: "rejected" as const,
      priority: "low" as const,
      categoryName: "Education",
      districtName: "Chittoor",
      mandalIndex: 2,
      villageIndex: 0,
      citizenName: "A. Chandrasekhar",
      citizenPhone: "9440112233",
      citizenEmail: "chandra@example.com",
      assignedTo: null,
      createdBy: null
    },
    {
      title: "Borewell Contamination in Gudur",
      description: "Water pumped from community borewell is coming out red and smells of iron. Residents have no other water source.",
      status: "in_progress" as const,
      priority: "critical" as const,
      categoryName: "Water Supply",
      districtName: "Nellore",
      mandalIndex: 2,
      villageIndex: 1,
      citizenName: "V. Mary",
      citizenPhone: "9550123456",
      citizenEmail: null,
      assignedTo: null,
      createdBy: null
    }
  ];

  let index = 1;
  for (const compData of complaintsData) {
    const complaint = new Complaint();
    complaint.title = compData.title;
    complaint.description = compData.description;
    complaint.status = compData.status;
    complaint.priority = compData.priority;
    complaint.category = categoriesMap[compData.categoryName];
    
    const dist = districtsMap[compData.districtName];
    complaint.district = dist;
    
    const mandal = mandalsMap[dist.id][compData.mandalIndex];
    complaint.mandal = mandal;
    
    const village = villagesMap[mandal.id][compData.villageIndex];
    complaint.village = village;

    complaint.citizen_name = compData.citizenName;
    complaint.citizen_phone = compData.citizenPhone;
    complaint.citizen_email = compData.citizenEmail;
    complaint.assigned_to = compData.assignedTo;
    complaint.created_by = compData.createdBy;

    // Simulate ticket number with progression to ensure uniqueness
    const year = new Date().getFullYear();
    complaint.ticket_number = `GRV-${year}-${10000 + index}`;
    index++;

    if (compData.status === "resolved" || compData.status === "closed") {
      complaint.resolved_at = new Date();
    }

    const savedComp = await complaintRepo.save(complaint);

    // Seed initial complaint update comment
    const update = new ComplaintUpdate();
    update.complaint = savedComp;
    update.updated_by = savedSuperAdmin;
    update.status = "pending";
    update.comment = "Complaint successfully registered in system.";
    await complaintUpdateRepo.save(update);

    // If assigned, add assigned update log
    if (compData.assignedTo) {
      const updateAssign = new ComplaintUpdate();
      updateAssign.complaint = savedComp;
      updateAssign.updated_by = savedSuperAdmin;
      updateAssign.status = "assigned";
      updateAssign.comment = `Assigned to volunteer: ${compData.assignedTo.name}`;
      await complaintUpdateRepo.save(updateAssign);
    }
  }

  console.log("Complaints seeded.");
  console.log("Database seeding completed successfully!");
}

// If run directly from terminal
if (require.main === module) {
  AppDataSource.initialize()
    .then(async () => {
      await runSeeder();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error during database seeding initialization:", err);
      process.exit(1);
    });
}
