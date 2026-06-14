import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  MapPin,
  Tag,
  User,
  Phone,
  Mail,
  File,
  MessageSquare,
  UserPlus,
  Send,
  Trash2,
  ExternalLink
} from "lucide-react";

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [comment, setComment] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");
  
  const [assigneeId, setAssigneeId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  // 1. Fetch complaint details
  const { data, isLoading, isError } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      const res = await apiClient.get(`/complaints/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  const complaint = data?.complaint;
  const attachments = data?.attachments || [];
  const updates = data?.updates || [];

  // 2. Fetch volunteers in the same district for assignment dropdown
  const { data: userData } = useQuery({
    queryKey: ["volunteers", complaint?.district?.id],
    queryFn: async () => {
      const res = await apiClient.get("/users");
      // Filter for volunteers in the complaint's district
      return res.data.users.filter(
        (u: any) =>
          u.role?.name === "volunteer" &&
          (!u.district || u.district.id === complaint?.district?.id)
      );
    },
    enabled: !!complaint?.district?.id && (user?.role !== "volunteer")
  });

  const volunteers = userData || [];

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (payload: { comment: string; status?: string }) => {
      const res = await apiClient.post(`/complaints/${id}/update`, payload);
      return res.data;
    },
    onSuccess: (res) => {
      showToast("Grievance Updated", res.message || "Timeline comment appended.", "success");
      setComment("");
      setUpdateStatus("");
      queryClient.invalidateQueries({ queryKey: ["complaint", id] });
    },
    onError: (err: any) => {
      showToast("Update Failed", err.response?.data?.message || "Failed to update complaint.", "error");
    }
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: { assigned_to_id: string; notes?: string }) => {
      const res = await apiClient.post(`/complaints/${id}/assign`, payload);
      return res.data;
    },
    onSuccess: () => {
      showToast("Assigned Successfully", "Ticket has been assigned to volunteer.", "success");
      setAssigneeId("");
      setAssignNotes("");
      queryClient.invalidateQueries({ queryKey: ["complaint", id] });
    },
    onError: (err: any) => {
      showToast("Assignment Failed", err.response?.data?.message || "Failed to assign volunteer.", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete(`/complaints/${id}`);
      return res.data;
    },
    onSuccess: () => {
      showToast("Ticket Deleted", "Complaint was deleted successfully.", "success");
      navigate("/complaints");
    },
    onError: (err: any) => {
      showToast("Deletion Failed", err.response?.data?.message || "Failed to delete complaint.", "error");
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError || !complaint) {
    return (
      <div className="glassmorphism p-12 rounded-2xl text-center border-slate-850">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h3 className="font-bold text-slate-350">Grievance Not Found</h3>
        <p className="text-xs text-slate-450 mt-1">Grievance ticket does not exist or you lack viewing permissions.</p>
        <Link to="/complaints" className="mt-4 inline-block text-xs font-semibold text-blue-400 hover:underline">
          Return to Inbox
        </Link>
      </div>
    );
  }

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment) return;
    updateMutation.mutate({
      comment,
      ...(updateStatus && { status: updateStatus })
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeId) return;
    assignMutation.mutate({
      assigned_to_id: assigneeId,
      notes: assignNotes
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to permanently delete this complaint ticket?")) {
      deleteMutation.mutate();
    }
  };

  // Badge styler helpers
  const getStatusStyle = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-950/70 text-amber-400 border border-amber-500/20",
      assigned: "bg-blue-950/70 text-blue-400 border border-blue-500/20",
      in_progress: "bg-purple-950/70 text-purple-400 border border-purple-500/20",
      resolved: "bg-emerald-950/70 text-emerald-400 border border-emerald-500/20",
      closed: "bg-slate-900 text-slate-400 border border-slate-750",
      rejected: "bg-red-950/70 text-red-400 border border-red-500/20"
    };
    return styles[status] || "bg-slate-900";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Detail Header navigation */}
      <div className="flex justify-between items-center">
        <Link
          to="/complaints"
          className="text-slate-400 hover:text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Inbox</span>
        </Link>

        {user?.role === "super_admin" && (
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-950/40 hover:bg-red-900/50 border border-red-900/35 text-red-400 font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Ticket</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Grievance Card (Main detail list) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Main Info */}
          <div className="glassmorphism p-6 md:p-8 rounded-2xl shadow-lg relative border-slate-850">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/40 border border-blue-900/40 py-0.5 px-2.5 rounded-md">
                  {complaint.ticket_number}
                </span>
                <h2 className="text-xl font-bold mt-3 text-white">{complaint.title}</h2>
              </div>
              <div className="flex flex-col gap-2 md:items-end shrink-0">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${getStatusStyle(complaint.status)}`}>
                  {complaint.status.replace("_", " ")}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Filed: {new Date(complaint.created_at).toLocaleString()}</span>
                </span>
              </div>
            </div>

            <p className="text-slate-350 text-sm mt-6 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 whitespace-pre-wrap">
              {complaint.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 border-t border-slate-850 pt-5 text-xs">
              <div className="flex items-center gap-3 text-slate-300">
                <Tag className="h-4 w-4 text-blue-500" />
                <div>
                  <span className="text-[10px] text-slate-450 block uppercase tracking-wider">Category</span>
                  <span className="font-medium text-slate-200">{complaint.category?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-300">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <div>
                  <span className="text-[10px] text-slate-450 block uppercase tracking-wider">Location Scope</span>
                  <span className="font-medium text-slate-200">
                    {complaint.village?.name ? `${complaint.village.name}, ` : ""}
                    {complaint.mandal?.name}, {complaint.district?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Attachments Viewer */}
          <div className="glassmorphism p-6 md:p-8 rounded-2xl shadow-lg border-slate-850">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <File className="h-4 w-4 text-blue-500" />
              <span>Attachments ({attachments.length})</span>
            </h3>

            {attachments.length === 0 ? (
              <p className="text-xs text-slate-450 text-center py-4">No attachments uploaded with this grievance.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {attachments.map((file: any) => {
                  const absoluteUrl = `${import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"}${file.file_url}`;
                  return (
                    <div
                      key={file.id}
                      className="bg-slate-950/80 border border-slate-850/60 p-4 rounded-xl flex flex-col gap-3 hover:border-slate-800 transition-colors"
                    >
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <File className="h-4 w-4 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-200 truncate block">{file.file_name}</span>
                            <span className="text-[10px] text-slate-450 uppercase">{file.file_type} • {(file.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                          </div>
                        </div>
                        <a
                          href={absoluteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline shrink-0"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>

                      {/* Render media files directly */}
                      {file.file_type === "image" && (
                        <div className="mt-1 rounded-lg overflow-hidden border border-slate-850/50 bg-slate-900 max-h-72 flex justify-center items-center">
                          <img
                            src={absoluteUrl}
                            alt={file.file_name}
                            className="max-h-72 object-contain w-full hover:scale-102 transition-transform duration-300"
                          />
                        </div>
                      )}

                      {file.file_type === "video" && (
                        <div className="mt-1 rounded-lg overflow-hidden border border-slate-850/50 bg-slate-900 max-h-72">
                          <video src={absoluteUrl} controls className="w-full max-h-72 object-contain" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline chronological list */}
          <div className="glassmorphism p-6 md:p-8 rounded-2xl shadow-lg border-slate-850">
            <h3 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span>Grievance Timeline Updates</span>
            </h3>

            {updates.length === 0 ? (
              <p className="text-xs text-slate-450 text-center py-4">No comments logged yet.</p>
            ) : (
              <div className="relative border-l border-slate-800 ml-4 pl-6 flex flex-col gap-6">
                {updates.map((upd: any, _idx: number) => {
                  const isSystem = !upd.updated_by;
                  return (
                    <div key={upd.id} className="relative">
                      {/* Node circle */}
                      <div className="absolute -left-[32px] top-1 h-3.5 w-3.5 rounded-full border border-slate-850 bg-slate-950"></div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-250">
                            {isSystem ? "System Logger" : upd.updated_by.name}
                          </span>
                          {!isSystem && (
                            <span className="text-[9px] bg-slate-800/80 text-blue-400 py-0.5 px-2 rounded font-medium uppercase">
                              {upd.updated_by.role?.name?.replace("_", " ")}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-450">
                            {new Date(upd.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-350 leading-relaxed bg-slate-950/45 p-3.5 rounded-xl border border-slate-900">
                          {upd.comment}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Action Sidebar Panels */}
        <div className="flex flex-col gap-6">
          {/* Citizen contacts panel */}
          <div className="glassmorphism p-6 rounded-2xl shadow-md border-slate-850">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Citizen Contact</h3>
            
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-350">
                <User className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-semibold text-slate-200">{complaint.citizen_name}</span>
              </div>
              
              <div className="flex items-center gap-2.5 text-slate-350">
                <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{complaint.citizen_phone}</span>
              </div>

              {complaint.citizen_email && (
                <div className="flex items-center gap-2.5 text-slate-350 truncate">
                  <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{complaint.citizen_email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Assign panel (Admins only) */}
          {user?.role !== "volunteer" && (
            <div className="glassmorphism p-6 rounded-2xl shadow-md border-slate-850">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-blue-500" />
                <span>Assign Volunteer</span>
              </h3>

              <form onSubmit={handleAssignSubmit} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Select Assignee</label>
                  <select
                    required
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-300"
                  >
                    <option value="">Choose Volunteer</option>
                    {volunteers.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Instruction Notes</label>
                  <textarea
                    rows={2}
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-300 resize-none"
                    placeholder="Enter instructions notes..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={assignMutation.isPending || !assigneeId}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-xs transition-colors flex justify-center items-center"
                >
                  {assignMutation.isPending ? "Assigning..." : "Assign Ticket"}
                </button>
              </form>
            </div>
          )}

          {/* Action Log Comment panel */}
          <div className="glassmorphism p-6 rounded-2xl shadow-md border-slate-850">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span>Add Progress Update</span>
            </h3>

            <form onSubmit={handleUpdateSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Update Status (Optional)</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-300"
                >
                  <option value="">Keep Current Status</option>
                  {user?.role === "volunteer" ? (
                    <>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </>
                  ) : (
                    <>
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="rejected">Rejected</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Progress Comment</label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-slate-300 resize-none"
                  placeholder="Details of action taken..."
                />
              </div>

              <button
                type="submit"
                disabled={updateMutation.isPending || !comment}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-xs transition-colors flex justify-center items-center gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{updateMutation.isPending ? "Submitting..." : "Post Update"}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
