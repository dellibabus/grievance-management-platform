import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import {
  FileText,
  Search,
  ChevronLeft,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  Tag
} from "lucide-react";

export const TrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [ticketInput, setTicketInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackingDetails = async (ticketNum: string) => {
    if (!ticketNum.trim()) return;
    setLoading(true);
    setError(null);
    setComplaint(null);
    setUpdates([]);

    try {
      const res = await apiClient.get(`/complaints/track/${ticketNum.trim()}`);
      if (res.data.success) {
        setComplaint(res.data.complaint);
        setUpdates(res.data.updates);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Ticket number not found or server error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ticketParam = searchParams.get("ticket");
    if (ticketParam) {
      setTicketInput(ticketParam);
      fetchTrackingDetails(ticketParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackingDetails(ticketInput);
  };

  // Status badging styles mapping
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-950/70 text-amber-400 border border-amber-500/20",
      assigned: "bg-blue-950/70 text-blue-400 border border-blue-500/20",
      in_progress: "bg-purple-950/70 text-purple-400 border border-purple-500/20",
      resolved: "bg-emerald-950/70 text-emerald-450 border border-emerald-500/20",
      closed: "bg-slate-900 text-slate-400 border border-slate-750",
      rejected: "bg-red-950/70 text-red-400 border border-red-500/20"
    };

    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${styles[status] || "bg-slate-900"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-slate-900/60 border-b border-slate-850 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 backdrop-blur-md z-30">
        <Link to="/" className="flex items-center gap-3">
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Grievance AI
          </span>
        </Link>
        <Link
          to="/"
          className="text-slate-400 hover:text-slate-150 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center p-6 md:p-12 max-w-3xl w-full mx-auto justify-center">
        {/* Search bar */}
        <div className="w-full glassmorphism p-6 md:p-8 rounded-2xl shadow-xl mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Track Grievance Ticket</h2>
          <p className="text-xs text-slate-450 mb-5">Enter your GRV ticket number to review current progress status.</p>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal"
              placeholder="e.g. GRV-2026-10001"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 text-sm transition-colors shrink-0"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="bg-red-950/45 border border-red-500/30 text-red-200 p-3 rounded-xl mt-4 flex gap-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Details Display */}
        {complaint && (
          <div className="w-full flex flex-col gap-6">
            {/* Header info */}
            <div className="glassmorphism p-6 md:p-8 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <span className="font-mono text-xs text-blue-400 font-semibold uppercase tracking-wider bg-blue-950/50 py-0.5 px-2.5 rounded-md border border-blue-900/40">
                    {complaint.ticket_number}
                  </span>
                  <h3 className="text-xl font-bold mt-2.5 text-white">{complaint.title}</h3>
                </div>
                <div className="flex flex-col gap-1 md:items-end">
                  {getStatusBadge(complaint.status)}
                  <span className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Filed: {new Date(complaint.created_at).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>

              <p className="text-slate-300 text-sm mt-5 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-850/65">
                {complaint.description}
              </p>

              {/* Attributes grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 border-t border-slate-850 pt-5 text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Tag className="h-4 w-4 text-blue-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Category</span>
                    <span className="font-medium">{complaint.category.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-slate-300">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Location</span>
                    <span className="font-medium">
                      {complaint.village?.name ? `${complaint.village.name}, ` : ""}
                      {complaint.mandal.name}, {complaint.district.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Segment */}
            <div className="glassmorphism p-6 md:p-8 rounded-2xl shadow-lg">
              <h4 className="text-base font-bold text-slate-200 mb-6 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Ticket Updates Timeline</span>
              </h4>

              {updates.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-xs">No updates logged yet.</div>
              ) : (
                <div className="relative border-l border-slate-800 ml-3.5 pl-6 flex flex-col gap-7">
                  {updates.map((update, idx) => {
                    const isLast = idx === updates.length - 1;
                    return (
                      <div key={idx} className="relative">
                        {/* Bullet node */}
                        <div
                          className={`absolute -left-[31px] top-0.5 h-4 w-4 rounded-full border-2 bg-slate-950 flex items-center justify-center ${isLast
                              ? "border-blue-500 ring-4 ring-blue-500/25 animate-pulse"
                              : "border-slate-800"
                            }`}
                        >
                          {isLast && <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold capitalize text-slate-200">
                              Status: {update.status.replace("_", " ")}
                            </span>
                            <span className="text-[10px] text-slate-450">
                              {new Date(update.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-350 mt-1.5 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                            {update.comment}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
