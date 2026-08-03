"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";
import {
  Users,
  FolderKanban,
  CheckSquare,
  DollarSign,
  TrendingDown,
  Activity,
  AlertTriangle,
  Flame,
  Camera,
  Layers,
  FileCheck,
  PhoneCall,
  CalendarCheck,
  FileText
} from "lucide-react";
import Loader from "@/components/Loader";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from "recharts";

const Custom3DBar = (props) => {
  const { x, y, width, height, fill } = props;
  if (height === undefined || height === null || isNaN(height) || height === 0) return null;

  const depth = 6;

  // Paths for 3D faces
  const frontFace = `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
  const topFace = `M ${x} ${y} l ${depth} ${-depth} h ${width} l ${-depth} ${depth} Z`;
  const rightFace = `M ${x + width} ${y} l ${depth} ${-depth} v ${height} l ${-depth} ${depth} Z`;

  return (
    <g>
      {/* Top face - lighter shading */}
      <path d={topFace} fill="#7dd3fc" opacity={0.9} stroke="none" />
      {/* Right face - darker shading */}
      <path d={rightFace} fill="#0284c7" opacity={0.9} stroke="none" />
      {/* Front face - main theme fill */}
      <path d={frontFace} fill={fill} opacity={0.95} stroke="none" />
    </g>
  );
};

export default function Dashboard() {
  const { currentUser, role, loading: authLoading } = useAuth();
  const router = useRouter();

  // Real-time collections
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login/team");
    }
  }, [currentUser, authLoading, router]);

  // Firestore real-time observers
  useEffect(() => {
    if (!currentUser || authLoading || !role) return;

    setLoading(true);

    let loadedClients = false;
    let loadedProjects = false;
    let loadedTasks = false;
    let loadedLeads = role !== "admin" && role !== "manager";
    let loadedInvoices = role !== "admin" && role !== "manager";
    let loadedExpenses = role !== "admin" && role !== "manager";
    let loadedUsers = false;

    const checkAllLoaded = () => {
      if (loadedClients && loadedProjects && loadedTasks && loadedLeads && loadedInvoices && loadedExpenses && loadedUsers) {
        setLoading(false);
      }
    };

    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setClients(list);
      loadedClients = true;
      checkAllLoaded();
    }, (err) => {
      console.error("Clients sync error:", err);
      loadedClients = true;
      checkAllLoaded();
    });

    const unsubProjects = onSnapshot(collection(db, "projects"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setProjects(list);
      loadedProjects = true;
      checkAllLoaded();
    }, (err) => {
      console.error("Projects sync error:", err);
      loadedProjects = true;
      checkAllLoaded();
    });

    const unsubTasks = onSnapshot(collection(db, "tasks"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setTasks(list);
      loadedTasks = true;
      checkAllLoaded();
    }, (err) => {
      console.error("Tasks sync error:", err);
      loadedTasks = true;
      checkAllLoaded();
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setUsers(list);
      loadedUsers = true;
      checkAllLoaded();
    }, (err) => {
      console.error("Users sync error:", err);
      loadedUsers = true;
      checkAllLoaded();
    });

    let unsubLeads = () => {};
    let unsubInvoices = () => {};
    let unsubExpenses = () => {};

    if (role === "admin" || role === "manager") {
      unsubLeads = onSnapshot(collection(db, "leads"), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setLeads(list);
        loadedLeads = true;
        checkAllLoaded();
      }, (err) => {
        console.error("Leads sync error:", err);
        loadedLeads = true;
        checkAllLoaded();
      });

      unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setInvoices(list);
        loadedInvoices = true;
        checkAllLoaded();
      }, (err) => {
        console.error("Invoices sync error:", err);
        loadedInvoices = true;
        checkAllLoaded();
      });

      unsubExpenses = onSnapshot(collection(db, "expenses"), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setExpenses(list);
        loadedExpenses = true;
        checkAllLoaded();
      }, (err) => {
        console.error("Expenses sync error:", err);
        loadedExpenses = true;
        checkAllLoaded();
      });
    }

    return () => {
      unsubClients();
      unsubProjects();
      unsubTasks();
      unsubLeads();
      unsubInvoices();
      unsubExpenses();
      unsubUsers();
    };
  }, [currentUser, role, authLoading]);

  // Calculate Metrics based on Role and Filter Scope
  const uid = currentUser?.uid;
  const adminIds = users.filter((u) => u.role === "admin").map((u) => u.id);

  // 1. Scoped Raw Datasets (syncing admin-created clients)
  const scopedClients = clients.filter((c) => {
    if (role === "admin") return true;
    if (role === "manager") return c.accountManager === uid || adminIds.includes(c.accountManager) || !c.accountManager;
    // Team member: client.assignedTeam contains user uid, or assigned in client profile
    return c.assignedTeam?.includes(uid) || c.accountManager === uid;
  });

  const scopedProjects = projects.filter((p) => {
    if (role === "admin") return true;
    if (role === "manager") return p.projectManager === uid || scopedClients.some((c) => c.id === p.clientId);
    return p.assignedTeam?.includes(uid);
  });

  const scopedTasks = tasks.filter((t) => {
    if (role === "admin") return true;
    if (role === "manager") return scopedClients.some((c) => c.id === t.clientId);
    return t.assignedUserId === uid;
  });

  const scopedLeads = leads.filter((l) => {
    if (role === "admin") return true;
    if (role === "manager") return l.assignedRep === uid;
    return false;
  });

  const scopedInvoices = invoices.filter((inv) => {
    if (role === "admin") return true;
    if (role === "manager") return scopedClients.some((c) => c.id === inv.clientId);
    return false;
  });

  const scopedExpenses = expenses.filter((exp) => {
    if (role === "admin") return true;
    if (role === "manager") return scopedClients.some((c) => c.id === exp.clientId);
    return false;
  });

  const isRetainerInvoice = (inv) => {
    if (!inv) return false;
    if (inv.description && inv.description.toLowerCase().includes("retainer")) return true;
    const client = clients.find(c => c.id === inv.clientId);
    if (client && Number(client.financials?.monthlyRetainer) > 0) return true;
    if (inv.projectId) {
      const project = projects.find(p => p.id === inv.projectId);
      if (project && project.billingType === "Retainer") return true;
    }
    return false;
  };

  // 2. Metrics Calculations
  const dObj = new Date();
  const todayStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(dObj.getDate()).padStart(2, "0")}`;

  const totalActiveClients = scopedClients.filter((c) => {
    if (c.status !== "Active") return false;
    return (!dateFrom || (c.dateJoined && c.dateJoined >= dateFrom)) && (!dateTo || (c.dateJoined && c.dateJoined <= dateTo));
  }).length;
  
  const newClientsThisMonth = scopedClients.filter((c) => {
    if (!c.dateJoined) return false;
    return (!dateFrom || c.dateJoined >= dateFrom) && (!dateTo || c.dateJoined <= dateTo);
  }).length;

  const activeProjectsCount = scopedProjects.filter((p) => p.status !== "Cancelled").length;

  const tasksDueToday = scopedTasks.filter((t) => t.dueDate === todayStr && t.status !== "Completed").length;
   
  const overdueTasksCount = scopedTasks.filter((t) => {
    if (!t.dueDate || t.status === "Completed" || t.status === "Cancelled") return false;
    return t.dueDate < todayStr;
  }).length;

  const upcomingShoots = scopedTasks.filter((t) => {
    return t.name?.toLowerCase().includes("shoot") && t.dueDate >= todayStr && t.status !== "Completed";
  }).length;

  // Let's assume approval tasks are checked via "Content" status or task status "Waiting" or named content approval
  const contentAwaitingApproval = scopedTasks.filter((t) => {
    return t.status === "Waiting" || t.name?.toLowerCase().includes("approval") || t.name?.toLowerCase().includes("review");
  }).length;

  const activeAdCampaigns = scopedProjects.filter((p) => {
    return p.type?.toLowerCase().includes("ad") && p.status !== "Cancelled";
  }).length;

  // Leads
  const newLeadsCount = scopedLeads.filter((l) => l.status === "New").length;
  const followUpsDueToday = scopedLeads.filter((l) => l.followUpDate === todayStr).length;

  // Financial metrics (Admin / Manager only)
  let mrr = 0;
  let revenueReceivedThisMonth = 0;
  let outstandingPayments = 0;
  let overduePayments = 0;
  let monthlyExpenses = 0;
  let additionalInvoicesRevenue = 0;

  // Retainer metrics
  let retainerAdded = 0;
  let retainerReceived = 0;
  let retainerDue = 0;

  if (role === "admin" || role === "manager") {
    // MRR = Client-level monthly retainers + active project-level retainers
    const clientRetainersSum = scopedClients.reduce((acc, c) => {
      if (c.status === "Active" && c.financials?.monthlyRetainer) {
        return acc + (Number(c.financials.monthlyRetainer) || 0);
      }
      return acc;
    }, 0);

    const projectRetainersSum = scopedProjects.reduce((acc, p) => {
      if (p.billingType === "Retainer" && p.status !== "Completed" && p.status !== "Cancelled") {
        return acc + (Number(p.value) || 0);
      }
      return acc;
    }, 0);

    mrr = clientRetainersSum + projectRetainersSum;

    // Revenue received in period: Invoices paid in range
    revenueReceivedThisMonth = scopedInvoices.reduce((acc, inv) => {
      if (inv.status !== "Paid" && inv.status !== "Received" && (Number(inv.amountPaid) || 0) <= 0) return acc;
      const dateStr = inv.invoiceDate || inv.dueDate;
      if (dateStr && (!dateFrom || dateStr >= dateFrom) && (!dateTo || dateStr <= dateTo)) {
        return acc + (Number(inv.amountPaid) || 0);
      }
      return acc;
    }, 0);

    // Additional manual/project invoices created in range (excluding recurring ones)
    additionalInvoicesRevenue = scopedInvoices.reduce((acc, inv) => {
      if (inv.invoiceDate && (!dateFrom || inv.invoiceDate >= dateFrom) && (!dateTo || inv.invoiceDate <= dateTo)) {
        const isRecurring = String(inv.invoiceNumber || "").startsWith("REC-") || String(inv.notes || "").toLowerCase().includes("recurring");
        if (!isRecurring) {
          return acc + (Number(inv.amount) || 0);
        }
      }
      return acc;
    }, 0);

    // Outstanding payments for range
    outstandingPayments = scopedInvoices.reduce((acc, inv) => {
      const status = inv.status || "Due";
      if (status === "Paid" || status === "Received") return acc;
      if (inv.invoiceDate && (!dateFrom || inv.invoiceDate >= dateFrom) && (!dateTo || inv.invoiceDate <= dateTo)) {
        return acc + (Number(inv.balance) || 0);
      }
      return acc;
    }, 0);

    // Overdue payments for range
    overduePayments = scopedInvoices.reduce((acc, inv) => {
      const status = inv.status || "Due";
      if (status !== "Paid" && status !== "Received" && inv.dueDate < todayStr) {
        if (inv.invoiceDate && (!dateFrom || inv.invoiceDate >= dateFrom) && (!dateTo || inv.invoiceDate <= dateTo)) {
          return acc + (Number(inv.balance) || 0);
        }
      }
      return acc;
    }, 0);

    // Expenses in range
    monthlyExpenses = scopedExpenses.reduce((acc, exp) => {
      if (exp.date && (!dateFrom || exp.date >= dateFrom) && (!dateTo || exp.date <= dateTo)) {
        return acc + (Number(exp.amount) || 0);
      }
      return acc;
    }, 0);

    // Calculate retainer metrics for range
    const retainerInvoices = scopedInvoices.filter(inv => inv.invoiceDate && (!dateFrom || inv.invoiceDate >= dateFrom) && (!dateTo || inv.invoiceDate <= dateTo) && isRetainerInvoice(inv));
    retainerAdded = retainerInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0);
    retainerReceived = retainerInvoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
    retainerDue = retainerInvoices.reduce((acc, inv) => acc + (Number(inv.balance) || 0), 0);
  }

  const estimatedProfit = (role === "admin" || role === "manager")
    ? (mrr + additionalInvoicesRevenue) - monthlyExpenses
    : 0;

  // 3. Chart Data Preparation
  // Revenue Trend (past 6 months)
  const getPast6MonthsData = () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      
      // Calculate revenue received for this specific month
      let rev = 0;
      if (role === "admin" || role === "manager") {
        rev = scopedInvoices.reduce((acc, inv) => {
          if (inv.invoiceDate) {
            const invDate = new Date(inv.invoiceDate);
            if (invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear()) {
              return acc + (Number(inv.amountPaid) || Number(inv.total) || 0);
            }
          }
          return acc;
        }, 0);
      }

      // Calculate task completions for team members
      let activity = 0;
      if (role === "team") {
        activity = scopedTasks.reduce((acc, t) => {
          if (t.status === "Completed" && t.dueDate) {
            const taskDate = new Date(t.dueDate);
            if (taskDate.getMonth() === d.getMonth() && taskDate.getFullYear() === d.getFullYear()) {
              return acc + 1;
            }
          }
          return acc;
        }, 0);
      }

      result.push({ name: label, Revenue: rev, Activity: activity });
    }
    return result;
  };

  const revenueTrendData = getPast6MonthsData();

  // Tasks by Status distribution
  const taskStatusData = [
    { name: "Completed", value: scopedTasks.filter((t) => t.status === "Completed").length, color: "#0284c7" }, // sky-600
    { name: "In Progress", value: scopedTasks.filter((t) => t.status === "In Progress").length, color: "#38bdf8" }, // sky-400
    { name: "Not Started", value: scopedTasks.filter((t) => t.status === "Not Started").length, color: "#bae6fd" }, // sky-200
    { name: "Waiting/Hold", value: scopedTasks.filter((t) => t.status === "Waiting").length, color: "#f0f9ff" }, // sky-50
    { name: "Overdue", value: overdueTasksCount, color: "#ef4444" } // red-500 for alert
  ].filter(item => item.value > 0);

  if (authLoading || loading) {
    return <Loader fullPage={true} message="Loading dashboard insights..." />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-12">
      <DashboardHeader />

      <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">

        {/* DATE SELECTOR BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-sky-50/20 p-4 rounded-3xl border border-sky-100/50">
          <div>
            <h3 className="text-xs font-bold text-sky-500 uppercase tracking-wider">Viewing Dashboard Period</h3>
            <p className="text-[10px] text-sky-400 font-semibold mt-0.5">Filter clients, projects, tasks, and financials</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2 border border-sky-100 rounded-2xl text-xs text-sky-600 outline-none focus:border-sky-300 focus:ring-1 focus:ring-sky-300 bg-white"
            />
            <span className="text-sky-300 text-xs font-semibold">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2 border border-sky-100 rounded-2xl text-xs text-sky-600 outline-none focus:border-sky-300 focus:ring-1 focus:ring-sky-300 bg-white"
            />
          </div>
        </div>
        
        {/* METRIC CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card: Active Clients */}
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Active Clients</p>
              <h3 className="text-2xl font-bold text-sky-600 mt-1">{totalActiveClients}</h3>
              <p className="text-[10px] text-sky-400 mt-1 font-semibold">+{newClientsThisMonth} new in selected period</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card: Active Projects */}
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Active Projects</p>
              <h3 className="text-2xl font-bold text-sky-600 mt-1">{activeProjectsCount}</h3>
              <p className="text-[10px] text-sky-400 mt-1 font-semibold">{scopedProjects.length} total registered</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>

          {/* Card: Tasks Due Today */}
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Tasks Due Today</p>
              <h3 className="text-2xl font-bold text-sky-600 mt-1">{tasksDueToday}</h3>
              <p className="text-[10px] text-red-500 mt-1 font-semibold flex items-center gap-1">
                {overdueTasksCount > 0 && (
                  <>
                    <Flame className="w-3.5 h-3.5" />
                    {overdueTasksCount} overdue tasks
                  </>
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>

          {/* Card: Upcoming shoots */}
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Upcoming Shoots</p>
              <h3 className="text-2xl font-bold text-sky-600 mt-1">{upcomingShoots}</h3>
              <p className="text-[10px] text-sky-400 mt-1 font-semibold">{contentAwaitingApproval} reviews pending</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
              <Camera className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* FINANCIAL CARDS GRID (Admin / Manager Only) */}
        {(role === "admin" || role === "manager") && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest">
              Financial Performance Indicators
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card: MRR */}
              <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Monthly Retainers</p>
                  <h3 className="text-2xl font-bold text-sky-600 mt-1">${mrr.toLocaleString()}</h3>
                  <p className="text-[10px] text-sky-400 mt-1 font-semibold">Active recurring value</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              {/* Card: Revenue this month */}
              <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Received This Month</p>
                  <h3 className="text-2xl font-bold text-sky-600 mt-1">${revenueReceivedThisMonth.toLocaleString()}</h3>
                  <p className="text-[10px] text-sky-400 mt-1 font-semibold">Processed invoice total</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
                  <Activity className="w-5 h-5" />
                </div>
              </div>

              {/* Card: Outstanding payments */}
              <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Total Outstanding</p>
                  <h3 className="text-2xl font-bold text-sky-600 mt-1">${outstandingPayments.toLocaleString()}</h3>
                  {overduePayments > 0 ? (
                    <p className="text-[10px] text-red-500 mt-1 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      ${overduePayments.toLocaleString()} overdue
                    </p>
                  ) : (
                    <p className="text-[10px] text-sky-400 mt-1 font-semibold">All invoice balances</p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>

              {/* Card: Estimated Profit */}
              <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Estimated Profit</p>
                  <h3 className={`text-2xl font-bold mt-1 ${estimatedProfit >= 0 ? "text-sky-600" : "text-red-500"}`}>
                    ${estimatedProfit.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-sky-400 mt-1 font-semibold">Expenses: ${monthlyExpenses.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Synced Retainer billing metrics row */}
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest pt-2">
              Retainer Billing Performance {dateFrom || dateTo ? `(${dateFrom || 'Start'} to ${dateTo || 'End'})` : '(All Time)'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Retainers Added Card */}
              <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Retainers Added</p>
                  <h3 className="text-2xl font-bold text-sky-600 mt-1">${retainerAdded.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                  <p className="text-[10px] text-sky-400 mt-1 font-semibold">Total retainer billing</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              
              {/* Retainers Collected Card */}
              <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Retainers Collected</p>
                  <h3 className="text-2xl font-bold text-sky-600 mt-1">${retainerReceived.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                  <p className="text-[10px] text-sky-400 mt-1 font-semibold">Processed payments</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
                  <CheckSquare className="w-5 h-5" />
                </div>
              </div>
              
              {/* Retainers Due Card */}
              <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Retainers Due</p>
                  <h3 className="text-2xl font-bold text-sky-600 mt-1">${retainerDue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                  <p className="text-[10px] text-sky-400 mt-1 font-semibold">Outstanding balance</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* AGENCY HEALTH WIDGETS (Admin / Manager Only) */}
        {(role === "admin" || role === "manager") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {/* Card: Active Ad Campaigns */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 flex-shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-sky-400 uppercase">Ad Campaigns</p>
                <p className="text-sm font-bold text-sky-600">{activeAdCampaigns} Running</p>
              </div>
            </div>

            {/* Card: Content awaiting approval */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 flex-shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-sky-400 uppercase">Awaiting Approval</p>
                <p className="text-sm font-bold text-sky-600">{contentAwaitingApproval} Pieces</p>
              </div>
            </div>

            {/* Card: New Leads */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-sky-400 uppercase">New Leads</p>
                <p className="text-sm font-bold text-sky-600">{newLeadsCount} Hot leads</p>
              </div>
            </div>

            {/* Card: Follow ups due */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-sm flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 flex-shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-sky-400 uppercase">Follow-ups Today</p>
                <p className={`text-sm font-bold ${followUpsDueToday > 0 ? "text-red-500 animate-pulse" : "text-sky-600"}`}>
                  {followUpsDueToday} Tasks
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VISUAL CHARTS DIVISION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue Trend Chart */}
          <div className="lg:col-span-2 p-6 bg-white border border-sky-100 rounded-3xl shadow-xl flex flex-col min-h-[360px]">
            <div className="mb-4">
              <h3 className="text-base font-bold text-sky-600">Revenue Trend Analysis</h3>
              <p className="text-[10px] text-sky-400 uppercase tracking-widest font-semibold mt-0.5">
                {role === "team" ? "Project Hours and Activity Index" : "Monthly Revenue Inflow"}
              </p>
            </div>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueTrendData}
                  margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" />
                  <XAxis dataKey="name" stroke="#0284c7" fontSize={10} tickLine={false} />
                  <YAxis stroke="#0284c7" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #bae6fd",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#0369a1"
                    }}
                  />
                  <Bar
                    dataKey={role === "team" ? "Activity" : "Revenue"}
                    fill="#348eab"
                    shape={<Custom3DBar />}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks Distribution Chart */}
          <div className="p-6 bg-white border border-sky-100 rounded-3xl shadow-xl flex flex-col min-h-[360px]">
            <div className="mb-4">
              <h3 className="text-base font-bold text-sky-600">Tasks by Status</h3>
              <p className="text-[10px] text-sky-400 uppercase tracking-widest font-semibold mt-0.5">
                Current workload distribution
              </p>
            </div>
            <div className="flex-1 w-full min-h-[200px] flex items-center justify-center">
              {taskStatusData.length === 0 ? (
                <div className="text-center text-sky-400 text-xs py-12 font-semibold">
                  No active tasks found in scope.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #bae6fd",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#0369a1"
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconSize={8}
                      iconType="circle"
                      formatter={(value, entry) => (
                        <span className="text-[10px] font-bold text-sky-500">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
