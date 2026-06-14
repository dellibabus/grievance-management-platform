import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Filter,
  Plus,
  Calendar,
  AlertTriangle,
  FolderOpen,
  MapPin,
  Tag
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
    }
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

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Grievance Inbox</h1>
          <p className="text-xs text-slate-400 mt-1">Review, track, and assign incoming complaints.</p>
        </div>
        <Link
          to="/complaints/new"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/10 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Grievance</span>
        </Link>
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
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-300"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Category */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-300"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* District (Admins only) */}
          {(user?.role === "super_admin" || user?.role === "state_admin") ? (
            <select
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-300"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : (
            <div className="bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-400 flex items-center justify-between">
              <span>District Scoped</span>
              <span className="font-semibold text-slate-300">{user?.district?.name || "None"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid List */}
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
