"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import {
  CheckSquare,
  List,
  FolderKanban,
  Calendar as CalendarIcon,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  X,
  Trash2
} from "lucide-react";

export default function TasksPage() {
  const { currentUser, role } = useAuth();
  
  // Data
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI Views and Filters
  const [viewMode, setViewMode] = useState("kanban"); // 'list', 'kanban', 'calendar'
  const [filterPreset, setFilterPreset] = useState("all"); // 'all', 'my', 'today', 'week', 'overdue'
  const [clientFilter, setClientFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Create Task Form State
  const [createOpen, setCreateOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskClientId, setTaskClientId] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskAssignedId, setTaskAssignedId] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskDue, setTaskDue] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [formError, setFormError] = useState("");

  // Calendar Specific
  const [currentDate, setCurrentDate] = useState(new Date());

  const statuses = ["Not Started", "In Progress", "Waiting", "Completed", "Overdue", "Cancelled"];

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const unsubTasks = onSnapshot(collection(db, "tasks"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setTasks(list);
    });

    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setClients(list);
    });

    const unsubProjects = onSnapshot(collection(db, "projects"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setProjects(list);
    });

    const unsubTeam = onSnapshot(collection(db, "users"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setTeamMembers(list);
    });

    setLoading(false);

    return () => {
      unsubTasks();
      unsubClients();
      unsubProjects();
      unsubTeam();
    };
  }, [currentUser]);

  // Scoped tasks based on Role
  const scopedTasks = tasks.filter((t) => {
    if (role === "admin") return true;
    if (role === "manager") {
      // Manager sees tasks of their clients
      const client = clients.find((c) => c.id === t.clientId);
      return client?.accountManager === currentUser?.uid || t.assignedUserId === currentUser?.uid;
    }
    // Team member sees tasks assigned to them, or tasks of their assigned clients
    const client = clients.find((c) => c.id === t.clientId);
    const assignedClient = client?.assignedTeam?.includes(currentUser?.uid);
    return t.assignedUserId === currentUser?.uid || assignedClient;
  });

  // Apply filters
  const todayStr = new Date().toISOString().split("T")[0];

  const getWeekRange = () => {
    const today = new Date();
    const first = today.getDate() - today.getDay();
    const last = first + 6;
    
    const start = new Date(today.setDate(first)).toISOString().split("T")[0];
    const end = new Date(today.setDate(last)).toISOString().split("T")[0];
    return { start, end };
  };

  const weekRange = getWeekRange();

  const filteredTasks = scopedTasks.filter((t) => {
    // Search query
    const matchSearch =
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Preset filters
    let matchPreset = true;
    if (filterPreset === "my") {
      matchPreset = t.assignedUserId === currentUser?.uid;
    } else if (filterPreset === "today") {
      matchPreset = t.dueDate === todayStr;
    } else if (filterPreset === "week") {
      matchPreset = t.dueDate >= weekRange.start && t.dueDate <= weekRange.end;
    } else if (filterPreset === "overdue") {
      matchPreset = t.dueDate < todayStr && t.status !== "Completed" && t.status !== "Cancelled";
    }

    // Client dropdown
    const matchClient = clientFilter === "All" || t.clientId === clientFilter;

    // Team member dropdown
    const matchTeam = teamFilter === "All" || t.assignedUserId === teamFilter;

    return matchSearch && matchPreset && matchClient && matchTeam;
  });

  const getClientName = (clientId) => {
    const cl = clients.find((c) => c.id === clientId);
    return cl ? cl.businessName : "General";
  };

  const getUserName = (userId) => {
    const u = teamMembers.find((member) => member.id === userId);
    return u ? u.name : "Unassigned";
  };

  const handleUpdateStatus = async (taskId, nextStatus) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), { status: nextStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComplete = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === "Completed" ? "In Progress" : "Completed";
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: nextStatus,
        completionDate: nextStatus === "Completed" ? new Date().toISOString().split("T")[0] : ""
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      alert("Task deleted successfully!");
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task: " + err.message);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!taskName) {
      setFormError("Task Name is required.");
      return;
    }

    try {
      const payload = {
        name: taskName,
        clientId: taskClientId || "",
        projectId: taskProjectId || "",
        assignedUserId: taskAssignedId || "",
        priority: taskPriority,
        startDate: new Date().toISOString().split("T")[0],
        dueDate: taskDue || "",
        status: "Not Started",
        description: taskDesc,
        checklist: [],
        attachmentUrl: "",
        driveLink: "",
        recurring: false,
        reminder: false,
        completionDate: "",
      };

      await addDoc(collection(db, "tasks"), payload);
      
      // Reset Form
      setTaskName("");
      setTaskClientId("");
      setTaskProjectId("");
      setTaskAssignedId("");
      setTaskPriority("Medium");
      setTaskDue("");
      setTaskDesc("");
      setCreateOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Calendar View Generator logic
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDay, totalDays };
  };

  const { firstDay, totalDays } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const calendarDays = [];
  // Fill leading empty days
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  // Fill calendar actual days
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "bg-red-600 text-white border-red-700";
      case "Medium":
        return "bg-sky-500 text-white border-sky-600";
      default:
        return "bg-slate-400 text-white border-slate-500";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500 text-white border-emerald-600";
      case "In Progress":
        return "bg-sky-500 text-white border-sky-600";
      case "Waiting":
        return "bg-amber-500 text-white border-amber-600";
      case "Not Started":
        return "bg-slate-400 text-white border-slate-500";
      case "Cancelled":
        return "bg-red-400 text-white border-red-500";
      default:
        return "bg-sky-50 text-sky-600 border-sky-200";
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title Grid */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-sky-600">Tasks</h1>
            <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
              Production Checklists & Design Deadlines
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View selectors */}
            <div className="flex bg-sky-50 p-1 rounded-2xl border border-sky-100 text-sky-400">
              <button
                onClick={() => setViewMode("kanban")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "kanban" ? "bg-white text-sky-600 shadow" : "hover:text-sky-500"
                }`}
              >
                <FolderKanban className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "list" ? "bg-white text-sky-600 shadow" : "hover:text-sky-500"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "calendar" ? "bg-white text-sky-600 shadow" : "hover:text-sky-500"
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>

            {(role === "admin" || role === "manager") && (
              <button
                onClick={() => setCreateOpen(true)}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            )}
          </div>
        </div>

        {/* Search, Preset filters, Dropdowns */}
        <div className="space-y-3">
          
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
            {[
              { id: "all", label: "All Tasks" },
              { id: "my", label: "My Tasks" },
              { id: "today", label: "Due Today" },
              { id: "week", label: "This Week" },
              { id: "overdue", label: "Overdue" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setFilterPreset(p.id)}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  filterPreset === p.id
                    ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                    : "bg-white text-sky-500 border-sky-100 hover:bg-sky-50/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search bar + filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all"
              />
            </div>
            
            {/* Client Filter */}
            <div className="relative min-w-[150px]">
              <Filter className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100 rounded-2xl text-sm text-sky-600 appearance-none focus:outline-none"
              >
                <option value="All">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Member Filter */}
            <div className="relative min-w-[150px]">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100 rounded-2xl text-sm text-sky-600 appearance-none focus:outline-none"
              >
                <option value="All">All Staff</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* LOADING SCREEN */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20 border border-sky-100 rounded-3xl bg-sky-50/5">
            <CheckSquare className="w-12 h-12 mx-auto text-sky-200 mb-2" />
            <h3 className="text-sm font-bold text-sky-600">No Tasks Found</h3>
            <p className="text-xs text-sky-400 mt-1">
              Add a new task or review current filter query settings.
            </p>
          </div>
        ) : viewMode === "list" ? (
          
          /* VIEW 1: LIST TABLE */
          <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-sky-50/30 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                    <th className="p-4 px-6 w-10"></th>
                    <th className="p-4 px-6">Task Name</th>
                    <th className="p-4 px-6">Client</th>
                    <th className="p-4 px-6">Assigned To</th>
                    <th className="p-4 px-6">Priority</th>
                    <th className="p-4 px-6">Due Date</th>
                    <th className="p-4 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                  {filteredTasks.map((t) => {
                    const isCompleted = t.status === "Completed";
                    return (
                      <tr key={t.id} className={`hover:bg-sky-50/5 ${isCompleted ? "opacity-60" : ""}`}>
                        <td className="p-4.5 px-6">
                          <button
                            onClick={() => handleToggleComplete(t.id, t.status)}
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                              isCompleted
                                ? "bg-sky-500 border-sky-500 text-white"
                                : "border-sky-200 bg-white"
                            }`}
                          >
                            {isCompleted && <X className="w-3.5 h-3.5 transform rotate-45" />}
                          </button>
                        </td>
                        <td className={`p-4.5 px-6 font-bold ${isCompleted ? "line-through" : ""}`}>
                          {t.name}
                        </td>
                        <td className="p-4.5 px-6">{getClientName(t.clientId)}</td>
                        <td className="p-4.5 px-6">{getUserName(t.assignedUserId)}</td>
                        <td className="p-4.5 px-6">
                          <select
                            value={t.priority}
                            onChange={async (e) => {
                              try {
                                await updateDoc(doc(db, "tasks", t.id), { priority: e.target.value });
                              } catch (err) {
                                alert("Error updating priority: " + err.message);
                              }
                            }}
                            className={`px-2 py-0.5 border rounded-full text-[10px] font-bold cursor-pointer outline-none shadow-sm text-center ${getPriorityColor(t.priority)}`}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </td>
                        <td className={`p-4.5 px-6 ${t.dueDate < todayStr && !isCompleted ? "text-red-500 font-bold" : ""}`}>
                          {t.dueDate || "No date"}
                        </td>
                        <td className="p-4.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={t.status}
                              onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                              className={`p-1.5 border rounded-xl outline-none text-[10px] font-bold shadow-sm text-center ${getStatusColor(t.status)}`}
                            >
                              {statuses.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            {role === "admin" && (
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === "kanban" ? (
          
          /* VIEW 2: KANBAN BOARD */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start">
            {statuses.map((st) => {
              const columnTasks = filteredTasks.filter((t) => t.status === st);
              return (
                <div key={st} className="bg-sky-50/20 border border-sky-100 rounded-3xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">{st}</span>
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-0.5">
                    {columnTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 bg-white border border-sky-100 hover:border-sky-300 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-sky-600 leading-snug">{t.name}</h4>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${getPriorityColor(t.priority)}`}>
                              {t.priority}
                            </span>
                            {role === "admin" && (
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                className="text-red-400 hover:text-red-500 transition"
                                title="Delete Task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[9px] text-sky-400 font-bold uppercase">{getClientName(t.clientId)}</p>
                        
                        <div className="pt-2 border-t border-sky-50 flex items-center justify-between">
                          <span className="text-[9px] text-sky-400 font-bold">{getUserName(t.assignedUserId)}</span>
                          <select
                            value={t.status}
                            onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                            className="p-0.5 border border-sky-100 rounded text-[8px] font-bold text-sky-600 bg-white focus:outline-none"
                          >
                            {statuses.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-sky-300 text-[10px] italic border border-dashed border-sky-100 rounded-2xl bg-white/50">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          
          /* VIEW 3: MONTHLY CALENDAR VIEW */
          <div className="bg-white border border-sky-100 rounded-3xl shadow-xl p-4 sm:p-6 space-y-4">
            {/* Month Header Controller */}
            <div className="flex items-center justify-between pb-4 border-b border-sky-50">
              <h3 className="text-base font-bold text-sky-600">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg border border-sky-100 hover:bg-sky-50 text-sky-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg border border-sky-100 hover:bg-sky-50 text-sky-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 gap-2.5 text-center text-[10px] font-bold text-sky-500 uppercase tracking-widest pb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={idx} className="bg-sky-50/10 rounded-2xl min-h-[70px]"></div>;

                const dayStr = day.toISOString().split("T")[0];
                const dayTasks = filteredTasks.filter((t) => t.dueDate === dayStr);

                return (
                  <div
                    key={idx}
                    className="p-2 border border-sky-50 rounded-2xl min-h-[80px] bg-white text-left flex flex-col justify-between hover:border-sky-300 transition-colors"
                  >
                    <span className="text-[10px] font-bold text-sky-600">{day.getDate()}</span>
                    
                    {/* Tasks listing dots or badges */}
                    <div className="space-y-1 overflow-y-auto max-h-[50px] mt-1 pr-0.5">
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="px-1.5 py-0.5 bg-sky-50 border border-sky-100 text-sky-600 text-[8px] font-bold rounded truncate"
                          title={t.name}
                        >
                          {t.name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Drawer Form (Create Task) */}
        {createOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                  <div>
                    <h2 className="text-xl font-bold text-sky-600">Add New Task</h2>
                    <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Assign production milestones</p>
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

                <form onSubmit={handleCreateTask} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Task Name
                    </label>
                    <input
                      type="text"
                      required
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      placeholder="e.g. Rough Cut Video Assembly"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Scoped Client
                    </label>
                    <select
                      value={taskClientId}
                      onChange={(e) => setTaskClientId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 rounded-2xl text-sm text-sky-600 outline-none"
                    >
                      <option value="">No Client (Internal)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Link Project
                    </label>
                    <select
                      value={taskProjectId}
                      onChange={(e) => setTaskProjectId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 rounded-2xl text-sm text-sky-600 outline-none"
                    >
                      <option value="">No Project</option>
                      {projects
                        .filter((p) => !taskClientId || p.clientId === taskClientId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Assign Staff Member
                    </label>
                    <select
                      value={taskAssignedId}
                      onChange={(e) => setTaskAssignedId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 rounded-2xl text-sm text-sky-600 outline-none"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                        Priority
                      </label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={taskDue}
                        onChange={(e) => setTaskDue(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Task Description
                    </label>
                    <textarea
                      rows={4}
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      placeholder="Detail guidelines, files, or deliverables needed..."
                      className="w-full p-3 border border-sky-100 rounded-2xl text-xs text-sky-600 outline-none"
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
                      Create Task
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
