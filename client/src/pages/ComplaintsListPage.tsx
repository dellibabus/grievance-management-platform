import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { CustomSelect } from "../components/CustomSelect";
import {
  Search,
  Filter,
  Plus,
  Calendar,
  AlertTriangle,
  FolderOpen,
  MapPin,
  Tag,
  LayoutGrid,
  Table2,
  FileSpreadsheet,
  FileDown,
  CheckSquare,
  Square
} from "lucide-react";

export const ComplaintsListPage: React.FC = () => {
  const { user } = useAuth();

  // Search & Filter parameters
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [districtId, setDistrictId] = useState("");

  // Location filter options
  const [categories, setCategories] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);

  // View mode & row selection (for table view + export)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch categories & districts
  useEffect(() => {
    apiClient.get("/locations/categories").then((res) => {
      if (res.data.success) setCategories(res.data.categories);
    }).catch(console.error);

    if (user?.role === "super_admin" || user?.role === "state_admin") {
      apiClient.get("/locations/districts").then((res) => {
        if (res.data.success) setDistricts(res.data.districts);
      }).catch(console.error);
    }
  }, [user]);

  // Main list query
  const { data, isLoading } = useQuery({
    queryKey: ["complaints", searchTerm, status, priority, categoryId, districtId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (status) params.append("status", status);
      if (priority) params.append("priority", priority);
      if (categoryId) params.append("category_id", categoryId);
      if (districtId) params.append("district_id", districtId);

      const res = await apiClient.get(`/complaints?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 15_000
  });

  const complaints = data?.complaints || [];

  // Badges styles mapping
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-950/70 text-amber-400 border border-amber-500/20",
      assigned: "bg-blue-950/70 text-blue-400 border border-blue-500/20",
      in_progress: "bg-purple-950/70 text-purple-400 border border-purple-500/20",
      resolved: "bg-emerald-950/70 text-emerald-400 border border-emerald-500/20",
      closed: "bg-slate-900 text-slate-400 border border-slate-750",
      rejected: "bg-red-950/70 text-red-400 border border-red-500/20"
    };

    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize ${styles[status] || "bg-slate-900"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const getPriorityBadge = (prio: string) => {
    const styles: Record<string, string> = {
      low: "text-slate-400",
      medium: "text-blue-400",
      high: "text-amber-500 font-semibold",
      critical: "text-red-500 font-bold animate-pulse"
    };

    return (
      <span className={`text-xs capitalize flex items-center gap-1 ${styles[prio] || ""}`}>
        {prio === "critical" && <AlertTriangle className="h-3.5 w-3.5" />}
        <span>{prio}</span>
      </span>
    );
  };

  // Toggle a single row's selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select-all (current filtered list)
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === complaints.length) return new Set();
      return new Set(complaints.map((c: any) => c.id));
    });
  };

  // Resolve which rows to export: selected rows if any, else all filtered rows
  const getExportRows = () => {
    const source = selectedIds.size > 0
      ? complaints.filter((c: any) => selectedIds.has(c.id))
      : complaints;

    return source.map((c: any) => ({
      Ticket: c.ticket_number,
      Title: c.title,
      Status: c.status?.replace("_", " "),
      Priority: c.priority,
      Category: c.category?.name || "",
      District: c.district?.name || "",
      Mandal: c.mandal?.name || "",
      Village: c.village?.name || "",
      Citizen: c.citizen_name,
      Phone: c.citizen_phone,
      Assignee: c.assigned_to?.name || "Unassigned",
      "Filed On": new Date(c.created_at).toLocaleDateString()
    }));
  };

  const exportExcel = () => {
    const rows = getExportRows();
    if (rows.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Complaints");
    XLSX.writeFile(workbook, `grievance_report_${rows.length}.xlsx`);
  };

  const exportPDF = () => {
    const rows = getExportRows();
    if (rows.length === 0) return;

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Grievance Report", 14, 12);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} | Records: ${rows.length}`, 14, 18);

    autoTable(doc, {
      startY: 24,
      head: [["Ticket", "Title", "Status", "Priority", "Category", "District", "Mandal", "Village", "Citizen", "Phone", "Assignee", "Filed On"]],
      body: rows.map((r: Record<string, any>) => Object.values(r)),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`grievance_report_${rows.length}.pdf`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Grievance Inbox</h1>
          <p className="text-xs text-slate-400 mt-1">Review, track, and assign incoming complaints.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-850 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table view"
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Table2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid view"
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Export buttons */}
          <button
            type="button"
            onClick={exportExcel}
            disabled={complaints.length === 0}
            title={selectedIds.size > 0 ? `Export ${selectedIds.size} selected to Excel` : "Export all to Excel"}
            className="bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-900/35 text-emerald-400 font-semibold text-xs py-2.5 px-3 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Excel{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}</span>
          </button>
          <button
            type="button"
            onClick={exportPDF}
            disabled={complaints.length === 0}
            title={selectedIds.size > 0 ? `Export ${selectedIds.size} selected to PDF` : "Export all to PDF"}
            className="bg-red-950/40 hover:bg-red-900/50 border border-red-900/35 text-red-400 font-semibold text-xs py-2.5 px-3 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-40"
          >
            <FileDown className="h-4 w-4" />
            <span>PDF{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}</span>
          </button>

          <Link
            to="/complaints/new"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/10 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Grievance</span>
          </Link>
        </div>
      </div>

      {/* Filters Segment */}
      <div className="glassmorphism p-5 rounded-2xl flex flex-col gap-4 border-slate-850">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Filter className="h-4 w-4 text-blue-500" />
          <span>Search & Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              placeholder="Search ticket, citizen..."
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          </div>

          {/* Status */}
          <CustomSelect
            value={status}
            onChange={setStatus}
            placeholder="All Statuses"
            options={[
              { value: "", label: "All Statuses" },
              { value: "pending", label: "Pending Review" },
              { value: "assigned", label: "Assigned" },
              { value: "in_progress", label: "In Progress" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
              { value: "rejected", label: "Rejected" }
            ]}
          />

          {/* Priority */}
          <CustomSelect
            value={priority}
            onChange={setPriority}
            placeholder="All Priorities"
            options={[
              { value: "", label: "All Priorities" },
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" }
            ]}
          />

          {/* Category */}
          <CustomSelect
            value={categoryId}
            onChange={setCategoryId}
            placeholder="All Categories"
            options={[
              { value: "", label: "All Categories" },
              ...categories.map((c) => ({ value: c.id, label: c.name }))
            ]}
          />

          {/* District (Admins only) */}
          {(user?.role === "super_admin" || user?.role === "state_admin") ? (
            <CustomSelect
              value={districtId}
              onChange={setDistrictId}
              placeholder="All Districts"
              options={[
                { value: "", label: "All Districts" },
                ...districts.map((d) => ({ value: d.id, label: d.name }))
              ]}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center justify-between">
              <span>District Scoped</span>
              <span className="font-semibold text-slate-300">{user?.district?.name || "None"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="glassmorphism p-16 rounded-2xl text-center border-slate-850">
          <FolderOpen className="h-10 w-10 text-slate-500 mx-auto mb-4" />
          <h3 className="font-bold text-slate-300">No Grievances Found</h3>
          <p className="text-xs text-slate-450 mt-1">Try refining your filter parameters or search term.</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="glassmorphism rounded-2xl overflow-hidden border-slate-850">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800">
                  <th className="py-3.5 px-4 w-10">
                    <button type="button" onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-400 transition-colors flex items-center">
                      {selectedIds.size === complaints.length ? (
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  {["Ticket", "Title", "Status", "Priority", "Category", "Location", "Assignee", "Filed On"].map((h) => (
                    <th key={h} className="text-left py-3.5 px-4 font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {complaints.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <button type="button" onClick={() => toggleSelect(c.id)} className="text-slate-400 hover:text-blue-400 transition-colors flex items-center">
                        {selectedIds.has(c.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/complaints/${c.id}`} className="font-mono text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-900/40 py-0.5 px-2 rounded-md hover:underline whitespace-nowrap">
                        {c.ticket_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 max-w-[220px]">
                      <Link to={`/complaints/${c.id}`} className="text-slate-200 font-medium hover:text-blue-400 transition-colors line-clamp-1">
                        {c.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(c.status)}</td>
                    <td className="py-3 px-4">{getPriorityBadge(c.priority)}</td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span>{c.category?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">
                          {c.village?.name ? `${c.village.name}, ` : ""}
                          {c.mandal?.name}, {c.district?.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {c.assigned_to ? c.assigned_to.name : "Unassigned"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {complaints.map((c: any) => (
            <Link
              key={c.id}
              to={`/complaints/${c.id}`}
              className="glassmorphism p-5 rounded-2xl border-slate-850/80 hover:border-blue-500/25 hover:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-200 shadow-sm"
            >
              {/* Left details */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-900/40 py-0.5 px-2 rounded-md">
                    {c.ticket_number}
                  </span>
                  {getStatusBadge(c.status)}
                </div>
                <h3 className="text-sm font-semibold text-slate-100 hover:text-blue-400 transition-colors truncate">
                  {c.title}
                </h3>
                
                {/* Meta details list */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-400 mt-0.5">
                  <div className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span>{c.category?.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate max-w-[180px]">
                      {c.village?.name ? `${c.village.name}, ` : ""}
                      {c.mandal?.name}, {c.district?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Right details */}
              <div className="flex flex-wrap items-center gap-4 border-t border-slate-850/60 md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-between shrink-0">
                <div className="flex flex-col gap-1 md:items-end">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">Priority</span>
                  {getPriorityBadge(c.priority)}
                </div>

                <div className="flex flex-col gap-1 md:items-end min-w-[110px]">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">Assignee</span>
                  <span className="text-xs text-slate-200 font-medium truncate max-w-[120px]">
                    {c.assigned_to ? c.assigned_to.name : "Unassigned"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
