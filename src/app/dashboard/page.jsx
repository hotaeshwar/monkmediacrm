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
  CalendarCheck
} from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login/team");
    }
  }, [currentUser, authLoading, router]);

  // Firestore real-time observers
  useEffect(() => {
    if (!currentUser || authLoading) return;

    setLoading(true);

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

    const unsubTasks = onSnapshot(collection(db, "tasks"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setTasks(list);
    });

    let unsubLeads = () => {};
    let unsubInvoices = () => {};
    let unsubExpenses = () => {};

    if (role === "admin" || role === "manager") {
      unsubLeads = onSnapshot(collection(db, "leads"), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setLeads(list);
      });

      unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setInvoices(list);
      });

      unsubExpenses = onSnapshot(collection(db, "expenses"), (snap) => {
        const list = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
        setExpenses(list);
      });
    }

    setLoading(false);

    return () => {
      unsubClients();
      unsubProjects();
      unsubTasks();
      unsubLeads();
      unsubInvoices();
      unsubExpenses();
    };
  }, [currentUser, role, authLoading]);

  // Calculate Metrics based on Role and Filter Scope
  const uid = currentUser?.uid;

  // 1. Scoped Raw Datasets
  const scopedClients = clients.filter((c) => {
    if (role === "admin") return true;
    if (role === "manager") return c.accountManager === uid;
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

  // 2. Metrics Calculations
  const todayStr = new Date().toISOString().split("T")[0];

  const totalActiveClients = scopedClients.filter((c) => c.status === "Active").length;
  
  const newClientsThisMonth = scopedClients.filter((c) => {
    if (!c.dateJoined) return false;
    const joined = new Date(c.dateJoined);
    const now = new Date();
    return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
  }).length;

  const activeProjectsCount = scopedProjects.filter((p) => p.status === "In Progress").length;

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
    return p.type?.toLowerCase().includes("ad") && p.status === "In Progress";
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

  if (role === "admin" || role === "manager") {
    // MRR = sum of active clients' retainer
    mrr = scopedClients.reduce((acc, c) => acc + (Number(c.financials?.monthlyRetainer) || 0), 0);

    // Revenue received this month: Invoices paid this month
    const now = new Date();
    revenueReceivedThisMonth = scopedInvoices.reduce((acc, inv) => {
      if (inv.status !== "Paid" && (Number(inv.amountPaid) || 0) <= 0) return acc;
      const invDate = new Date(inv.invoiceDate || inv.dueDate);
      if (invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear()) {
        return acc + (Number(inv.amountPaid) || 0);
      }
      return acc;
    }, 0);

    // Outstanding payments
    outstandingPayments = scopedInvoices.reduce((acc, inv) => {
      if (inv.status === "Paid") return acc;
      return acc + (Number(inv.balance) || 0);
    }, 0);

    // Overdue payments (Invoices where dueDate < today and status != Paid)
    overduePayments = scopedInvoices.reduce((acc, inv) => {
      if (inv.status !== "Paid" && inv.dueDate < todayStr) {
        return acc + (Number(inv.balance) || 0);
      }
      return acc;
    }, 0);

    // Monthly expenses (expenses logged in current month)
    monthlyExpenses = scopedExpenses.reduce((acc, exp) => {
      if (!exp.date) return acc;
      const expDate = new Date(exp.date);
      if (expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()) {
        return acc + (Number(exp.amount) || 0);
      }
      return acc;
    }, 0);
  }

  const estimatedProfit = (role === "admin" || role === "manager")
    ? (mrr + revenueReceivedThisMonth) - monthlyExpenses
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

      result.push({ name: label, Revenue: rev });
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
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white min-h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white pb-12">
      <DashboardHeader />

      <div className="p-6 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* METRIC CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card: Active Clients */}
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Active Clients</p>
              <h3 className="text-2xl font-bold text-sky-600 mt-1">{totalActiveClients}</h3>
              <p className="text-[10px] text-sky-400 mt-1 font-semibold">+{newClientsThisMonth} new this month</p>
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
