import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { CustomSelect } from "../components/CustomSelect";
import { z } from "zod";
import {
  FileText,
  Search,
  Upload,
  CheckCircle,
  Copy,
  AlertCircle,
  Clock,
  ArrowRight,
  Building2,
  HeartPulse,
  GraduationCap,
  Droplet,
  Zap,
  ShieldCheck,
  MapPin,
  Smartphone,
  BarChart3,
  ChevronDown,
  Mail,
  Phone,
  Send
} from "lucide-react";

// Maps known complaint category names to display icons on the landing page
const categoryIconMap: Record<string, React.ElementType> = {
  Infrastructure: Building2,
  Healthcare: HeartPulse,
  Education: GraduationCap,
  "Water Supply": Droplet,
  Electricity: Zap
};

// Client-side Zod Schema
const complaintFormSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  citizen_name: z.string().min(2, "Citizen name must be at least 2 characters"),
  citizen_phone: z.string().regex(/^[6-9]\d{9}$/, "Phone number must be a valid 10-digit Indian mobile number"),
  citizen_email: z.string().email("Invalid email format").optional().or(z.literal("")),
  category_id: z.string().uuid("Please select a category"),
  district_id: z.string().uuid("Please select a district"),
  mandal_id: z.string().uuid("Please select a mandal"),
  village_id: z.string().uuid("Please select a village").optional().or(z.literal("")),
  priority: z.enum(["low", "medium", "high", "critical"])
});

export const LandingPage: React.FC = () => {
  // Master Lists
  const [categories, setCategories] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [mandals, setMandals] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    citizen_name: "",
    citizen_phone: "",
    citizen_email: "",
    category_id: "",
    district_id: "",
    mandal_id: "",
    village_id: "",
    priority: "medium" as const
  });

  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any>(null); // { ticket_number, id }
  const [copied, setCopied] = useState(false);

  // Load Categories and Districts on startup
  useEffect(() => {
    apiClient.get("/locations/categories").then((res) => {
      if (res.data.success) setCategories(res.data.categories);
    }).catch(console.error);

    apiClient.get("/locations/districts").then((res) => {
      if (res.data.success) setDistricts(res.data.districts);
    }).catch(console.error);
  }, []);

  // Cascading Location Loaders
  useEffect(() => {
    if (formData.district_id) {
      apiClient.get(`/locations/districts/${formData.district_id}/mandals`).then((res) => {
        if (res.data.success) {
          setMandals(res.data.mandals);
          setVillages([]); // reset village
          setFormData((prev) => ({ ...prev, mandal_id: "", village_id: "" }));
        }
      }).catch(console.error);
    } else {
      setMandals([]);
      setVillages([]);
    }
  }, [formData.district_id]);

  useEffect(() => {
    if (formData.mandal_id) {
      apiClient.get(`/locations/mandals/${formData.mandal_id}/villages`).then((res) => {
        if (res.data.success) {
          setVillages(res.data.villages);
          setFormData((prev) => ({ ...prev, village_id: "" }));
        }
      }).catch(console.error);
    } else {
      setVillages([]);
    }
  }, [formData.mandal_id]);

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const setField = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  // Handle File Selections
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length + files.length > 5) {
        alert("Maximum 5 file attachments are allowed.");
        return;
      }
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const validation = complaintFormSchema.safeParse(formData);
    if (!validation.success) {
      const formattedErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          formattedErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(formattedErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      // Setup Multipart form data
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });

      files.forEach((file) => {
        data.append("attachments", file);
      });

      const res = await apiClient.post("/complaints", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.success) {
        setSubmitSuccess({
          ticket_number: res.data.ticket_number,
          id: res.data.id
        });
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.message || "An error occurred while submitting. Please try again.";
      setErrors({ form: serverMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (submitSuccess) {
      navigator.clipboard.writeText(submitSuccess.ticket_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Landing Top Nav */}
      <nav className="bg-slate-900/60 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 backdrop-blur-md z-30 border-b border-slate-900/80">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Grievance
          </span>
        </div>
        <div className="hidden md:flex items-center gap-7">
          <a href="#how-it-works" className="text-slate-400 hover:text-slate-100 text-xs font-medium transition-colors">How It Works</a>
          <a href="#categories" className="text-slate-400 hover:text-slate-100 text-xs font-medium transition-colors">Categories</a>
          <a href="#faq" className="text-slate-400 hover:text-slate-100 text-xs font-medium transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/track"
            className="text-slate-350 hover:text-slate-100 text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Track Grievance</span>
          </Link>
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-md shadow-blue-600/10 transition-colors"
          >
            Admin Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border-b border-slate-900">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 md:px-12 py-10 md:py-20 flex flex-col items-center text-center">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/50 py-1.5 px-4 rounded-full border border-blue-900/40">
            Citizen Grievance Redressal Portal
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mt-7 leading-tight tracking-tight">
            Your Voice,<br className="hidden sm:block" />{" "}
            <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Heard &amp; Resolved
            </span>
          </h1>
          <p className="text-slate-400 mt-6 text-sm md:text-base leading-relaxed max-w-2xl">
            Report issues related to roads, water supply, electricity, healthcare, and education in your area.
            Every grievance is logged, routed to the right district team, and tracked end-to-end —
            so you always know what's happening.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-10 w-full sm:w-auto">
            <a
              href="#file-grievance"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-3.5 px-8 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              <span>File a Grievance</span>
            </a>
            <Link
              to="/track"
              className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-slate-200 font-semibold text-sm py-3.5 px-8 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span>Track Your Grievance</span>
            </Link>
          </div>

          {/* Trust strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-14 w-full max-w-3xl">
            {[
              { icon: ShieldCheck, label: "Secure & Confidential" },
              { icon: MapPin, label: "Multi-District Coverage" },
              { icon: BarChart3, label: "Real-Time Tracking" },
              { icon: Clock, label: "File Anytime, Anywhere" }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 bg-slate-900/50 border border-slate-800/70 rounded-2xl py-4 px-2">
                <item.icon className="h-5 w-5 text-blue-400" />
                <span className="text-[11px] font-semibold text-slate-300 text-center leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-slate-950 border-b border-slate-900 py-16 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/50 py-1 px-3 rounded-full border border-blue-900/40">
              Simple Process
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-4">How It Works</h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              From the moment you submit a grievance to its final resolution, every step is logged,
              tracked, and visible to you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: FileText,
                step: "01",
                title: "Submit Grievance",
                desc: "Fill in the issue details, your location, and attach supporting photos or documents."
              },
              {
                icon: Copy,
                step: "02",
                title: "Get a Ticket ID",
                desc: "Receive a unique tracking number instantly to monitor your grievance anytime."
              },
              {
                icon: MapPin,
                step: "03",
                title: "Routed to the Right Team",
                desc: "Your complaint is automatically assigned to the relevant district admin and volunteer."
              },
              {
                icon: CheckCircle,
                step: "04",
                title: "Track & Resolve",
                desc: "Follow real-time status updates until your grievance is marked resolved."
              }
            ].map((item, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden hover:border-blue-900/50 transition-colors">
                <span className="absolute -top-3 -right-1 text-5xl font-extrabold text-slate-850/80 select-none">
                  {item.step}
                </span>
                <div className="h-11 w-11 bg-blue-600/10 border border-blue-900/40 text-blue-400 rounded-xl flex items-center justify-center mb-4 relative z-10">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm text-slate-100 relative z-10">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed relative z-10">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories We Handle */}
      <section id="categories" className="bg-slate-900/30 border-b border-slate-900 py-16 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/50 py-1 px-3 rounded-full border border-blue-900/40">
              What We Cover
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-4">Grievance Categories</h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              We accept complaints across a wide range of civic services and route each one to the team best equipped to resolve it.
            </p>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {categories.map((cat) => {
                const Icon = categoryIconMap[cat.name] || FileText;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setField("category_id", cat.id);
                      document.getElementById("file-grievance")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="bg-slate-900/60 border border-slate-800/80 hover:border-blue-700/50 hover:bg-slate-900 rounded-2xl p-5 flex flex-col items-center text-center gap-3 transition-colors group"
                  >
                    <div className="h-12 w-12 bg-blue-600/10 border border-blue-900/40 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-slate-500 text-sm">Loading categories…</div>
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="border-b border-slate-900 py-16 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/50 py-1 px-3 rounded-full border border-blue-900/40">
              Why This Platform
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-4">Built for Transparency &amp; Speed</h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              A purpose-built grievance redressal system designed for citizens, volunteers, and administrators alike.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: ShieldCheck,
                title: "Role-Based Access",
                desc: "Super admins, state &amp; district admins, and volunteers each get a focused, permission-controlled workspace."
              },
              {
                icon: BarChart3,
                title: "Live Status Tracking",
                desc: "Every grievance carries a full timeline of status changes, comments, and assignments."
              },
              {
                icon: MapPin,
                title: "District-Wise Routing",
                desc: "Complaints are automatically scoped to the correct district, mandal, and village for faster action."
              },
              {
                icon: Upload,
                title: "Photo & Document Proof",
                desc: "Attach images, PDFs, or videos to give the resolving team complete context."
              },
              {
                icon: Smartphone,
                title: "Mobile Friendly",
                desc: "File and track grievances from any device — no app download required."
              },
              {
                icon: Clock,
                title: "Always Accessible",
                desc: "Submit a grievance anytime; track its progress whenever you need an update."
              }
            ].map((item, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex gap-4">
                <div className="h-11 w-11 bg-indigo-600/10 border border-indigo-900/40 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-100">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* File a Grievance */}
      <section id="file-grievance" className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border-b border-slate-900 py-20 px-6 md:px-12 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-80 w-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          {/* Info panel */}
          <div className="lg:col-span-2 lg:sticky lg:top-28">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/50 py-1 px-3 rounded-full border border-blue-900/40">
              File a Grievance
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-5 leading-tight">
              Tell us what's wrong —<br />we'll take it from here.
            </h2>
            <p className="text-slate-400 text-sm mt-4 leading-relaxed">
              Fill out the form with your contact details, the issue, and its location.
              You'll receive a unique ticket number to track progress at every stage.
            </p>

            <div className="flex flex-col gap-3 mt-8">
              {[
                "Your name and a valid 10-digit mobile number",
                "A clear title and description of the issue",
                "Category, district, mandal & village (for routing)",
                "Optional photos, PDFs or videos as proof (max 5)"
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-slate-300">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mt-8 flex gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Your contact details are only used to update you on this grievance and are never shared publicly.
              </p>
            </div>
          </div>

          {/* Form card */}
          <div className="lg:col-span-3">
            {submitSuccess ? (
              // Success Screen
              <div className="glassmorphism p-8 rounded-3xl text-center shadow-2xl glow-blue">
                <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 animate-bounce" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Grievance Registered!</h2>
                <p className="text-slate-400 text-xs px-4 leading-relaxed">
                  Your grievance ticket has been successfully logged. Please save the ticket number below to track the progress.
                </p>

                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl mt-6 flex justify-between items-center group">
                  <span className="font-mono text-lg font-bold text-blue-400 tracking-wider">
                    {submitSuccess.ticket_number}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-350 hover:text-slate-100 transition-colors"
                  >
                    {copied ? <span className="text-xs text-emerald-400 font-semibold px-1">Copied!</span> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Link
                    to={`/track?ticket=${submitSuccess.ticket_number}`}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span>Track Status</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => {
                      setSubmitSuccess(null);
                      setFiles([]);
                      setFormData({
                        title: "",
                        description: "",
                        citizen_name: "",
                        citizen_phone: "",
                        citizen_email: "",
                        category_id: "",
                        district_id: "",
                        mandal_id: "",
                        village_id: "",
                        priority: "medium"
                      });
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-semibold text-sm py-3 rounded-xl transition-all"
                  >
                    File Another Grievance
                  </button>
                </div>
              </div>
            ) : (
              // Intake Form
              <div className="glassmorphism p-8 rounded-3xl shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-1">File a Grievance</h2>
                <p className="text-xs text-slate-450 mb-6">Provide your contact details and specify the issue.</p>

                {errors.form && (
                  <div className="bg-red-950/50 border border-red-500/40 text-red-200 p-3.5 rounded-xl mb-5 flex gap-2 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{errors.form}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Citizen Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-350 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        name="citizen_name"
                        value={formData.citizen_name}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="John Doe"
                      />
                      {errors.citizen_name && <span className="text-[10px] text-red-400 mt-1 block">{errors.citizen_name}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-350 mb-1.5">Phone Number</label>
                      <input
                        type="text"
                        name="citizen_phone"
                        value={formData.citizen_phone}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="9876543210"
                      />
                      {errors.citizen_phone && <span className="text-[10px] text-red-400 mt-1 block">{errors.citizen_phone}</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1.5">Email ID (Optional)</label>
                    <input
                      type="email"
                      name="citizen_email"
                      value={formData.citizen_email}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="john@example.com"
                    />
                    {errors.citizen_email && <span className="text-[10px] text-red-400 mt-1 block">{errors.citizen_email}</span>}
                  </div>

                  <hr className="border-slate-850/80 my-1" />

                  {/* Complaint Section */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1.5">Issue Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Brief title of the issue"
                    />
                    {errors.title && <span className="text-[10px] text-red-400 mt-1 block">{errors.title}</span>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1.5">Detailed Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      placeholder="Provide detailed description of the grievance..."
                    />
                    {errors.description && <span className="text-[10px] text-red-400 mt-1 block">{errors.description}</span>}
                  </div>

                  {/* Category and Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-350 mb-1.5">Category</label>
                      <CustomSelect
                        value={formData.category_id}
                        onChange={(v) => setField("category_id", v)}
                        placeholder="Select Category"
                        options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
                      />
                      {errors.category_id && <span className="text-[10px] text-red-400 mt-1 block">{errors.category_id}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-350 mb-1.5">Priority Level</label>
                      <CustomSelect
                        value={formData.priority}
                        onChange={(v) => setField("priority", v)}
                        options={[
                          { value: "low", label: "Low" },
                          { value: "medium", label: "Medium" },
                          { value: "high", label: "High" },
                          { value: "critical", label: "Critical" }
                        ]}
                      />
                    </div>
                  </div>

                  {/* Location Cascades */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-350 mb-1">District</label>
                      <CustomSelect
                        value={formData.district_id}
                        onChange={(v) => setField("district_id", v)}
                        placeholder="Select"
                        options={districts.map((d) => ({ value: d.id, label: d.name }))}
                      />
                      {errors.district_id && <span className="text-[9px] text-red-400 mt-0.5 block">{errors.district_id}</span>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-350 mb-1">Mandal</label>
                      <CustomSelect
                        value={formData.mandal_id}
                        onChange={(v) => setField("mandal_id", v)}
                        placeholder="Select"
                        disabled={!formData.district_id}
                        options={mandals.map((m) => ({ value: m.id, label: m.name }))}
                      />
                      {errors.mandal_id && <span className="text-[9px] text-red-400 mt-0.5 block">{errors.mandal_id}</span>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-350 mb-1">Village</label>
                      <CustomSelect
                        value={formData.village_id}
                        onChange={(v) => setField("village_id", v)}
                        placeholder="Select"
                        disabled={!formData.mandal_id}
                        options={villages.map((v) => ({ value: v.id, label: v.name }))}
                      />
                      {errors.village_id && <span className="text-[9px] text-red-400 mt-0.5 block">{errors.village_id}</span>}
                    </div>
                  </div>

                  {/* File Uploads */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-350 mb-1.5">Attachments (Max 5)</label>
                    <div className="border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-colors relative">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*,application/pdf,video/*"
                      />
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="text-[11px] text-slate-450 mt-1">Upload images, PDFs, or videos (Max 50MB)</span>
                    </div>

                    {files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {files.map((file, i) => (
                          <div
                            key={i}
                            className="bg-slate-900 border border-slate-850 pl-3 pr-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="truncate max-w-[120px] text-slate-300">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeFile(i)}
                              className="text-[10px] text-slate-450 hover:text-red-450"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/10 mt-3 flex justify-center items-center"
                  >
                    {isSubmitting ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Submit Grievance"
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-900/30 border-t border-slate-900 py-16 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/50 py-1 px-3 rounded-full border border-blue-900/40">
              Need Help?
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-4">Frequently Asked Questions</h2>
          </div>

          <div className="flex flex-col gap-3">
            {[
              {
                q: "How do I track the status of my grievance?",
                a: "After submitting a grievance, you'll receive a unique ticket number. Use the \"Track Grievance\" link in the navigation bar and enter your ticket number to view its current status and full timeline."
              },
              {
                q: "Is there a limit on attachments?",
                a: "Yes, you can attach up to 5 files (images, PDFs, or videos, max 50MB each) to support your grievance with photos or documents."
              },
              {
                q: "Who handles my complaint?",
                a: "Your grievance is automatically routed based on the district, mandal, and village you select, and assigned to a volunteer or district administrator responsible for that area."
              },
              {
                q: "Do I need to create an account to file a grievance?",
                a: "No. Citizens can file and track grievances without registering. Accounts are only required for administrators and volunteers who manage and resolve grievances."
              },
              {
                q: "What happens after my grievance is marked resolved?",
                a: "The status timeline will show the resolution details and any comments left by the resolving team. You can always revisit the tracking page using your ticket number for a complete history."
              }
            ].map((item, i) => (
              <details key={i} className="group bg-slate-900/60 border border-slate-800/80 rounded-2xl px-5 py-4 open:border-blue-900/50 transition-colors">
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                  <span className="text-sm font-semibold text-slate-100">{item.q}</span>
                  <ChevronDown className="h-4 w-4 text-slate-450 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 pt-14 pb-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Grievance
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                A unified platform for citizens to report civic issues and for administrators
                to manage, assign, and resolve them transparently.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4">Quick Links</h4>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                <li>
                  <a href="#file-grievance" className="hover:text-blue-400 transition-colors">File a Grievance</a>
                </li>
                <li>
                  <Link to="/track" className="hover:text-blue-400 transition-colors">Track Grievance</Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-blue-400 transition-colors">Admin / Volunteer Sign In</Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4">Categories</h4>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                {categories.length > 0 ? (
                  categories.slice(0, 5).map((cat) => (
                    <li key={cat.id}>{cat.name}</li>
                  ))
                ) : (
                  <li>Infrastructure, Healthcare, Education &amp; more</li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-4">Contact</h4>
              <ul className="flex flex-col gap-2.5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-blue-400" />
                  <span>+91 9879091012 </span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-blue-400" />
                  <span>exampl@gmail.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5 text-blue-400" />
                  <span>Available Mon–Sat, 9 AM – 6 PM</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-900 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-[11px] text-slate-500">
              &copy; {new Date().getFullYear()} Grievance Management Platform. All rights reserved.
            </p>
            <p className="text-[11px] text-slate-500">
              Empowering Citizens, Resolving Grievances.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
