"use client";

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import GlobalSearch from "@/components/GlobalSearch";
import GlobalReminders from "@/components/GlobalReminders";
import GlobalPayments from "@/components/GlobalPayments";
import { RefreshCw, DollarSign, Bell } from "lucide-react";

function RouteGuard({ children }) {
  const { currentUser, role, clientId, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const isAuthPath = pathname === "/" || pathname?.startsWith("/login") || pathname?.startsWith("/setup");
    
    if (!currentUser && !isAuthPath) {
      router.push("/");
      return;
    }

    if (currentUser && role === "client") {
      if (pathname !== "/clients/profile") {
        if (clientId) {
          router.push(`/clients/profile?id=${clientId}`);
        } else {
          console.error("Missing clientId for client role user");
        }
      }
    }
  }, [currentUser, role, clientId, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return children;
}

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarExpanded(false);
      } else {
        setSidebarExpanded(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Splash screen 0.5 seconds duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Intercept window.alert calls to trigger premium Toast notification
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      if (!message) return;
      const lower = String(message).toLowerCase();
      const isError =
        lower.includes("failed") ||
        lower.includes("error") ||
        lower.includes("invalid") ||
        lower.includes("cannot") ||
        lower.includes("restrict") ||
        lower.includes("failed to") ||
        lower.includes("not found");
      
      const id = Date.now() + Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, message, type: isError ? "error" : "success" }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/setup") || pathname === "/";

  return (
    <AuthProvider>
      {/* Splash screen cover layout */}
      {showSplash && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-cover bg-center transition-all duration-500 animate-fade-in"
          style={{ backgroundImage: "url('/trade.jpg')" }}
        >
          {/* Overlay to ensure readability and contrast */}
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs"></div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes loader-progress {
              0% { width: 0%; }
              100% { width: 100%; }
            }
            .animate-loader {
              animation: loader-progress 0.5s linear forwards;
            }
            @keyframes fade-in {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in {
              animation: fade-in 0.8s ease-out forwards;
            }
            @keyframes logo-pulse-rotate {
              0%, 100% { transform: scale(1.25) rotate(0deg); }
              50% { transform: scale(1.32) rotate(2deg); }
            }
            .animate-logo-new {
              animation: logo-pulse-rotate 3s ease-in-out infinite;
            }
          `}} />
          
          <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center animate-fade-in">
            {/* Logo with pulse & rotate float animation */}
            <div className="mb-10 transform transition duration-300 animate-logo-new">
              <img src="/logonew.png" alt="Monk Media Logo" className="w-80 h-auto object-contain" />
            </div>

            {/* Spinner and loader combination */}
            <div className="flex flex-col items-center gap-5 w-full">
              {/* Spinner */}
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-sky-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-sky-500 animate-spin"></div>
              </div>

              {/* Progress bar loader */}
              <div className="w-56 h-1.5 bg-sky-50 rounded-full overflow-hidden border border-sky-100/50">
                <div className="h-full bg-gradient-to-r from-sky-400 to-[#348eab] rounded-full animate-loader"></div>
              </div>
              
              <span className="text-[10px] uppercase tracking-widest font-black text-sky-400 mt-2 animate-pulse">
                Loading Monk Media Workspace...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main layout container, hidden smoothly while splash screen is active */}
      <div 
        className={`flex min-h-screen bg-white transition-opacity duration-500 ${
          showSplash ? "opacity-0 overflow-hidden h-screen pointer-events-none" : "opacity-100"
        }`}
      >
        {mounted && !isAuthPage && (
          <Sidebar
            expanded={sidebarExpanded}
            setExpanded={setSidebarExpanded}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
          />
        )}
        <main
          className={`flex-1 flex flex-col min-w-0 bg-white transition-all duration-300 ${
            isAuthPage ? "" : `pt-16 lg:pt-0 ${sidebarExpanded ? "lg:pl-64" : "lg:pl-20"}`
          }`}
        >
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>
      {mounted && !isAuthPage && <GlobalSearch />}
      {mounted && !isAuthPage && <GlobalReminders />}
      {mounted && !isAuthPage && <GlobalPayments />}

      {mounted && !isAuthPage && (
        <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-center gap-3">
          {/* Expanded Speed Dial Menu */}
          <div className={`flex flex-col items-center gap-3 transition-all duration-300 transform origin-bottom ${
            quickActionsOpen ? "scale-100 opacity-100 translate-y-0" : "scale-75 opacity-0 translate-y-10 pointer-events-none"
          }`}>
            {/* Action: Quick Reminders */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("toggle-global-reminders"));
                setQuickActionsOpen(false);
              }}
              className="p-3 bg-gradient-to-r from-sky-400 to-[#348eab] text-white rounded-full shadow-lg hover:scale-110 transition-all duration-200 group relative"
              title="Quick Reminders"
            >
              <Bell className="w-5 h-5 group-hover:animate-bounce" />
              <span className="absolute right-14 top-2.5 px-2 py-1 bg-sky-950 text-white text-[9px] font-bold rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Quick Reminders
              </span>
            </button>

            {/* Action: Quick Record Payment */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("toggle-global-payments"));
                setQuickActionsOpen(false);
              }}
              className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full shadow-lg hover:scale-110 transition-all duration-200 group relative"
              title="Quick Record Payment"
            >
              <DollarSign className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="absolute right-14 top-2.5 px-2 py-1 bg-sky-950 text-white text-[9px] font-bold rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Record Payment
              </span>
            </button>
          </div>

          {/* Main Quick Action Circular Button */}
          <button
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className="p-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 rounded-full border border-sky-500/20 shadow-sm hover:scale-105 transition-all duration-300 flex items-center justify-center"
            title="Quick Actions"
          >
            <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${quickActionsOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      {/* Global Toast Container */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 text-white pointer-events-auto transition-all duration-300 animate-slide-in-right ${
              t.type === "success"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-400"
                : "bg-gradient-to-r from-rose-500 to-red-600 border-rose-400"
            }`}
          >
            <div className="flex items-center gap-3">
              {t.type === "success" ? (
                <svg className="w-5 h-5 text-emerald-100 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-rose-100 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-xs font-bold leading-normal">{t.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="p-1 hover:bg-white/10 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </AuthProvider>
  );
}
