import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Plus, Pencil, Trash2, X, Check, Search, FileSpreadsheet, FileDown } from "lucide-react";
import { ConfirmModal } from "../components/ConfirmModal";
import { CustomSelect } from "../components/CustomSelect";

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", roleName: "volunteer", districtId: "" });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => { const r = await apiClient.get("/users"); return r.data.users; }
  });

  const { data: districtsData } = useQuery({
    queryKey: ["districts"],
    queryFn: async () => { const r = await apiClient.get("/locations/districts"); return r.data.districts; }
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => { const r = await apiClient.get("/locations/roles"); return r.data.roles; }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => { const r = await apiClient.post("/users", payload); return r.data; },
    onSuccess: () => { showToast("User Created", "New user account added successfully.", "success"); queryClient.invalidateQueries({ queryKey: ["users"] }); setShowModal(false); resetForm(); },
    onError: (e: any) => showToast("Error", e.response?.data?.message || "Failed to create user.", "error")
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => { const r = await apiClient.put(`/users/${id}`, payload); return r.data; },
    onSuccess: () => { showToast("User Updated", "User profile updated.", "success"); queryClient.invalidateQueries({ queryKey: ["users"] }); setShowModal(false); setEditingUser(null); resetForm(); },
    onError: (e: any) => showToast("Error", e.response?.data?.message || "Failed to update user.", "error")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiClient.delete(`/users/${id}`); return r.data; },
    onSuccess: (_data, id) => {
      showToast("User Deleted", "User account removed.", "success");
      queryClient.setQueryData(["users"], (old: any[] | undefined) => old?.filter((u) => u.id !== id));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => { showToast("Error", e.response?.data?.message || "Failed to delete user.", "error"); setDeleteTarget(null); }
  });

  const resetForm = () => setForm({ name: "", email: "", password: "", phone: "", roleName: "volunteer", districtId: "" });

  const openEdit = (u: any) => {
    setEditingUser(u);
    setForm({ name: u.name, email: u.email, password: "", phone: u.phone, roleName: u.role?.name || "volunteer", districtId: u.district?.id || "" });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, phone: form.phone, roleName: form.roleName, districtId: form.districtId || null, ...(form.password ? { password: form.password } : {}), ...(!editingUser ? { email: form.email } : {}) };
    if (editingUser) { updateMutation.mutate({ id: editingUser.id, payload }); }
    else { createMutation.mutate({ ...payload, email: form.email, password: form.password }); }
  };

  const handleDelete = (u: any) => {
    if (u.id === currentUser?.id) { showToast("Not Allowed", "Cannot delete your own account.", "warning"); return; }
    setDeleteTarget(u);
  };

  const filteredUsers = useMemo(() => {
    if (!usersData) return [];
    const term = search.trim().toLowerCase();
    return usersData.filter((u: any) => {
      const matchesSearch = !term
        || u.name?.toLowerCase().includes(term)
        || u.email?.toLowerCase().includes(term)
        || u.phone?.toLowerCase().includes(term);
      const matchesRole = !roleFilter || u.role?.name === roleFilter;
      const matchesStatus = !statusFilter
        || (statusFilter === "active" ? u.is_active : !u.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersData, search, roleFilter, statusFilter]);

  const getExportRows = () => filteredUsers.map((u: any) => ({
    Name: u.name,
    Email: u.email,
    Phone: u.phone,
    Role: u.role?.name?.replace(/_/g, " ") || "",
    District: u.district?.name || "State Level",
    Status: u.is_active ? "Active" : "Suspended",
    "Created On": new Date(u.created_at).toLocaleDateString()
  }));

  const exportExcel = () => {
    const rows = getExportRows();
    if (rows.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, `user_directory_${rows.length}.xlsx`);
  };

  const exportPDF = () => {
    const rows = getExportRows();
    if (rows.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("User Directory Report", 14, 12);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} | Records: ${rows.length}`, 14, 18);

    autoTable(doc, {
      startY: 24,
      head: [["Name", "Email", "Phone", "Role", "District", "Status", "Created On"]],
      body: rows.map((r: Record<string, any>) => Object.values(r)),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`user_directory_${rows.length}.pdf`);
  };

  const roleColorMap: Record<string, string> = {
    super_admin: "text-red-400 bg-red-950/40 border-red-900/30",
    state_admin: "text-orange-400 bg-orange-950/40 border-orange-900/30",
    district_admin: "text-blue-400 bg-blue-950/40 border-blue-900/30",
    volunteer: "text-emerald-400 bg-emerald-950/40 border-emerald-900/30"
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Manage platform user accounts and roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportExcel}
            disabled={filteredUsers.length === 0}
            title="Export to Excel"
            className="bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-900/35 text-emerald-400 font-semibold text-xs py-2.5 px-3 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Excel</span>
          </button>
          <button
            type="button"
            onClick={exportPDF}
            disabled={filteredUsers.length === 0}
            title="Export to PDF"
            className="bg-red-950/40 hover:bg-red-900/50 border border-red-900/35 text-red-400 font-semibold text-xs py-2.5 px-3 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-40"
          >
            <FileDown className="h-4 w-4" />
            <span>PDF</span>
          </button>
          {currentUser?.role === "super_admin" && (
            <button onClick={() => { resetForm(); setEditingUser(null); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/10 transition-colors">
              <Plus className="h-4 w-4" /><span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glassmorphism p-4 rounded-2xl flex flex-col md:flex-row gap-3 relative z-20">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="w-full md:w-48">
          <CustomSelect
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="All Roles"
            options={[
              { value: "", label: "All Roles" },
              ...(rolesData?.map((r: any) => ({ value: r.name, label: r.name.replace(/_/g, " ") })) || [])
            ]}
          />
        </div>
        <div className="w-full md:w-48">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            options={[
              { value: "", label: "All Statuses" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" }
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="glassmorphism p-16 rounded-2xl text-center border-slate-850">
          <h3 className="font-bold text-slate-300">No Users Found</h3>
          <p className="text-xs text-slate-450 mt-1">Try refining your search or filter parameters.</p>
        </div>
      ) : (
        <div className="glassmorphism rounded-2xl overflow-hidden border-slate-850">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800">
                  {["Name", "Email", "Phone", "Role", "District", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left py-3.5 px-5 font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name?.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-200">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400">{u.email}</td>
                    <td className="py-3.5 px-5 text-slate-400">{u.phone}</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border capitalize ${roleColorMap[u.role?.name] || "text-slate-400 bg-slate-900"}`}>
                        {u.role?.name?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400">{u.district?.name || "—"}</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.is_active ? "text-emerald-400 bg-emerald-950/40" : "text-red-400 bg-red-950/40"}`}>
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-950/30">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {currentUser?.role === "super_admin" && u.id !== currentUser.id && (
                          <button onClick={() => handleDelete(u)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950/30">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-bold text-white">{editingUser ? "Edit User" : "Create New User"}</h2>
              <button onClick={() => { setShowModal(false); setEditingUser(null); }} className="text-slate-500 hover:text-slate-200 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone *</label>
                  <input required value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200" placeholder="9876543210" />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200" placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{editingUser ? "New Password (leave blank to keep)" : "Password *"}</label>
                <input type="password" required={!editingUser} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200" placeholder="••••••••" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Role *</label>
                  <CustomSelect
                    value={form.roleName}
                    onChange={(v) => setForm(p => ({ ...p, roleName: v }))}
                    placeholder="Select role"
                    options={rolesData?.map((r: any) => ({ value: r.name, label: r.name.replace("_", " ") })) || []}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">District</label>
                  <CustomSelect
                    value={form.districtId}
                    onChange={(v) => setForm(p => ({ ...p, districtId: v }))}
                    placeholder="None (State Level)"
                    options={[
                      { value: "", label: "None (State Level)" },
                      ...(districtsData?.map((d: any) => ({ value: d.id, label: d.name })) || [])
                    ]}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingUser(null); }} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors hover:bg-slate-850 text-sm">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex justify-center items-center gap-2">
                  <Check className="h-4 w-4" /><span>{editingUser ? "Save Changes" : "Create User"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
