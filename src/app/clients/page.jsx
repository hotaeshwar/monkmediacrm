"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import Link from "next/link";
import { Search, Plus, User, Filter, RefreshCw, X, Trash2 } from "lucide-react";
import Loader from "@/components/Loader";

export default function ClientsPage() {
  const { currentUser, role } = useAuth();
  
  // Data State
  const [clients, setClients] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Create Client Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState("");
  const [assignedManager, setAssignedManager] = useState("");
  const [clientStatus, setClientStatus] = useState("Active");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Initial Project Configuration States
  const [initialProjType, setInitialProjType] = useState("Social Media");
  const [initialProjBillingType, setInitialProjBillingType] = useState("One-Time");
  const [initialProjVal, setInitialProjVal] = useState("");
  const [initialProjStartDate, setInitialProjStartDate] = useState("");
  const [initialProjEndDate, setInitialProjEndDate] = useState("");
  const [initialProjManager, setInitialProjManager] = useState("");
  
  // New optional fields
  const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [clientNotes, setClientNotes] = useState("");
  const [initialProjName, setInitialProjName] = useState("");
  const [initialProjDescription, setInitialProjDescription] = useState("");
  const [driveLinks, setDriveLinks] = useState([]); // Array of { title: "", url: "" }
  const [includeHST, setIncludeHST] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });

  const getClientCampaignValue = (clientId) => {
    return projects
      .filter((p) => p.clientId === clientId && p.status !== "Cancelled")
      .reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  };

  const handleDeleteClient = async (clientId) => {
    if (!confirm("Are you sure you want to delete this client? This will delete their profile from the registry.")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "clients", clientId));
      alert("Client deleted successfully!");
      fetchData();
    } catch (err) {
      console.error("Error deleting client:", err);
      alert("Failed to delete client: " + err.message);
    }
  };

  // Fetch Clients and Managers
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Clients
      const clientSnap = await getDocs(collection(db, "clients"));
      const clientList = [];
      clientSnap.forEach((doc) => {
        clientList.push({ id: doc.id, ...doc.data() });
      });
      setClients(clientList);

      // 2. Fetch Account Managers for selection
      const userSnap = await getDocs(collection(db, "users"));
      const managerList = [];
      userSnap.forEach((doc) => {
        const u = doc.data();
        if (u.role === "manager" || u.role === "admin") {
          managerList.push({ id: doc.id, name: u.name, email: u.email });
        }
      });
      setManagers(managerList);

      // 3. Fetch Projects
      const projectSnap = await getDocs(collection(db, "projects"));
      const projectList = [];
      projectSnap.forEach((doc) => {
        projectList.push({ id: doc.id, ...doc.data() });
      });
      setProjects(projectList);
    } catch (err) {
      console.error("Error loading clients module:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Filter clients based on Role & inputs
  const filteredClients = clients.filter((c) => {
    // 1. Role boundaries
    if (role === "manager") {
      if (c.accountManager !== currentUser?.uid) return false;
    } else if (role === "team") {
      if (!c.assignedTeam?.includes(currentUser?.uid) && c.accountManager !== currentUser?.uid) return false;
    }

    // 2. Search filtering
    const searchLower = searchTerm.toLowerCase();
    const matchSearch =
      c.businessName?.toLowerCase().includes(searchLower) ||
      c.contactPerson?.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower);

    // 3. Status filtering
    const matchStatus = statusFilter === "All" || c.status === statusFilter;

    // 4. Date filtering
    const matchMonth = !selectedMonth || (c.dateJoined && c.dateJoined.startsWith(selectedMonth));

    return matchSearch && matchStatus && matchMonth;
  });

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const finalBusinessName = businessName.trim() || "Unnamed Client";
      const validLinks = driveLinks
        .filter((link) => link.url.trim() !== "")
        .map((link) => ({
          title: link.title.trim() || "Drive Link",
          url: link.url.trim(),
        }));

      const onboardingDate = projectStartDate || new Date().toISOString().split("T")[0];
      const start = new Date(onboardingDate + "T12:00:00");
      const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
      const nextPaymentDateStr = nextMonth.toISOString().split("T")[0];
      const dueDateStr = String(start.getDate());

      const clientPayload = {
        businessName: finalBusinessName,
        legalName: finalBusinessName,
        contactPerson: contactPerson || "",
        phone: phone || "",
        email: email || "",
        secondaryContact: "",
        website: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        industry: industry || "Other",
        status: clientStatus,
        dateJoined: onboardingDate,
        accountManager: assignedManager || currentUser?.uid,
        leadSource: "Direct",
        notes: clientNotes || "",
        logoUrl: "",
        logoTransparentUrl: "",
        services: [],
        deliverables: "",
        accountLinks: validLinks,
        assignedTeam: [],
        financials: {
          monthlyRetainer: 0,
          oneTimeProjectValue: 0,
          paymentFrequency: "Monthly",
          dueDate: dueDateStr,
          projectStartDate: onboardingDate,
          contractStart: onboardingDate,
          contractEnd: "",
          taxRate: includeHST ? 13 : 0,
          gstNumber: "",
          billingEmail: email || "",
          paymentMethod: "Credit Card",
          depositRequired: false,
          depositReceived: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          nextPaymentDate: nextPaymentDateStr,
          lastPaymentDate: "",
        },
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, "clients"), clientPayload);

      const addDays = (dateStr, days) => {
        const d = new Date(dateStr + "T12:00:00");
        d.setDate(d.getDate() + days);
        return d.toISOString().split("T")[0];
      };

      // Auto-create retainer invoice if monthly retainer is set (Removed as monthly retainer is not set at registration)

      // Create an initial project if specified
      if (initialProjName.trim()) {
        const projectVal = Number(initialProjVal) || 0;
        const projectPayload = {
          name: initialProjName.trim(),
          clientId: docRef.id,
          type: initialProjType,
          billingType: initialProjBillingType,
          description: initialProjDescription || "",
          startDate: initialProjStartDate || onboardingDate,
          endDate: initialProjEndDate || "",
          deadline: initialProjEndDate || "",
          completionDate: "",
          value: projectVal,
          estimatedCost: 0,
          actualCost: 0,
          profit: 0,
          projectManager: initialProjManager || assignedManager || currentUser?.uid,
          assignedTeam: [],
          status: "Planned",
          priority: "Medium",
          progressPercent: 0,
          driveFolder: validLinks.length > 0 ? validLinks[0].url : "",
          notes: "",
        };
        const projRef = await addDoc(collection(db, "projects"), projectPayload);

        // Auto-create invoice for initial project value if project value is set
        if (projectVal > 0) {
          const cleanProjName = initialProjName.trim().substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
          const invoiceNum = `INV-${cleanProjName}-${Date.now().toString().slice(-6)}`;
          const projStart = initialProjStartDate || onboardingDate;
          const dueStr = addDays(projStart, 14);
          const clientTaxRate = includeHST ? 13 : 0;
          const tax = Number(((projectVal * clientTaxRate) / 100).toFixed(2));
          const total = projectVal + tax;

          await addDoc(collection(db, "invoices"), {
            invoiceNumber: invoiceNum,
            clientId: docRef.id,
            projectId: projRef.id,
            invoiceDate: projStart,
            dueDate: dueStr,
            amount: projectVal,
            campaignValue: projectVal,
            tax,
            total,
            amountPaid: 0,
            balance: total,
            status: "Due",
            paymentMethod: "Credit Card",
            receiptUrl: "",
            notes: `Automatically generated invoice for initial project campaign "${initialProjName.trim()}".`,
            description: `Project Campaign: ${initialProjName.trim()}`,
            clientName: finalBusinessName,
            clientAttention: contactPerson || "",
            clientEmail: email || "",
            craNumber: "777790411",
            hstNumber: "777790411 RT 0001",
            fromCompanyName: "14689941 Canada Inc.",
            fromBrandName: "Operating as Monk Media",
            fromEmail: "info@monkmedia.ca",
          });
        }
      }

      // Initialize an empty onboarding checklist document for this client
      await addDoc(collection(db, "onboardingChecklists"), {
        clientId: docRef.id,
        clientInfoCollected: false,
        contractSigned: false,
        depositReceived: false,
        invoiceCreated: false,
        driveFolderCreated: false,
        logoUploaded: false,
        brandAssetsUploaded: false,
        socialMediaAccess: false,
        metaBusinessAccess: false,
        adAccountAccess: false,
        websiteAccess: false,
        servicesConfirmed: false,
        deliverablesConfirmed: false,
        firstShootScheduled: false,
        teamAssigned: false,
        addedToCalendar: false,
        reportingTemplateCreated: false,
      });

      // Reset Form and State
      setBusinessName("");
      setContactPerson("");
      setEmail("");
      setPhone("");
      setIndustry("");
      setAssignedManager("");
      setProjectStartDate(new Date().toISOString().split("T")[0]);
      setClientNotes("");
      setInitialProjName("");
      setInitialProjType("Social Media");
      setInitialProjBillingType("One-Time");
      setInitialProjVal("");
      setInitialProjStartDate("");
      setInitialProjEndDate("");
      setInitialProjManager("");
      setInitialProjDescription("");
      setDriveLinks([]);
      setDrawerOpen(false);

      // Refresh list
      fetchData();
      alert("Client created successfully!");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-emerald-500 text-white border-emerald-600";
      case "Onboarding":
        return "bg-sky-500 text-white border-sky-600";
      case "Lead":
        return "bg-amber-500 text-white border-amber-600";
      case "Paused":
        return "bg-rose-400 text-white border-rose-500";
      case "Payment Overdue":
        return "bg-red-600 text-white border-red-700 animate-pulse";
      case "Completed":
        return "bg-indigo-600 text-white border-indigo-700";
      case "Archived":
        return "bg-slate-400 text-white border-slate-500";
      default:
        return "bg-sky-50 text-sky-600 border-sky-200";
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page title and headers */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-sky-600">Clients</h1>
            <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
              Monk Media Agency Clients Registry
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-2xl hover:bg-sky-50 text-sky-500 border border-sky-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {(role === "admin" || role === "manager") && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition-all duration-200 shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Client
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
            <input
              type="text"
              placeholder="Search by business name, contact person or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
            />
          </div>
          {/* Status Dropdown */}
          <div className="relative min-w-[160px]">
            <Filter className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100 rounded-2xl text-sm text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300 appearance-none"
            >
              <option value="All">All Statuses</option>
              <option value="Lead">Lead</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Payment Overdue">Payment Overdue</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          {/* Month Date Picker */}
          <div className="relative min-w-[160px]">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-sky-100 rounded-2xl text-sm text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300 font-semibold"
            />
          </div>
        </div>

        {/* Clients Table / List */}
        {loading ? (
          <Loader />
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20 border border-sky-100 rounded-3xl bg-sky-50/5/30">
            <User className="w-12 h-12 mx-auto text-sky-200 mb-2" />
            <h3 className="text-sm font-bold text-sky-600">No Clients Found</h3>
            <p className="text-xs text-sky-400 mt-1">
              Try adjusting your search criteria or register a new client profile.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sky-50/30 border-b border-sky-100 text-sky-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Business Name</th>
                    <th className="py-4 px-6">Contact Person</th>
                    <th className="py-4 px-6">Industry</th>
                    <th className="py-4 px-6">Joined Date</th>
                    <th className="py-4 px-6">Retainer</th>
                    <th className="py-4 px-6">Campaign Value</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100 text-sm text-sky-600 font-medium">
                  {filteredClients.map((c) => (
                    <tr key={c.id} className="hover:bg-sky-50/20 transition-colors">
                      <td className="py-4.5 px-6">
                        <Link href={`/clients/profile?id=${c.id}`} className="font-bold text-sky-600 hover:underline">
                          {c.businessName}
                        </Link>
                      </td>
                      <td className="py-4.5 px-6 flex flex-col">
                        <span>{c.contactPerson}</span>
                        <span className="text-[10px] text-sky-400 font-medium">{c.email}</span>
                      </td>
                      <td className="py-4.5 px-6 capitalize">{c.industry}</td>
                      <td className="py-4.5 px-6">{c.dateJoined}</td>
                      <td className="py-4.5 px-6 text-sky-600 font-semibold">
                        {(role === "admin" || role === "manager" || role === "client")
                          ? `$${(c.financials?.monthlyRetainer || 0).toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="py-4.5 px-6 text-sky-600 font-semibold">
                        {`$${getClientCampaignValue(c.id).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                      </td>
                      <td className="py-4.5 px-6">
                        <select
                          value={c.status}
                          onChange={async (e) => {
                            try {
                              await updateDoc(doc(db, "clients", c.id), { status: e.target.value });
                              fetchData();
                            } catch (err) {
                              alert("Error: " + err.message);
                            }
                          }}
                          className={`px-2.5 py-1 text-xs font-bold border rounded-full cursor-pointer outline-none shadow-sm text-center ${getStatusColor(c.status)}`}
                        >
                          <option value="Lead">Lead</option>
                          <option value="Onboarding">Onboarding</option>
                          <option value="Active">Active</option>
                          <option value="Paused">Paused</option>
                          <option value="Payment Overdue">Payment Overdue</option>
                          <option value="Completed">Completed</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/clients/profile?id=${c.id}`}
                            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl text-xs font-bold transition-all"
                          >
                            View Profile
                          </Link>
                          {role === "admin" && (
                            <button
                              onClick={() => handleDeleteClient(c.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"
                              title="Delete Client"
                            >
                              <Trash2 className="w-4 h-4" />
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
        )}

        {/* Drawers / Modals (Add Client) */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-lg bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                  <div>
                    <h2 className="text-xl font-bold text-sky-600">Register New Client</h2>
                    <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Add to agency portfolio</p>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formError && (
                  <div className="my-4 p-3 bg-red-50/50 border border-red-100 text-red-500 rounded-2xl text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleCreateClient} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Business/Brand Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Monk Media Inc. (Optional)"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Simran Singh (Optional)"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="billing@client.com (Optional)"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. (416) 555-0199"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Retail, Real Estate"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Assigned Account Manager
                    </label>
                    <select
                      value={assignedManager}
                      onChange={(e) => setAssignedManager(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                    >
                      <option value="">Assign to yourself</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Initial Status
                    </label>
                    <select
                      value={clientStatus}
                      onChange={(e) => setClientStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                    >
                      <option value="Lead">Lead</option>
                      <option value="Onboarding">Onboarding</option>
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Project Start Date
                    </label>
                    <input
                      type="date"
                      value={projectStartDate}
                      onChange={(e) => setProjectStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1.5">
                    <input
                      type="checkbox"
                      id="includeHST"
                      checked={includeHST}
                      onChange={(e) => setIncludeHST(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-500 border-sky-200 focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="includeHST" className="text-sky-500 cursor-pointer select-none font-bold text-xs">
                      Opt-in / Include HST (13%) Tax Rate
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Client Notes
                    </label>
                    <textarea
                      rows={3}
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Enter strategy guidelines, notes, etc. (Optional)"
                      className="w-full p-3 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-xs text-sky-600 outline-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-sky-100 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-500">Initial Project Campaign</h4>
                      <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Directly register client&apos;s first campaign</p>
                    </div>

                    <div className="space-y-4 bg-sky-50/20 p-4 rounded-3xl border border-sky-100/50">
                      <div>
                        <label className="block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">Project Name</label>
                        <input
                          type="text"
                          value={initialProjName}
                          onChange={(e) => setInitialProjName(e.target.value)}
                          placeholder="e.g. Winter Shoot (Optional)"
                          className="w-full px-3 py-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none"
                        />
                      </div>

                      {initialProjName.trim() && (
                        <div className="space-y-4 pt-1 animate-fadeIn">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">Project Type</label>
                              <select
                                value={initialProjType}
                                onChange={(e) => setInitialProjType(e.target.value)}
                                className="w-full p-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none animate-fadeIn"
                              >
                                <option value="Social Media">Social Media</option>
                                <option value="Video Shoot">Video Production</option>
                                <option value="Web Development">Web Development</option>
                                <option value="Ad Campaign">Ad Campaign</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">Billing Model</label>
                              <select
                                value={initialProjBillingType}
                                onChange={(e) => setInitialProjBillingType(e.target.value)}
                                className="w-full p-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none"
                              >
                                <option value="One-Time">One-Time Project</option>
                                <option value="Retainer">Monthly Retainer</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">Value / Rate ($)</label>
                              <input
                                type="number"
                                value={initialProjVal}
                                onChange={(e) => setInitialProjVal(e.target.value)}
                                placeholder="e.g. 1500"
                                className="w-full p-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">Project Manager</label>
                              <select
                                value={initialProjManager}
                                onChange={(e) => setInitialProjManager(e.target.value)}
                                className="w-full p-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none"
                              >
                                <option value="">Assign to yourself</option>
                                {managers.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">Start Date</label>
                              <input
                                type="date"
                                value={initialProjStartDate}
                                onChange={(e) => setInitialProjStartDate(e.target.value)}
                                className="w-full p-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">End Date / Deadline</label>
                              <input
                                type="date"
                                value={initialProjEndDate}
                                onChange={(e) => setInitialProjEndDate(e.target.value)}
                                className="w-full p-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">Project Description</label>
                            <textarea
                              rows={2}
                              value={initialProjDescription}
                              onChange={(e) => setInitialProjDescription(e.target.value)}
                              placeholder="Deliverables, scope, details..."
                              className="w-full p-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-sky-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-500">Drive Links (Optional)</h4>
                      <button
                        type="button"
                        onClick={() => setDriveLinks([...driveLinks, { title: "", url: "" }])}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl text-[10px] font-bold transition-all"
                      >
                        + Add Link
                      </button>
                    </div>
                    {driveLinks.length === 0 ? (
                      <p className="text-[10px] text-sky-300 italic">No custom drive links added yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {driveLinks.map((lnk, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={lnk.title}
                              onChange={(e) => {
                                const next = [...driveLinks];
                                next[idx].title = e.target.value;
                                setDriveLinks(next);
                              }}
                              placeholder="Name e.g. Assets Folder"
                              className="w-1/3 px-3 py-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none"
                            />
                            <input
                              type="url"
                              value={lnk.url}
                              onChange={(e) => {
                                const next = [...driveLinks];
                                next[idx].url = e.target.value;
                                setDriveLinks(next);
                              }}
                              placeholder="https://drive.google.com/..."
                              className="flex-1 px-3 py-2 bg-white border border-sky-100 rounded-xl text-xs text-sky-600 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setDriveLinks(driveLinks.filter((_, i) => i !== idx))}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-sky-50 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="px-4 py-2 border border-sky-100 text-sky-500 rounded-2xl text-xs font-bold hover:bg-sky-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {formLoading ? "Creating..." : "Save Client"}
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
