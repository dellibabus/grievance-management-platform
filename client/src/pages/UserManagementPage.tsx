import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", roleName: "volunteer", districtId: "" });

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
    onSuccess: () => { showToast("User Deleted", "User account removed.", "success"); queryClient.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: any) => showToast("Error", e.response?.data?.message || "Failed to delete user.", "error")
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

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) { showToast("Not Allowed", "Cannot delete your own account.", "warning"); return; }
    if (window.confirm("Delete this user account?")) deleteMutation.mutate(id);
  };

  const roleColorMap: Record<string, string> = {
    super_admin: "text-red-400 bg-red-950/40 border-red-900/30",
    state_admin: "text-orange-400 bg-orange-950/40 border-orange-900/30",
    district_admin: "text-blue-400 bg-blue-950/40 border-blue-900/30",
    volunteer: "text-emerald-400 bg-emerald-950/40 border-emerald-900/30"
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">User Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Manage platform user accounts and roles.</p>
        </div>
        {currentUser?.role === "super_admin" && (
          <button onClick={() => { resetForm(); setEditingUser(null); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/10 transition-colors">
            <Plus className="h-4 w-4" /><span>Add User</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>
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
                {usersData?.map((u: any) => (
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
                          <button onClick={() => handleDelete(u.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950/30">
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
              {!editingUser && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200" placeholder="user@example.com" />
                </div>
              )}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{editingUser ? "New Password (leave blank to keep)" : "Password *"}</label>
                <input type="password" required={!editingUser} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200" placeholder="••••••••" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Role *</label>
                  <select value={form.roleName} onChange={e => setForm(p => ({ ...p, roleName: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-300">
                    {rolesData?.map((r: any) => <option key={r.id} value={r.name}>{r.name.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">District</label>
                  <select value={form.districtId} onChange={e => setForm(p => ({ ...p, districtId: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-300">
                    <option value="">None (State Level)</option>
                    {districtsData?.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
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
    </div>
  );
};
