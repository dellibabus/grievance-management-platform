import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { User, Shield, MapPin, Mail, Save } from "lucide-react";

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const r = await apiClient.put(`/users/${user?.id}`, payload);
      return r.data;
    },
    onSuccess: () => showToast("Profile Updated", "Your profile has been saved successfully.", "success"),
    onError: (e: any) => showToast("Update Failed", e.response?.data?.message || "Failed to update profile.", "error")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      showToast("Password Mismatch", "Passwords do not match. Please re-enter.", "error");
      return;
    }
    const payload: any = { name, phone };
    if (newPassword) payload.password = newPassword;
    updateMutation.mutate(payload);
  };

  const roleColorMap: Record<string, string> = {
    super_admin: "text-red-400 bg-red-950/40 border-red-900/30",
    state_admin: "text-orange-400 bg-orange-950/40 border-orange-900/30",
    district_admin: "text-blue-400 bg-blue-950/40 border-blue-900/30",
    volunteer: "text-emerald-400 bg-emerald-950/40 border-emerald-900/30"
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your account details and security settings.</p>
      </div>

      {/* Profile Header Card */}
      <div className="glassmorphism p-6 rounded-2xl border-slate-850 flex items-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-600/20">
          {user?.name?.charAt(0)}
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold text-white">{user?.name}</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border capitalize ${roleColorMap[user?.role || ""] || "text-slate-400 bg-slate-900"}`}>
              {user?.role?.replace("_", " ")}
            </span>
            {user?.district && (
              <span className="text-[10px] text-slate-400 bg-slate-900/80 border border-slate-800 py-1 px-2.5 rounded-md flex items-center gap-1">
                <MapPin className="h-3 w-3" />{user.district.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glassmorphism p-4 rounded-xl border-slate-850 flex items-center gap-3">
          <Mail className="h-5 w-5 text-blue-500 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Email</span>
            <span className="text-xs font-semibold text-slate-200 truncate">{user?.email}</span>
          </div>
        </div>
        <div className="glassmorphism p-4 rounded-xl border-slate-850 flex items-center gap-3">
          <Shield className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Permissions</span>
            <span className="text-xs font-semibold text-slate-200">{user?.permissions?.length || 0} grants</span>
          </div>
        </div>
        <div className="glassmorphism p-4 rounded-xl border-slate-850 flex items-center gap-3">
          <User className="h-5 w-5 text-purple-500 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Account Status</span>
            <span className="text-xs font-semibold text-emerald-400">Active</span>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="glassmorphism p-6 rounded-2xl border-slate-850 flex flex-col gap-5">
        <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3">Edit Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-200" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-200" />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Change Password</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors text-slate-200" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/10 flex items-center gap-2">
            <Save className="h-4 w-4" />
            <span>{updateMutation.isPending ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </form>

      {/* Permissions list */}
      {user?.permissions && user.permissions.length > 0 && (
        <div className="glassmorphism p-6 rounded-2xl border-slate-850">
          <h3 className="text-sm font-bold text-slate-200 mb-4">Assigned Permissions</h3>
          <div className="flex flex-wrap gap-2">
            {user.permissions.map((perm: string) => (
              <span key={perm} className="text-[10px] font-semibold text-slate-300 bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-lg">
                {perm.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
