import React, { useState } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  FileText,
  ShieldAlert
} from "lucide-react";

export const Layout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      name: "User Management",
      path: "/users",
      icon: Users,
      show: hasPermission("manage_users")
    },
    {
      name: "Audit Logs",
      path: "/audit-logs",
      icon: ShieldAlert,
      show: user?.role === "super_admin" || user?.role === "state_admin"
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
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header Bar */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-30">
        <Link to="/dashboard" className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-500" />
          <span className="font-bold text-lg tracking-wide bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Grievance
          </span>
        </Link>
        <button onClick={toggleSidebar} className="p-2 text-slate-400 hover:text-slate-100">
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 bg-slate-900 border-r border-slate-800/80 w-64 p-5 z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:h-screen md:shrink-0 overflow-y-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3 mb-8 px-2 shrink-0">
            <FileText className="h-7 w-7 text-blue-500 animate-pulse" />
            <span className="font-extrabold text-xl tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Grievance
            </span>
          </div>

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
                    className={`flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-250 ${isActive
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
            <div className="relative group border-l border-slate-800 pl-4">
              <Link to="/profile" className="flex items-center">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.name.charAt(0)}
                </div>
              </Link>

              {/* Hover dropdown card */}
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {user?.name.charAt(0)}
                  </div>
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-sm font-semibold text-slate-100 truncate">{user?.name}</span>
                    <span className="text-[11px] text-slate-400 truncate">{user?.email}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">District</span>
                  <span className="text-xs text-blue-400 font-semibold">{user?.district?.name || "State Level"}</span>
                </div>
                <Link to="/profile" className="block text-center text-[11px] font-semibold text-blue-400 hover:text-blue-300 mt-3 pt-2.5 border-t border-slate-800">
                  View Profile
                </Link>
              </div>
            </div>
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
