"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  UserCheck,
  TrendingUp,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserPlus,
  Menu,
  X,
  FileText,
  KeyRound,
  Search
} from "lucide-react";

export default function Sidebar({ expanded, setExpanded, mobileOpen, setMobileOpen }) {
  const pathname = usePathname();
  const { currentUser, role, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "team"] },
    { name: "Clients", href: "/clients", icon: Users, roles: ["admin", "manager", "team"] },
    { name: "Projects", href: "/projects", icon: FolderKanban, roles: ["admin", "manager", "team"] },
    { name: "Tasks", href: "/tasks", icon: CheckSquare, roles: ["admin", "manager", "team"] },
    { name: "Team", href: "/team", icon: UserCheck, roles: ["admin", "manager", "team"] },
    { name: "Leads", href: "/leads", icon: BarChart3, roles: ["admin", "manager"] },
    { name: "Finance", href: "/finance", icon: TrendingUp, roles: ["admin", "manager"] },
    { name: "Reports", href: "/reports", icon: FileText, roles: ["admin", "manager"] },
    { name: "Calendar", href: "/calendar", icon: Calendar, roles: ["admin", "manager", "team"] },
  ];

  const adminNavigation = [
    { name: "Create Team Member", href: "/admin/team/create", icon: UserPlus, roles: ["admin"] },
    { name: "Reset Requests", href: "/admin/password-resets", icon: KeyRound, roles: ["admin"] }
  ];

  const filteredNav = navigation.filter(item => item.roles.includes(role || ""));
  const isAdmin = role === "admin";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-sky-100 select-none">
      {/* Logo Area */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sky-100">
        {/* Close button on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex items-center justify-center p-1.5 rounded-lg hover:bg-sky-50 text-sky-500 border border-sky-100 ml-auto"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Global Search Trigger */}
        <button
          onClick={() => window.dispatchEvent(new Event("open-global-search"))}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 bg-sky-50/40 hover:bg-sky-50 text-sky-500 hover:text-sky-600 border border-sky-100/30 ${
            expanded || mobileOpen ? "justify-start" : "justify-center"
          }`}
          title="Search CRM (Ctrl K)"
        >
          <Search className="w-5 h-5 text-sky-400 flex-shrink-0" />
          {(expanded || mobileOpen) && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="text-xs font-semibold truncate">Search...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] text-sky-400 bg-white border border-sky-100 rounded-md">
                Ctrl K
              </kbd>
            </div>
          )}
        </button>

        <div className="h-2" />

        {filteredNav.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-sky-50 text-sky-600 font-semibold"
                  : "text-sky-500 hover:bg-sky-50/50 hover:text-sky-600"
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-sky-600" : "text-sky-400 group-hover:text-sky-500"}`} />
              {(expanded || mobileOpen) && (
                <span className="text-sm truncate">{item.name}</span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <div className={`h-px bg-sky-100 ${expanded ? "mx-3" : "mx-1"}`} />
              {expanded && (
                <p className="text-[10px] font-bold text-sky-400 px-3 pt-2 uppercase tracking-widest">
                  Admin Control
                </p>
              )}
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-sky-50 text-sky-600 font-semibold"
                      : "text-sky-500 hover:bg-sky-50/50 hover:text-sky-600"
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-sky-600" : "text-sky-400 group-hover:text-sky-500"}`} />
                  {(expanded || mobileOpen) && (
                    <span className="text-sm truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </div>

      {/* User Section / Logout */}
      <div className="p-3 border-t border-sky-100">
        {(expanded || mobileOpen) ? (
          <div className="flex flex-col gap-2 p-2 rounded-2xl bg-sky-50/30 border border-sky-100">
            <div className="flex items-center gap-2.5 px-1">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-sky-500 text-white font-semibold text-sm">
                {currentUser?.email ? currentUser.email[0].toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-sky-600 truncate">
                  {currentUser?.email}
                </p>
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">
                  {role}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-white hover:bg-red-50 text-red-500 hover:text-red-600 border border-sky-100 hover:border-red-100 text-xs font-medium transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-sky-500 text-white font-semibold text-sm">
              {currentUser?.email ? currentUser.email[0].toUpperCase() : "U"}
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center justify-center p-2 rounded-xl bg-white hover:bg-red-50 text-red-500 hover:text-red-600 border border-sky-100 hover:border-red-100 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top-bar toggler */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 px-4 bg-white border-b border-sky-100 flex items-center justify-between z-20">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logonew.png" alt="Monk Media Logo" className="h-12 w-auto object-contain" />
          <span className="font-bold text-lg tracking-wider text-sky-600">
            MONK MEDIA
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new Event("open-global-search"))}
            className="p-2 rounded-lg hover:bg-sky-50 text-sky-500 border border-sky-100 flex items-center justify-center"
            title="Search"
          >
            <Search className="w-5 h-5 text-sky-500" />
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-500 border border-sky-100"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Slide-over Sidebar Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop overlay */}
        <div
          className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
        {/* Drawer container */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-64 bg-white shadow-2xl transition-transform duration-300 transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent />
        </div>
      </div>

      {/* Desktop Sidebar (Fixed) */}
      <div
        className={`hidden lg:block fixed top-0 bottom-0 left-0 z-30 transition-all duration-300 ${
          expanded ? "w-64" : "w-20"
        }`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <SidebarContent />
      </div>
    </>
  );
}
