"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { Search, FileText, User, FolderKanban, CheckSquare, Users, FileMinus, X, BarChart3 } from "lucide-react";

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState({
    clients: [],
    projects: [],
    tasks: [],
    leads: [],
    team: [],
    invoices: []
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { role } = useAuth();
  const inputRef = useRef(null);

  // Toggle modal on cmd+k / ctrl+k or custom trigger
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    const handleOpenSearch = () => {
      setIsOpen(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-global-search", handleOpenSearch);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-global-search", handleOpenSearch);
    };
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const collectionsToFetch = [
        { name: "clients", ref: "clients" },
        { name: "projects", ref: "projects" },
        { name: "tasks", ref: "tasks" },
        { name: "leads", ref: "leads", roles: ["admin", "manager"] },
        { name: "team", ref: "users" },
        { name: "invoices", ref: "invoices", roles: ["admin", "manager"] }
      ];

      const loadedData = {};

      await Promise.all(
        collectionsToFetch.map(async (col) => {
          if (col.roles && !col.roles.includes(role)) {
            loadedData[col.name] = [];
            return;
          }
          const q = query(collection(db, col.ref), limit(50));
          const snapshot = await getDocs(q);
          const list = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          loadedData[col.name] = list;
        })
      );

      setRawData(loadedData);
    } catch (error) {
      console.error("Error loading search indices:", error);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      fetchAllData();
    } else {
      setSearchQuery("");
      setResults({
        clients: [],
        projects: [],
        tasks: [],
        leads: [],
        team: [],
        invoices: []
      });
    }
  }, [isOpen, fetchAllData]);

  const [rawData, setRawData] = useState({
    clients: [],
    projects: [],
    tasks: [],
    leads: [],
    team: [],
    invoices: []
  });

  // Client-side search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({
        clients: [],
        projects: [],
        tasks: [],
        leads: [],
        team: [],
        invoices: []
      });
      return;
    }

    const queryLower = searchQuery.toLowerCase();
    
    const filtered = {
      clients: rawData.clients.filter(
        (c) =>
          c.businessName?.toLowerCase().includes(queryLower) ||
          c.contactPerson?.toLowerCase().includes(queryLower) ||
          c.email?.toLowerCase().includes(queryLower)
      ),
      projects: rawData.projects.filter(
        (p) =>
          p.name?.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower)
      ),
      tasks: rawData.tasks.filter(
        (t) =>
          t.name?.toLowerCase().includes(queryLower) ||
          t.description?.toLowerCase().includes(queryLower)
      ),
      leads: rawData.leads.filter(
        (l) =>
          l.name?.toLowerCase().includes(queryLower) ||
          l.business?.toLowerCase().includes(queryLower)
      ),
      team: rawData.team.filter(
        (u) =>
          u.name?.toLowerCase().includes(queryLower) ||
          u.email?.toLowerCase().includes(queryLower)
      ),
      invoices: rawData.invoices.filter(
        (i) =>
          i.invoiceNumber?.toLowerCase().includes(queryLower) ||
          i.notes?.toLowerCase().includes(queryLower)
      )
    };

    setResults(filtered);
  }, [searchQuery, rawData]);

  const handleNavigate = (path) => {
    setIsOpen(false);
    router.push(path);
  };

  const hasResults = Object.values(results).some((arr) => arr.length > 0);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-sky-950/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-sky-100 shadow-2xl flex flex-col max-h-[70vh] overflow-hidden transition-all duration-300 transform scale-100">
        
        {/* Search Input Area */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-sky-100 bg-white">
          <Search className="w-5 h-5 text-sky-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search clients, leads, tasks, projects, team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sky-600 placeholder-sky-400 font-medium border-0 focus:outline-none focus:ring-0 text-sm"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg hover:bg-sky-50 text-sky-400 hover:text-sky-500 border border-sky-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && !searchQuery && (
            <div className="flex flex-col items-center justify-center py-12 text-sky-400 gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
              <p className="text-xs font-semibold">Indexing records...</p>
            </div>
          )}

          {!searchQuery && !loading && (
            <div className="text-center py-12 text-sky-400">
              <Search className="w-12 h-12 mx-auto mb-2 text-sky-200" />
              <p className="text-sm font-semibold">Type to search across the CRM</p>
              <p className="text-xs">Access leads, client files, invoices, tasks, or team files instantly.</p>
            </div>
          )}

          {searchQuery && !hasResults && (
            <div className="text-center py-12 text-sky-400">
              <FileMinus className="w-12 h-12 mx-auto mb-2 text-sky-200" />
              <p className="text-sm font-semibold">No results found for &quot;{searchQuery}&quot;</p>
              <p className="text-xs">Try double checking the spelling or query parameters.</p>
            </div>
          )}

          {searchQuery && hasResults && (
            <div className="space-y-4">
              {/* Clients */}
              {results.clients.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest px-2 mb-1.5">
                    Clients
                  </h3>
                  <div className="space-y-1">
                    {results.clients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleNavigate(`/clients/${c.id}`)}
                        className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-sky-50 text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-sky-400" />
                          <span className="text-sm font-medium">{c.businessName}</span>
                        </div>
                        <span className="text-xs text-sky-400">{c.contactPerson}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {results.projects.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest px-2 mb-1.5">
                    Projects
                  </h3>
                  <div className="space-y-1">
                    {results.projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleNavigate(`/projects`)}
                        className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-sky-50 text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderKanban className="w-4 h-4 text-sky-400" />
                          <span className="text-sm font-medium">{p.name}</span>
                        </div>
                        <span className="text-xs text-sky-400 capitalize">{p.status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest px-2 mb-1.5">
                    Tasks
                  </h3>
                  <div className="space-y-1">
                    {results.tasks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleNavigate(`/tasks`)}
                        className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-sky-50 text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckSquare className="w-4 h-4 text-sky-400" />
                          <span className="text-sm font-medium">{t.name}</span>
                        </div>
                        <span className="text-xs text-sky-400 capitalize">{t.status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads */}
              {results.leads.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest px-2 mb-1.5">
                    Leads
                  </h3>
                  <div className="space-y-1">
                    {results.leads.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => handleNavigate(`/leads`)}
                        className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-sky-50 text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <BarChart3 className="w-4 h-4 text-sky-400" />
                          <span className="text-sm font-medium">{l.name} - {l.business}</span>
                        </div>
                        <span className="text-xs text-sky-400 capitalize">{l.status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members */}
              {results.team.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest px-2 mb-1.5">
                    Team Members
                  </h3>
                  <div className="space-y-1">
                    {results.team.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleNavigate(`/team`)}
                        className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-sky-50 text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-sky-400" />
                          <span className="text-sm font-medium">{u.name}</span>
                        </div>
                        <span className="text-xs text-sky-400">{u.email}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest px-2 mb-1.5">
                    Invoices
                  </h3>
                  <div className="space-y-1">
                    {results.invoices.map((i) => (
                      <button
                        key={i.id}
                        onClick={() => handleNavigate(`/finance`)}
                        className="w-full flex items-center justify-between text-left p-2.5 rounded-xl hover:bg-sky-50 text-sky-600 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-sky-400" />
                          <span className="text-sm font-medium">Inv #{i.invoiceNumber}</span>
                        </div>
                        <span className="text-xs text-sky-400">${i.total} ({i.status})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-sky-50/50 border-t border-sky-100 flex items-center justify-between text-[10px] text-sky-400 font-semibold select-none">
          <span>Search index matches current cached dataset</span>
          <span className="flex items-center gap-1">
            Press <kbd className="px-1 border border-sky-200 rounded">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
