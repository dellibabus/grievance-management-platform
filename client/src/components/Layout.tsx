import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useToast } from "../context/ToastContext";
import {
  LayoutDashboard,
  Inbox,
  FilePlus,
  Users,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  FileText
} from "lucide-react";

export const Layout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Subscribe to real-time events via websocket
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: { title: string; message: string; type: string }) => {
      let toastType: "success" | "warning" | "error" | "info" = "info";
      if (data.type === "complaint_assigned") toastType = "success";
      if (data.type === "error") toastType = "error";
      if (data.type === "warning") toastType = "warning";
      showToast(data.title, data.message, toastType);
    };

    const handleNewComplaint = (data: { title: string; ticket_number: string }) => {
      showToast(
        "New Grievance Submitted",
        `Ticket ${data.ticket_number}: ${data.title} was submitted in your district.`,
        "info"
      );
    };

    socket.on("notification", handleNotification);
    socket.on("complaint:new", handleNewComplaint);

    return () => {
      socket.off("notification", handleNotification);
      socket.off("complaint:new", handleNewComplaint);
    };
  }, [socket, showToast]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      show: hasPermission("view_dashboard")
    },
    {
      name: "Grievances Inbox",
      path: "/complaints",
      icon: Inbox,
      show: true
    },
    {
      name: "Create Grievance",
      path: "/complaints/new",
      icon: FilePlus,
      show: true
    },
    {
      name: "User Directory",
      path: "/users",
      icon: Users,
      show: hasPermission("manage_users")
    },
    {
      name: "Alerts Inbox",
      path: "/notifications",
      icon: Bell,
      show: true
    },
    {
      name: "My Profile",
      path: "/profile",
      icon: User,
      show: true
    }
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-30">
        <Link to="/dashboard" className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-500" />
          <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Grievance AI
          </span>
        </Link>
        <button onClick={toggleSidebar} className="p-2 text-slate-400 hover:text-slate-100">
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-800/80 w-64 p-5 z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3 mb-8 px-2">
            <FileText className="h-7 w-7 text-blue-500 animate-pulse" />
            <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Grievance AI
            </span>
          </div>

          {/* User badge */}
          {user && (
            <div className="bg-slate-950/60 border border-slate-800/50 p-4 rounded-xl mb-6 flex flex-col gap-1.5 overflow-hidden">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
                {user.role.replace("_", " ")}
              </span>
              <span className="font-semibold text-sm truncate">{user.name}</span>
              <span className="text-xs text-slate-400 truncate">{user.email}</span>
              {user.district && (
                <span className="text-[10px] bg-slate-800/80 text-slate-300 py-0.5 px-2 rounded-md self-start mt-1">
                  📍 {user.district.name}
                </span>
              )}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 flex flex-col gap-1">
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-250 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/55"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-850/50 transition-colors mt-auto border border-transparent hover:border-red-950/20"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-950">
        {/* Top Navbar */}
        <header className="hidden md:flex bg-slate-900/40 border-b border-slate-850 p-4 justify-between items-center sticky top-0 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-sm text-slate-400">
              Welcome back, <span className="text-slate-100 font-semibold">{user?.name}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/notifications" className="relative p-2 text-slate-400 hover:text-slate-200">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500"></span>
            </Link>
            <Link to="/profile" className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs">
                {user?.name.charAt(0)}
              </div>
            </Link>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <div className="p-4 md:p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
