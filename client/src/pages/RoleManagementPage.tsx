import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useToast } from "../context/ToastContext";
import { ConfirmModal } from "../components/ConfirmModal";
import { KeyRound, ShieldCheck, Plus, Trash2, X, Check, Save } from "lucide-react";

export const RoleManagementPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [draftPermissions, setDraftPermissions] = useState<Record<string, string[]>>({});
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: "", permissions: [] as string[] });
  const [permForm, setPermForm] = useState({ name: "", description: "" });

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["all-roles"],
    queryFn: async () => { const r = await apiClient.get("/roles"); return r.data.roles; }
  });

  const { data: permissions, isLoading: permsLoading } = useQuery({
    queryKey: ["all-permissions"],
    queryFn: async () => { const r = await apiClient.get("/roles/permissions"); return r.data.permissions; }
  });

  useEffect(() => {
    if (roles) {
      const initial: Record<string, string[]> = {};
      roles.forEach((r: any) => { initial[r.id] = r.permissions || []; });
      setDraftPermissions(initial);
    }
  }, [roles]);

  const createRoleMutation = useMutation({
    mutationFn: async (payload: any) => { const r = await apiClient.post("/roles", payload); return r.data; },
    onSuccess: () => {
      showToast("Role Created", "New role added successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowRoleModal(false);
      setRoleForm({ name: "", permissions: [] });
    },
    onError: (e: any) => showToast("Error", e.response?.data?.message || "Failed to create role.", "error")
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: string[] }) => {
      const r = await apiClient.put(`/roles/${id}`, { permissions });
      return r.data;
    },
    onSuccess: () => {
      showToast("Role Updated", "Permissions saved successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
    },
    onError: (e: any) => showToast("Error", e.response?.data?.message || "Failed to update role.", "error")
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiClient.delete(`/roles/${id}`); return r.data; },
    onSuccess: () => {
      showToast("Role Deleted", "Role removed successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["all-roles"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setDeleteTarget(null);
    },
    onError: (e: any) => { showToast("Error", e.response?.data?.message || "Failed to delete role.", "error"); setDeleteTarget(null); }
  });

  const createPermMutation = useMutation({
    mutationFn: async (payload: any) => { const r = await apiClient.post("/roles/permissions", payload); return r.data; },
    onSuccess: () => {
      showToast("Permission Created", "New permission added successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["all-permissions"] });
      setShowPermModal(false);
      setPermForm({ name: "", description: "" });
    },
    onError: (e: any) => showToast("Error", e.response?.data?.message || "Failed to create permission.", "error")
  });

  const togglePermission = (roleId: string, permName: string) => {
    setDraftPermissions((prev) => {
      const current = prev[roleId] || [];
      const next = current.includes(permName)
        ? current.filter((p) => p !== permName)
        : [...current, permName];
      return { ...prev, [roleId]: next };
    });
  };

  const toggleFormPermission = (permName: string) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permName)
        ? prev.permissions.filter((p) => p !== permName)
        : [...prev.permissions, permName]
    }));
  };

  const isDirty = (roleId: string, original: string[]) => {
    const draft = draftPermissions[roleId] || [];
    if (draft.length !== original.length) return true;
    return draft.some((p) => !original.includes(p));
  };

  const builtInRoles = ["super_admin", "state_admin", "district_admin", "volunteer"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-blue-400" />
            Roles & Permissions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create custom roles, manage permission sets, and define what each role can access.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPermModal(true)} className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-colors">
            <Plus className="h-4 w-4" /><span>New Permission</span>
          </button>
          <button onClick={() => setShowRoleModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/10 transition-colors">
            <Plus className="h-4 w-4" /><span>New Role</span>
          </button>
        </div>
      </div>

      {/* Permissions catalog */}
      <div className="glassmorphism p-5 rounded-2xl">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          Permission Catalog
        </h2>
        {permsLoading ? (
          <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" /></div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {permissions?.map((p: any) => (
              <span key={p.id} title={p.description} className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold border text-slate-300 bg-slate-900 border-slate-800 capitalize">
                {p.name.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Roles */}
      {rolesLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roles?.map((role: any) => (
            <div key={role.id} className="glassmorphism p-5 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white capitalize">{role.name.replace(/_/g, " ")}</h3>
                {!builtInRoles.includes(role.name) && (
                  <button onClick={() => setDeleteTarget(role)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-950/30">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {permissions?.map((p: any) => {
                  const checked = (draftPermissions[role.id] || []).includes(p.name);
                  return (
                    <label key={p.id} className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border cursor-pointer capitalize transition-colors flex items-center gap-1.5 ${checked ? "text-blue-400 bg-blue-950/40 border-blue-900/40" : "text-slate-500 bg-slate-900 border-slate-800 hover:border-slate-700"}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => togglePermission(role.id, p.name)}
                      />
                      {p.name.replace(/_/g, " ")}
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  disabled={!isDirty(role.id, role.permissions || []) || updateRoleMutation.isPending}
                  onClick={() => updateRoleMutation.mutate({ id: role.id, permissions: draftPermissions[role.id] || [] })}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" /><span>Save Changes</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-bold text-white">Create New Role</h2>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-500 hover:text-slate-200 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createRoleMutation.mutate(roleForm); }} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Role Name *</label>
                <input required value={roleForm.name} onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200" placeholder="e.g. field_officer" />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {permissions?.map((p: any) => {
                    const checked = roleForm.permissions.includes(p.name);
                    return (
                      <label key={p.id} className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border cursor-pointer capitalize transition-colors flex items-center gap-1.5 ${checked ? "text-blue-400 bg-blue-950/40 border-blue-900/40" : "text-slate-500 bg-slate-900 border-slate-800 hover:border-slate-700"}`}>
                        <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleFormPermission(p.name)} />
                        {p.name.replace(/_/g, " ")}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors hover:bg-slate-850 text-sm">Cancel</button>
                <button type="submit" disabled={createRoleMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex justify-center items-center gap-2">
                  <Check className="h-4 w-4" /><span>Create Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Permission Modal */}
      {showPermModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-bold text-white">Create New Permission</h2>
              <button onClick={() => setShowPermModal(false)} className="text-slate-500 hover:text-slate-200 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createPermMutation.mutate(permForm); }} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Permission Name *</label>
                <input required value={permForm.name} onChange={(e) => setPermForm((p) => ({ ...p, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200" placeholder="e.g. export_reports" />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Description</label>
                <input value={permForm.description} onChange={(e) => setPermForm((p) => ({ ...p, description: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-200" placeholder="What this permission allows" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPermModal(false)} className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors hover:bg-slate-850 text-sm">Cancel</button>
                <button type="submit" disabled={createPermMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex justify-center items-center gap-2">
                  <Check className="h-4 w-4" /><span>Create Permission</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Role"
        message={`Are you sure you want to permanently delete the "${deleteTarget?.name?.replace(/_/g, " ")}" role? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteRoleMutation.isPending}
        onConfirm={() => deleteTarget && deleteRoleMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};