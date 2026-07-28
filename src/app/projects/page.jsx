"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, getDocs, deleteDoc } from "firebase/firestore";
import { FolderKanban, List, Search, Plus, Filter, ArrowRight, X, Trash2 } from "lucide-react";

export default function ProjectsPage() {
  const { currentUser, role } = useAuth();
  
  // Data
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [viewMode, setViewMode] = useState("kanban"); // 'list' or 'kanban'
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // Create Project Form
  const [createOpen, setCreateOpen] = useState(false);
  const [projName, setProjName] = useState("");
  const [projClientId, setProjClientId] = useState("");
  const [projType, setProjType] = useState("Social Media");
  const [projVal, setProjVal] = useState("");
  const [projDeadline, setProjDeadline] = useState("");
  const [projManager, setProjManager] = useState("");
  const [projDescription, setProjDescription] = useState("");
  const [formError, setFormError] = useState("");

  const stages = ["Planned", "Awaiting Deposit", "In Progress", "Completed", "On Hold", "Cancelled"];

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);

    // 1. Listen for projects
    const unsubProjects = onSnapshot(collection(db, "projects"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setProjects(list);
    });

    // 2. Fetch clients (for names and forms)
    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setClients(list);
    });

    // 3. Fetch team members (for managers and tasks)
    const unsubTeam = onSnapshot(collection(db, "users"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setTeamMembers(list);
    });

    setLoading(false);

    return () => {
      unsubProjects();
      unsubClients();
      unsubTeam();
    };
  }, [currentUser]);

  // Scopes projects
  const scopedProjects = projects.filter((p) => {
    // Admin sees all
    if (role === "admin") return true;

    // Manager sees projects where they are PM OR client accountManager is them
    if (role === "manager") {
      const parentClient = clients.find((c) => c.id === p.clientId);
      return p.projectManager === currentUser?.uid || parentClient?.accountManager === currentUser?.uid;
    }

    // Team sees projects where they are in assignedTeam list
    return p.assignedTeam?.includes(currentUser?.uid);
  });

  // Filtered dataset
  const filteredProjects = scopedProjects.filter((p) => {
    const matchSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === "All" || p.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const getClientName = (clientId) => {
    const cl = clients.find((c) => c.id === clientId);
    return cl ? cl.businessName : "Unknown Client";
  };

  const handleUpdateStatus = async (projectId, nextStatus) => {
    try {
      const projRef = doc(db, "projects", projectId);
      await updateDoc(projRef, { status: nextStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500 text-white border-emerald-600";
      case "In Progress":
        return "bg-sky-500 text-white border-sky-600";
      case "On Hold":
        return "bg-rose-400 text-white border-rose-500";
      case "Cancelled":
        return "bg-red-600 text-white border-red-700";
      case "Awaiting Deposit":
        return "bg-amber-500 text-white border-amber-600";
      case "Planned":
        return "bg-slate-400 text-white border-slate-500";
      default:
        return "bg-sky-50 text-sky-600 border-sky-200";
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "projects", projectId));
      alert("Project deleted successfully!");
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project: " + err.message);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!projName || !projClientId) {
      setFormError("Project Name and Client select are required.");
      return;
    }

    try {
      const payload = {
        name: projName,
        clientId: projClientId,
        type: projType,
        description: projDescription,
        startDate: new Date().toISOString().split("T")[0],
        deadline: projDeadline || "",
        completionDate: "",
        value: Number(projVal) || 0,
        estimatedCost: 0,
        actualCost: 0,
        profit: 0,
        projectManager: projManager || currentUser?.uid,
        assignedTeam: [],
        status: "Planned",
        priority: "Medium",
        progressPercent: 0,
        driveFolder: "",
        notes: "",
      };

      await addDoc(collection(db, "projects"), payload);
      
      // Reset Form
      setProjName("");
      setProjClientId("");
      setProjType("Social Media");
      setProjVal("");
      setProjDeadline("");
      setProjManager("");
      setProjDescription("");
      setCreateOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-sky-600">Projects</h1>
            <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
              Active Marketing & Video Production Campaigns
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View togglers */}
            <div className="flex bg-sky-50 p-1 rounded-2xl border border-sky-100">
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "kanban" ? "bg-white text-sky-600 shadow" : "text-sky-400 hover:text-sky-500"
                }`}
                title="Kanban Board"
              >
                <FolderKanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "list" ? "bg-white text-sky-600 shadow" : "text-sky-400 hover:text-sky-500"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {(role === "admin" || role === "manager") && (
              <button
                onClick={() => setCreateOpen(true)}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            )}
          </div>
        </div>

        {/* Filters and search query */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
            <input
              type="text"
              placeholder="Search project campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none placeholder-sky-300 transition-all"
            />
          </div>
          <div className="relative min-w-[160px]">
            <Filter className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100 rounded-2xl text-sm text-sky-600 appearance-none"
            >
              <option value="All">All Stages</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* LOADING CHECK */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 border border-sky-100 rounded-3xl bg-sky-50/5">
            <FolderKanban className="w-12 h-12 mx-auto text-sky-200 mb-2" />
            <h3 className="text-sm font-bold text-sky-600">No Projects Found</h3>
            <p className="text-xs text-sky-400 mt-1">
              Add a project or modify your query filters.
            </p>
          </div>
        ) : viewMode === "list" ? (
          
          /* VIEW 1: TABLE LIST VIEW */
          <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-sky-50/30 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                    <th className="p-4 px-6">Project Name</th>
                    <th className="p-4 px-6">Client Name</th>
                    <th className="p-4 px-6">Type</th>
                    <th className="p-4 px-6">Deadline</th>
                    <th className="p-4 px-6">Value</th>
                    <th className="p-4 px-6">Progress</th>
                    <th className="p-4 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-sky-50/10">
                      <td className="p-4.5 px-6 font-bold">{p.name}</td>
                      <td className="p-4.5 px-6">{getClientName(p.clientId)}</td>
                      <td className="p-4.5 px-6">{p.type}</td>
                      <td className="p-4.5 px-6">{p.deadline || "None"}</td>
                      <td className="p-4.5 px-6">${Number(p.value).toLocaleString()}</td>
                      <td className="p-4.5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-sky-50 rounded-full h-1.5">
                            <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${p.progressPercent || 0}%` }}></div>
                          </div>
                          <span>{p.progressPercent || 0}%</span>
                        </div>
                      </td>
                      <td className="p-4.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={p.status}
                            onChange={(e) => handleUpdateStatus(p.id, e.target.value)}
                            className={`p-1.5 border rounded-xl outline-none text-[10px] font-bold shadow-sm text-center ${getStatusColor(p.status)}`}
                          >
                            {stages.map((stg) => (
                              <option key={stg} value={stg}>
                                {stg}
                              </option>
                            ))}
                          </select>
                          {role === "admin" && (
                            <button
                              onClick={() => handleDeleteProject(p.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          
          /* VIEW 2: KANBAN BOARD VIEW */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start">
            {stages.map((stage) => {
              const stageProjects = filteredProjects.filter((p) => p.status === stage);
              return (
                <div key={stage} className="bg-sky-50/20 border border-sky-100 rounded-3xl p-3.5 space-y-3.5">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">{stage}</span>
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                      {stageProjects.length}
                    </span>
                  </div>

                  {/* Cards Pool */}
                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-0.5">
                    {stageProjects.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 bg-white border border-sky-100 hover:border-sky-300 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-2.5"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-sky-600 leading-snug">{p.name}</h4>
                          {role === "admin" && (
                            <button
                              onClick={() => handleDeleteProject(p.id)}
                              className="text-red-400 hover:text-red-500 transition"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-sky-400 font-bold uppercase">{getClientName(p.clientId)}</p>
                        
                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-bold text-sky-400">
                            <span>Progress</span>
                            <span>{p.progressPercent || 0}%</span>
                          </div>
                          <div className="w-full bg-sky-50 rounded-full h-1">
                            <div className="bg-sky-500 h-1 rounded-full" style={{ width: `${p.progressPercent || 0}%` }}></div>
                          </div>
                        </div>

                        {/* Footer details */}
                        <div className="pt-2 border-t border-sky-50 flex items-center justify-between">
                          <span className="text-[9px] text-sky-400 font-medium">Due: {p.deadline || "None"}</span>
                          <select
                            value={p.status}
                            onChange={(e) => handleUpdateStatus(p.id, e.target.value)}
                            className="p-1 border border-sky-100 rounded-lg text-sky-600 text-[8px] font-bold bg-white"
                          >
                            {stages.map((stg) => (
                              <option key={stg} value={stg}>
                                {stg}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    {stageProjects.length === 0 && (
                      <div className="text-center py-8 text-sky-300 text-[10px] font-medium italic border border-dashed border-sky-100 rounded-2xl bg-white/50">
                        Empty column
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Drawers / Modals (Create Project Drawer) */}
        {createOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                  <div>
                    <h2 className="text-xl font-bold text-sky-600">Register New Project</h2>
                    <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Start a campaign</p>
                  </div>
                  <button onClick={() => setCreateOpen(false)} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formError && (
                  <div className="my-4 p-3 bg-red-50/50 border border-red-100 text-red-500 rounded-2xl text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleCreateProject} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      value={projName}
                      onChange={(e) => setProjName(e.target.value)}
                      placeholder="e.g. Winter Social Launch"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Assign Client
                    </label>
                    <select
                      value={projClientId}
                      required
                      onChange={(e) => setProjClientId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none"
                    >
                      <option value="">Select a Client...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Project Type
                    </label>
                    <select
                      value={projType}
                      onChange={(e) => setProjType(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none"
                    >
                      <option value="Social Media">Social Media</option>
                      <option value="Video Shoot">Video Production</option>
                      <option value="Web Development">Web Development</option>
                      <option value="Ad Campaign">Ad Campaign</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                        Campaign Value ($)
                      </label>
                      <input
                        type="number"
                        value={projVal}
                        onChange={(e) => setProjVal(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={projDeadline}
                        onChange={(e) => setProjDeadline(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Project Manager
                    </label>
                    <select
                      value={projManager}
                      onChange={(e) => setProjManager(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none"
                    >
                      <option value="">Assign to yourself</option>
                      {teamMembers
                        .filter((u) => u.role === "manager" || u.role === "admin")
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Campaign Description
                    </label>
                    <textarea
                      rows={4}
                      value={projDescription}
                      onChange={(e) => setProjDescription(e.target.value)}
                      placeholder="Enter brief description, deliverables guidelines..."
                      className="w-full p-3 border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-xs text-sky-600 outline-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-sky-50 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateOpen(false)}
                      className="px-4 py-2 border border-sky-100 text-sky-500 rounded-2xl text-xs font-bold hover:bg-sky-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold shadow hover:shadow-lg"
                    >
                      Create Project
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
