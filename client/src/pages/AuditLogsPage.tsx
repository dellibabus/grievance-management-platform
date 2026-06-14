import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { CustomSelect } from "../components/CustomSelect";
import { Search, ShieldAlert, ChevronLeft, ChevronRight, Clock } from "lucide-react";

const actionColorMap: Record<string, string> = {
  login: "text-blue-400 bg-blue-950/40 border-blue-900/30",
  register: "text-blue-400 bg-blue-950/40 border-blue-900/30",
  logout: "text-slate-400 bg-slate-900 border-slate-800",
  create: "text-emerald-400 bg-emerald-950/40 border-emerald-900/30",
  update: "text-amber-400 bg-amber-950/40 border-amber-900/30",
  delete: "text-red-400 bg-red-950/40 border-red-900/30",
  assign: "text-indigo-400 bg-indigo-950/40 border-indigo-900/30"
};

const getActionBadge = (action: string) => {
  const key = Object.keys(actionColorMap).find((k) => action.toLowerCase().includes(k));
  return actionColorMap[key || ""] || "text-slate-400 bg-slate-900 border-slate-800";
};

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");

  const { data: metaData } = useQuery({
    queryKey: ["audit-log-meta"],
    queryFn: async () => { const r = await apiClient.get("/audit-logs/meta"); return r.data; }
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, search, action, entity],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "20");
      if (search) params.append("search", search);
      if (action) params.append("action", action);
      if (entity) params.append("entity", entity);
      const r = await apiClient.get(`/audit-logs?${params.toString()}`);
      return r.data;
    }
  });

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-blue-400" />
          Audit Logs
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Track sensitive actions performed across the platform — logins, complaint changes, user management, and more.
        </p>
      </div>

      {/* Filters */}
      <div className="glassmorphism p-4 rounded-2xl flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by user name, email or record ID..."
            className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div className="w-full md:w-48">
          <CustomSelect
            value={action}
            onChange={(v) => { setAction(v); setPage(1); }}
            placeholder="All Actions"
            options={[
              { value: "", label: "All Actions" },
              ...(metaData?.actions?.map((a: string) => ({ value: a, label: a.replace(/_/g, " ") })) || [])
            ]}
          />
        </div>
        <div className="w-full md:w-48">
          <CustomSelect
            value={entity}
            onChange={(v) => { setEntity(v); setPage(1); }}
            placeholder="All Entities"
            options={[
              { value: "", label: "All Entities" },
              ...(metaData?.entities?.map((e: string) => ({ value: e, label: e.replace(/_/g, " ") })) || [])
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="glassmorphism rounded-2xl overflow-hidden border-slate-850">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-sm text-slate-500">No audit log entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800">
                  {["Timestamp", "User", "Action", "Entity", "Record ID", "IP Address", "Details"].map((h) => (
                    <th key={h} className="text-left py-3.5 px-5 font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors align-top">
                    <td className="py-3.5 px-5 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      {log.user ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">{log.user.name}</span>
                          <span className="text-slate-500 text-[11px]">{log.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">System</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border capitalize whitespace-nowrap ${getActionBadge(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-300 capitalize whitespace-nowrap">{log.entity.replace(/_/g, " ")}</td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-[11px]">
                      {log.entity_id ? `${log.entity_id.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">{log.ip_address || "—"}</td>
                    <td className="py-3.5 px-5 text-slate-400 max-w-xs">
                      {log.meta ? (
                        <pre className="text-[10px] whitespace-pre-wrap break-all text-slate-500 font-mono">
                          {JSON.stringify(log.meta)}
                        </pre>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Page {page} of {totalPages} — {total} total entries</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
