import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  MapPin,
  Tag
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Queries to fetch stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await apiClient.get("/dashboard/stats");
      return res.data.stats;
    }
  });

  const { data: categoryData, isLoading: catLoading } = useQuery({
    queryKey: ["dashboard-by-category"],
    queryFn: async () => {
      const res = await apiClient.get("/dashboard/by-category");
      return res.data.data;
    }
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["dashboard-by-status"],
    queryFn: async () => {
      const res = await apiClient.get("/dashboard/by-status");
      return res.data.data;
    }
  });

  const { data: districtData, isLoading: distLoading } = useQuery({
    queryKey: ["dashboard-by-district"],
    queryFn: async () => {
      const res = await apiClient.get("/dashboard/by-district");
      return res.data.data;
    }
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["dashboard-trend"],
    queryFn: async () => {
      const res = await apiClient.get("/dashboard/trend");
      return res.data.data;
    }
  });

  const isLoading = statsLoading || catLoading || statusLoading || distLoading || trendLoading;

  // Pie chart coloring settings
  const COLORS = {
    pending: "#F59E0B",     // Amber
    assigned: "#3B82F6",    // Blue
    in_progress: "#8B5CF6", // Purple
    resolved: "#10B981",    // Green
    closed: "#6B7280",      // Gray
    rejected: "#EF4444"     // Red
  };

  const getStatusColor = (name: string) => {
    const key = name.toLowerCase() as keyof typeof COLORS;
    return COLORS[key] || "#94A3B8";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-sm opacity-75">Compiling dashboard data...</span>
        </div>
      </div>
    );
  }

  // Format Status data for Recharts Pie
  const pieData = statusData?.map((item: any) => ({
    name: item.name.replace("_", " ").toUpperCase(),
    value: item.count,
    color: getStatusColor(item.name)
  })) || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Dashboard Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard Overview</h1>
        <p className="text-xs text-slate-400 mt-1">
          {user?.role === "district_admin"
            ? `Scoped metrics for: ${user.district?.name} District`
            : "Platform-wide analytical reporting dashboard"}
        </p>
      </div>

      {/* Stats Cards Row */}
      {statsData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <div className="glassmorphism p-5 rounded-2xl flex items-center justify-between border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">Total Grievances</span>
              <span className="text-2xl font-bold mt-1 block text-white">{statsData.total}</span>
            </div>
            <div className="h-10 w-10 bg-slate-800/80 rounded-xl flex items-center justify-center text-slate-300 border border-slate-750">
              <Ticket className="h-5 w-5 text-blue-400" />
            </div>
          </div>

          {/* Pending */}
          <div className="glassmorphism p-5 rounded-2xl flex items-center justify-between border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">Pending Reviews</span>
              <span className="text-2xl font-bold mt-1 block text-amber-400">{statsData.pending}</span>
            </div>
            <div className="h-10 w-10 bg-amber-950/20 rounded-xl flex items-center justify-center border border-amber-900/30">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </div>

          {/* In Progress */}
          <div className="glassmorphism p-5 rounded-2xl flex items-center justify-between border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">In Investigation</span>
              <span className="text-2xl font-bold mt-1 block text-purple-400">
                {statsData.in_progress + statsData.assigned}
              </span>
            </div>
            <div className="h-10 w-10 bg-purple-950/20 rounded-xl flex items-center justify-center border border-purple-900/30">
              <AlertTriangle className="h-5 w-5 text-purple-500" />
            </div>
          </div>

          {/* Resolved */}
          <div className="glassmorphism p-5 rounded-2xl flex items-center justify-between border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-400 block">Resolved / Closed</span>
              <span className="text-2xl font-bold mt-1 block text-emerald-400">
                {statsData.resolved + statsData.closed}
              </span>
            </div>
            <div className="h-10 w-10 bg-emerald-950/20 rounded-xl flex items-center justify-center border border-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {/* Visualizations Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line Chart */}
        <div className="lg:col-span-2 glassmorphism p-6 rounded-2xl border-slate-800/80">
          <h2 className="text-sm font-bold text-slate-200 mb-5 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span>Grievance Ingestion Trend (6 Months)</span>
          </h2>
          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", color: "#F1F5F9" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Grievances Filed"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Pie Chart */}
        <div className="glassmorphism p-6 rounded-2xl border-slate-800/80">
          <h2 className="text-sm font-bold text-slate-200 mb-5 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <span>Breakdown by Status</span>
          </h2>
          <div className="h-80 w-full text-xs flex flex-col justify-center items-center">
            {pieData.length === 0 ? (
              <span className="text-slate-450">No data available</span>
            ) : (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", color: "#F1F5F9" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legends list */}
                <div className="grid grid-cols-3 gap-2 w-full mt-4 text-[10px]">
                  {pieData.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-1.5 truncate">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-slate-350 truncate">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="glassmorphism p-6 rounded-2xl border-slate-800/80">
          <h2 className="text-sm font-bold text-slate-200 mb-5 flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-500" />
            <span>Breakdown by Category</span>
          </h2>
          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", color: "#F1F5F9" }}
                />
                <Bar dataKey="count" name="Complaints" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                  {categoryData?.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#8B5CF6" : "#6366F1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* District Breakdown list/bars */}
        <div className="glassmorphism p-6 rounded-2xl border-slate-800/80">
          <h2 className="text-sm font-bold text-slate-200 mb-5 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span>Breakdown by District</span>
          </h2>
          <div className="h-80 w-full text-xs">
            {user?.role === "district_admin" ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                District Admin role restricts visibility to single district metrics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis type="number" stroke="#94A3B8" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94A3B8" width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", color: "#F1F5F9" }}
                  />
                  <Bar dataKey="count" name="Complaints" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
