import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { z } from "zod";
import {
  FileText,
  Search,
  Upload,
  CheckCircle,
  Copy,
  AlertCircle,
  Clock,
  ArrowRight
} from "lucide-react";

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
      <nav className="bg-slate-900/60 border-b border-slate-850 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-500" />
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Grievance AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/track"
            className="text-slate-350 hover:text-slate-100 text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Track Grievance</span>
          </Link>
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-md shadow-blue-600/10 transition-colors"
          >
            Admin Sign In
          </Link>
        </div>
      </nav>

      {/* Landing Body Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Banner Segment */}
        <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-8 md:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-900">
          <div className="max-w-xl">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/50 py-1 px-3 rounded-full border border-blue-900/40">
              Andhra Pradesh Grievance Portal
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mt-6 leading-tight">
              Empowering Citizens,<br />
              <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
                Resolving Grievances
              </span>
            </h1>
            <p className="text-slate-400 mt-6 text-sm leading-relaxed md:text-base">
              Submit your complaints regarding local utilities, roads, healthcare, water, and power. 
              Our smart workflow routes issues directly to regional volunteers and district administrators for quick resolution.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
              <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm text-slate-200">100% Transparency</h3>
                  <p className="text-xs text-slate-400 mt-1">Get instant updates and track resolution timelines.</p>
                </div>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl flex gap-3">
                <Clock className="h-5 w-5 text-blue-400 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm text-slate-200">Real-Time Routing</h3>
                  <p className="text-xs text-slate-400 mt-1">Issues are immediately assigned to volunteers on the ground.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Segment */}
        <div className="flex-1 p-8 md:p-16 flex items-center justify-center">
          <div className="max-w-lg w-full">
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
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-300"
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      {errors.category_id && <span className="text-[10px] text-red-400 mt-1 block">{errors.category_id}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-350 mb-1.5">Priority Level</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-300"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  {/* Location Cascades */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-350 mb-1">District</label>
                      <select
                        name="district_id"
                        value={formData.district_id}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-300"
                      >
                        <option value="">Select</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      {errors.district_id && <span className="text-[9px] text-red-400 mt-0.5 block">{errors.district_id}</span>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-350 mb-1">Mandal</label>
                      <select
                        name="mandal_id"
                        value={formData.mandal_id}
                        onChange={handleInputChange}
                        disabled={!formData.district_id}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-300 disabled:opacity-40"
                      >
                        <option value="">Select</option>
                        {mandals.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      {errors.mandal_id && <span className="text-[9px] text-red-400 mt-0.5 block">{errors.mandal_id}</span>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-350 mb-1">Village</label>
                      <select
                        name="village_id"
                        value={formData.village_id}
                        onChange={handleInputChange}
                        disabled={!formData.mandal_id}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors text-slate-300 disabled:opacity-40"
                      >
                        <option value="">Select</option>
                        {villages.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
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
      </div>
    </div>
  );
};
