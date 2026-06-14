import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useToast } from "../context/ToastContext";
import { ArrowLeft, Upload, AlertCircle } from "lucide-react";

export const CreateComplaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [mandals, setMandals] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: "", description: "", citizen_name: "", citizen_phone: "",
    citizen_email: "", category_id: "", district_id: "", mandal_id: "",
    village_id: "", priority: "medium"
  });

  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get("/locations/categories").then(r => { if (r.data.success) setCategories(r.data.categories); });
    apiClient.get("/locations/districts").then(r => { if (r.data.success) setDistricts(r.data.districts); });
  }, []);

  useEffect(() => {
    if (formData.district_id) {
      apiClient.get(`/locations/districts/${formData.district_id}/mandals`).then(r => {
        if (r.data.success) { setMandals(r.data.mandals); setVillages([]); setFormData(p => ({ ...p, mandal_id: "", village_id: "" })); }
      });
    } else { setMandals([]); setVillages([]); }
  }, [formData.district_id]);

  useEffect(() => {
    if (formData.mandal_id) {
      apiClient.get(`/locations/mandals/${formData.mandal_id}/villages`).then(r => {
        if (r.data.success) { setVillages(r.data.villages); setFormData(p => ({ ...p, village_id: "" })); }
      });
    } else { setVillages([]); }
  }, [formData.mandal_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => { const c = { ...p }; delete c[name]; return c; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.title || formData.title.length < 10) newErrors.title = "Title must be at least 10 characters";
    if (!formData.description || formData.description.length < 20) newErrors.description = "Description must be at least 20 characters";
    if (!formData.citizen_name || formData.citizen_name.length < 2) newErrors.citizen_name = "Name required";
    if (!formData.citizen_phone.match(/^[6-9]\d{9}$/)) newErrors.citizen_phone = "Valid 10-digit Indian mobile number required";
    if (!formData.category_id) newErrors.category_id = "Category required";
    if (!formData.district_id) newErrors.district_id = "District required";
    if (!formData.mandal_id) newErrors.mandal_id = "Mandal required";

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v) data.append(k, v); });
      files.forEach(f => data.append("attachments", f));

      const res = await apiClient.post("/complaints", data, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.success) {
        showToast("Grievance Filed", `Ticket ${res.data.ticket_number} created successfully.`, "success");
        navigate(`/complaints`);
      }
    } catch (err: any) {
      showToast("Submission Failed", err.response?.data?.message || "Failed to submit complaint.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-200";
  const labelClass = "block text-xs font-semibold text-slate-400 mb-1.5";
  const errClass = "text-[10px] text-red-400 mt-1 block";

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">File New Grievance</h1>
          <p className="text-xs text-slate-400 mt-0.5">Submit a new complaint on behalf of a citizen.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glassmorphism p-8 rounded-2xl flex flex-col gap-5">
        {errors.form && (
          <div className="bg-red-950/50 border border-red-500/40 text-red-200 p-3.5 rounded-xl flex gap-2 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" /><span>{errors.form}</span>
          </div>
        )}

        {/* Citizen Info */}
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Citizen Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input type="text" name="citizen_name" value={formData.citizen_name} onChange={handleChange} className={inputClass} placeholder="Citizen full name" />
              {errors.citizen_name && <span className={errClass}>{errors.citizen_name}</span>}
            </div>
            <div>
              <label className={labelClass}>Phone Number *</label>
              <input type="text" name="citizen_phone" value={formData.citizen_phone} onChange={handleChange} className={inputClass} placeholder="9876543210" />
              {errors.citizen_phone && <span className={errClass}>{errors.citizen_phone}</span>}
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Email (Optional)</label>
              <input type="email" name="citizen_email" value={formData.citizen_email} onChange={handleChange} className={inputClass} placeholder="citizen@example.com" />
            </div>
          </div>
        </div>

        {/* Complaint Details */}
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Grievance Details</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelClass}>Issue Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} className={inputClass} placeholder="Brief title (min 10 chars)" />
              {errors.title && <span className={errClass}>{errors.title}</span>}
            </div>
            <div>
              <label className={labelClass}>Detailed Description *</label>
              <textarea name="description" rows={4} value={formData.description} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Provide detailed description (min 20 chars)" />
              {errors.description && <span className={errClass}>{errors.description}</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Category *</label>
                <select name="category_id" value={formData.category_id} onChange={handleChange} className={inputClass}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.category_id && <span className={errClass}>{errors.category_id}</span>}
              </div>
              <div>
                <label className={labelClass}>Priority Level</label>
                <select name="priority" value={formData.priority} onChange={handleChange} className={inputClass}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>District *</label>
              <select name="district_id" value={formData.district_id} onChange={handleChange} className={inputClass}>
                <option value="">Select District</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.district_id && <span className={errClass}>{errors.district_id}</span>}
            </div>
            <div>
              <label className={labelClass}>Mandal *</label>
              <select name="mandal_id" value={formData.mandal_id} onChange={handleChange} disabled={!formData.district_id} className={`${inputClass} disabled:opacity-40`}>
                <option value="">Select Mandal</option>
                {mandals.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {errors.mandal_id && <span className={errClass}>{errors.mandal_id}</span>}
            </div>
            <div>
              <label className={labelClass}>Village</label>
              <select name="village_id" value={formData.village_id} onChange={handleChange} disabled={!formData.mandal_id} className={`${inputClass} disabled:opacity-40`}>
                <option value="">Select Village</option>
                {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div>
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Attachments (Max 5)</h3>
          <label className="border border-dashed border-slate-700 hover:border-blue-500/50 bg-slate-950/60 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors relative">
            <input type="file" multiple onChange={(e) => { if (e.target.files) setFiles(Array.from(e.target.files).slice(0, 5)); }} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,application/pdf,video/*" />
            <Upload className="h-6 w-6 text-slate-500 mb-2" />
            <span className="text-xs text-slate-450">Click or drag files here</span>
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {files.map((f, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 pl-3 pr-2 py-1.5 rounded-lg flex items-center gap-2 text-xs">
                  <span className="truncate max-w-[140px] text-slate-300">{f.name}</span>
                  <button type="button" onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-400 transition-colors">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 font-semibold py-3 rounded-xl text-sm transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/10 flex justify-center items-center">
            {isSubmitting ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Submit Grievance"}
          </button>
        </div>
      </form>
    </div>
  );
};
