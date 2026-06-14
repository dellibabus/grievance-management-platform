import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useToast } from "../context/ToastContext";
import { Bell, CheckCheck, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const NotificationsPage: React.FC = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => { const r = await apiClient.get("/notifications"); return r.data.notifications; },
    refetchInterval: 30000 // Auto-refresh every 30s
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => { await apiClient.put(`/notifications/${id}/read`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => { await apiClient.put("/notifications/read-all"); },
    onSuccess: () => { showToast("Done", "All notifications marked as read.", "success"); queryClient.invalidateQueries({ queryKey: ["notifications"] }); }
  });

  const notifications = data || [];
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const typeColorMap: Record<string, string> = {
    complaint_new: "text-blue-400 bg-blue-950/40 border-blue-900/30",
    complaint_assigned: "text-emerald-400 bg-emerald-950/40 border-emerald-900/30",
    complaint_updated: "text-purple-400 bg-purple-950/40 border-purple-900/30",
    warning: "text-amber-400 bg-amber-950/40 border-amber-900/30",
    error: "text-red-400 bg-red-950/40 border-red-900/30"
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      complaint_new: "New Grievance",
      complaint_assigned: "Assignment",
      complaint_updated: "Status Update"
    };
    return labels[type] || type.replace(/_/g, " ");
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-500" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Your activity feed and system alerts.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
          >
            <CheckCheck className="h-4 w-4" /><span>Mark All Read</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glassmorphism p-16 rounded-2xl text-center border-slate-850">
          <Bell className="h-10 w-10 text-slate-600 mx-auto mb-4" />
          <h3 className="font-bold text-slate-400">All Caught Up!</h3>
          <p className="text-xs text-slate-500 mt-1">No notifications to display right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`glassmorphism p-4 rounded-xl transition-all duration-200 border ${!n.is_read ? "border-blue-500/20 bg-blue-950/5" : "border-slate-850"}`}
            >
              <div className="flex items-start gap-3">
                {/* Unread indicator */}
                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!n.is_read ? "bg-blue-500" : "bg-transparent"}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${typeColorMap[n.type] || "text-slate-400 bg-slate-900 border-slate-800"}`}>
                        {getTypeLabel(n.type)}
                      </span>
                      {!n.is_read && (
                        <button onClick={() => markReadMutation.mutate(n.id)} className="text-[10px] text-slate-500 hover:text-blue-400 font-medium transition-colors">
                          Mark read
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">{new Date(n.created_at).toLocaleString()}</span>
                  </div>

                  <h4 className="text-sm font-semibold text-slate-200 mt-1.5">{n.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>

                  {n.reference_id && (
                    <Link
                      to={`/complaints/${n.reference_id}`}
                      className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <FileText className="h-3 w-3" /><span>View Grievance</span><ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
