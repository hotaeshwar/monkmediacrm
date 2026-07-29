"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ShieldAlert, FileText, Download, Printer, Filter, Calendar, TrendingDown, Sparkles } from "lucide-react";

export default function ReportsPage() {
  const { currentUser, role } = useAuth();

  // Scoped Data State
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Filters State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedClient, setSelectedClient] = useState("All");

  useEffect(() => {
    if (!currentUser || role === "team") return;
    setLoading(true);

    const loadReportData = async () => {
      try {
        // Load clients
        const clientSnap = await getDocs(collection(db, "clients"));
        const clientList = [];
        clientSnap.forEach((doc) => {
          clientList.push({ id: doc.id, ...doc.data() });
        });
        setClients(clientList);

        // Load invoices
        const invoiceSnap = await getDocs(collection(db, "invoices"));
        const invoiceList = [];
        invoiceSnap.forEach((doc) => {
          invoiceList.push({ id: doc.id, ...doc.data() });
        });
        setInvoices(invoiceList);

        // Load expenses
        const expenseSnap = await getDocs(collection(db, "expenses"));
        const expenseList = [];
        expenseSnap.forEach((doc) => {
          expenseList.push({ id: doc.id, ...doc.data() });
        });
        setExpenses(expenseList);
      } catch (err) {
        console.error("Error loading reports data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [currentUser, role]);

  // Scopes clients and financial lists by Manager
  const scopedClients = clients.filter((c) => {
    if (role === "admin") return true;
    return c.accountManager === currentUser?.uid;
  });

  const scopedInvoices = invoices.filter((inv) => {
    if (role === "admin") return true;
    return scopedClients.some((c) => c.id === inv.clientId);
  });

  const scopedExpenses = expenses.filter((exp) => {
    if (role === "admin") return true;
    return scopedClients.some((c) => c.id === exp.clientId);
  });

  // Apply Report Range Filters
  const reportInvoices = scopedInvoices.filter((inv) => {
    const date = inv.invoiceDate || inv.dueDate;
    const matchDate = date >= startDate && date <= endDate;
    const matchClient = selectedClient === "All" || inv.clientId === selectedClient;
    return matchDate && matchClient;
  });

  const reportExpenses = scopedExpenses.filter((exp) => {
    const date = exp.date;
    const matchDate = date >= startDate && date <= endDate;
    const matchClient = selectedClient === "All" || exp.clientId === selectedClient;
    return matchDate && matchClient;
  });

  // Calculation Metrics
  const totalInvoiced = reportInvoices.reduce((acc, i) => acc + (Number(i.total) || 0), 0);
  const totalCollected = reportInvoices.reduce((acc, i) => acc + (Number(i.amountPaid) || 0), 0);
  const totalExpenses = reportExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalOutstanding = reportInvoices.reduce((acc, i) => acc + (Number(i.balance) || 0), 0);
  
  const netEarnings = totalCollected - totalExpenses;

  const handleDownloadExcel = () => {
    let csv = "MONK MEDIA FINANCIAL STATEMENT\n";
    csv += `Date Range,${startDate} to ${endDate}\n`;
    csv += `Client Scope,${selectedClient === "All" ? "All Accounts" : getClientName(selectedClient)}\n\n`;

    csv += "FINANCIAL SUMMARY\n";
    csv += `Total Invoiced,Total Collected,Total Outstanding,Net Cash Flow\n`;
    csv += `${totalInvoiced.toFixed(2)},${totalCollected.toFixed(2)},${totalOutstanding.toFixed(2)},${netEarnings.toFixed(2)}\n\n`;

    csv += "DETAILED INVOICES\n";
    csv += "Invoice #,Client Name,Date,Status,Total Amount,Amount Paid,Balance Outstanding\n";
    if (reportInvoices.length === 0) {
      csv += "No matching invoices found,,,,,,\n";
    } else {
      reportInvoices.forEach((inv) => {
        const clientName = getClientName(inv.clientId).replace(/,/g, " ");
        const invDate = inv.invoiceDate || inv.dueDate;
        const status = inv.status || "Due";
        csv += `="${inv.invoiceNumber}",${clientName},="${invDate}",${status},${(inv.total || 0).toFixed(2)},${(inv.amountPaid || 0).toFixed(2)},${(inv.balance || 0).toFixed(2)}\n`;
      });
    }
    csv += "\n";

    csv += "LOGGED EXPENDITURES\n";
    csv += "Date,Category,Client Name,Notes,Amount\n";
    if (reportExpenses.length === 0) {
      csv += "No matching expenditures found,,,,\n";
    } else {
      reportExpenses.forEach((exp) => {
        const clientName = getClientName(exp.clientId).replace(/,/g, " ");
        const notes = (exp.notes || "").replace(/,/g, " ");
        csv += `="${exp.date}",${exp.category},${clientName},${notes},${(exp.amount || 0).toFixed(2)}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = `MonkMedia_Financial_Report_${startDate}_to_${endDate}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearAndSeed = async () => {
    if (!confirm("Are you sure you want to delete all invoices, clients, projects, tasks, expenses, payments, leads, and non-admin users, and seed clean mock data?")) {
      return;
    }

    setSeeding(true);
    try {
      const { collection, getDocs, doc, deleteDoc, setDoc, addDoc, updateDoc } = await import("firebase/firestore");

      const collectionsToClear = ["clients", "projects", "tasks", "invoices", "expenses", "payments", "leads", "users"];
      for (const col of collectionsToClear) {
        const snap = await getDocs(collection(db, col));
        for (const docSnap of snap.docs) {
          if (col === "users" && docSnap.data().email === "sharmaatul@gmail.com") {
            continue; // Keep the admin account profile!
          }
          await deleteDoc(docSnap.ref);
        }
      }

      const managerId = "seeded-mgr-uid-janesmith";
      const teamId = "seeded-team-uid-johndoe";

      await setDoc(doc(db, "users", managerId), {
        name: "Jane Smith",
        email: "janesmith@gmail.com",
        role: "manager",
        phone: "+1 555-0199",
        employmentType: "Full-Time",
        paymentModel: "Salary",
        rate: 7500,
        assignedClients: [],
        assignedProjects: [],
        status: "active",
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, "users", teamId), {
        name: "John Doe",
        email: "johndoe@gmail.com",
        role: "team",
        phone: "+1 555-0144",
        employmentType: "Full-Time",
        paymentModel: "Salary",
        rate: 5500,
        assignedClients: [],
        assignedProjects: [],
        status: "active",
        createdAt: new Date().toISOString()
      });

      const client1Ref = doc(collection(db, "clients"));
      const client2Ref = doc(collection(db, "clients"));
      const client3Ref = doc(collection(db, "clients"));

      const client1Id = client1Ref.id;
      const client2Id = client2Ref.id;
      const client3Id = client3Ref.id;

      await setDoc(client1Ref, {
        businessName: "Metric Air Limited",
        onboardingContactName: "Tejinder Singh",
        email: "metricairlimited.ca@gmail.com",
        phone: "+1 416-555-0192",
        address: "100 Bay St, Toronto, ON, Canada",
        onboardingStatus: "active",
        financials: {
          taxRate: 13,
          paymentMethod: "Bank Transfer",
          totalPaid: 17035.88,
          lastPaymentDate: "2026-07-20"
        },
        accountManager: managerId,
        createdAt: new Date().toISOString()
      });

      await setDoc(client2Ref, {
        businessName: "Acme Corporation",
        onboardingContactName: "Jane Miller",
        email: "billing@acme.com",
        phone: "+1 212-555-0133",
        address: "500 5th Ave, New York, NY, USA",
        onboardingStatus: "active",
        financials: {
          taxRate: 13,
          paymentMethod: "Credit Card",
          totalPaid: 0,
          lastPaymentDate: ""
        },
        accountManager: managerId,
        createdAt: new Date().toISOString()
      });

      await setDoc(client3Ref, {
        businessName: "Global Brands Group",
        onboardingContactName: "Robert Down",
        email: "invoice@globalbrands.com",
        phone: "+1 310-555-0147",
        address: "9000 Sunset Blvd, West Hollywood, CA, USA",
        onboardingStatus: "active",
        financials: {
          taxRate: 13,
          paymentMethod: "Stripe",
          totalPaid: 0,
          lastPaymentDate: ""
        },
        accountManager: managerId,
        createdAt: new Date().toISOString()
      });

      const proj1Ref = doc(collection(db, "projects"));
      const proj2Ref = doc(collection(db, "projects"));
      const proj3Ref = doc(collection(db, "projects"));

      const proj1Id = proj1Ref.id;
      const proj2Id = proj2Ref.id;
      const proj3Id = proj3Ref.id;

      await setDoc(proj1Ref, {
        name: "Software and App Development",
        clientId: client1Id,
        status: "completed",
        description: "Custom agency business analytics application integration.",
        budget: 15076,
        startDate: "2026-06-01",
        endDate: "2026-07-20",
        assignedTeam: [teamId],
        createdAt: new Date().toISOString()
      });

      await setDoc(proj2Ref, {
        name: "Summer Campaign Video",
        clientId: client2Id,
        status: "in-progress",
        description: "Promotional cinematic reels and video campaigns.",
        budget: 5000,
        startDate: "2026-07-01",
        endDate: "2026-08-15",
        assignedTeam: [teamId],
        createdAt: new Date().toISOString()
      });

      await setDoc(proj3Ref, {
        name: "Brand Identity Rebrand",
        clientId: client3Id,
        status: "in-progress",
        description: "Logo updates, branding assets, guidelines and visual templates.",
        budget: 8500,
        startDate: "2026-07-10",
        endDate: "2026-08-30",
        assignedTeam: [teamId],
        createdAt: new Date().toISOString()
      });

      await updateDoc(client1Ref, { assignedProjects: [proj1Id] });
      await updateDoc(client2Ref, { assignedProjects: [proj2Id] });
      await updateDoc(client3Ref, { assignedProjects: [proj3Id] });

      const inv1Ref = doc(collection(db, "invoices"));
      const inv2Ref = doc(collection(db, "invoices"));

      const inv1Id = inv1Ref.id;
      const inv2Id = inv2Ref.id;

      await setDoc(inv1Ref, {
        invoiceNumber: "MM-2026-07-20-001",
        clientId: client1Id,
        projectId: proj1Id,
        invoiceDate: "2026-07-20",
        dueDate: "2026-07-20",
        amount: 15076,
        tax: 1959.88,
        total: 17035.88,
        amountPaid: 17035.88,
        balance: 0,
        status: "Paid",
        paymentMethod: "Bank Transfer",
        receiptUrl: "",
        notes: "Auto-seeded setup invoice."
      });

      await setDoc(inv2Ref, {
        invoiceNumber: "MM-2026-07-25-001",
        clientId: client2Id,
        projectId: proj2Id,
        invoiceDate: "2026-07-25",
        dueDate: "2026-08-10",
        amount: 2500,
        tax: 325,
        total: 2825,
        amountPaid: 0,
        balance: 2825,
        status: "Sent",
        paymentMethod: "Credit Card",
        receiptUrl: "",
        notes: "Half-milestone upfront deposit invoice."
      });

      await addDoc(collection(db, "payments"), {
        invoiceId: inv1Id,
        clientId: client1Id,
        amount: 17035.88,
        dateReceived: "2026-07-20",
        method: "Bank Transfer",
        notes: "Full payment received via corporate bank transfer."
      });

      await addDoc(collection(db, "expenses"), {
        category: "Marketing",
        amount: 450,
        date: "2026-07-15",
        clientId: client2Id,
        projectId: proj2Id,
        notes: "Cinematic trailer ad campaign spend."
      });

      await addDoc(collection(db, "expenses"), {
        category: "Software",
        amount: 120,
        date: "2026-07-10",
        clientId: "",
        projectId: "",
        notes: "Adobe Creative Cloud subscription licenses."
      });

      await addDoc(collection(db, "tasks"), {
        title: "Design Landing Page Figma",
        description: "Create branding UI layout drafts for review.",
        projectId: proj3Id,
        status: "Completed",
        dueDate: "2026-07-18",
        assignedTo: teamId,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, "tasks"), {
        title: "Development coding components",
        description: "Write responsive NextJS template wrappers.",
        projectId: proj1Id,
        status: "Completed",
        dueDate: "2026-07-15",
        assignedTo: teamId,
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, "leads"), {
        name: "Apex Realty",
        contactName: "Sarah Connor",
        email: "sarah@apex.com",
        phone: "+1 555-0188",
        value: 12000,
        status: "proposal",
        notes: "Requires standard video production and rebrand package.",
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, "leads"), {
        name: "Zenith Cafe",
        contactName: "Tom Baker",
        email: "tom@zenith.com",
        phone: "+1 555-0112",
        value: 3500,
        status: "contacted",
        notes: "Wants promotional summer reels.",
        createdAt: new Date().toISOString()
      });

      alert("Database reset and seeded successfully!");
      window.location.reload();
    } catch (err) {
      console.error("Client seeding error:", err);
      alert("Failed to seed database: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const getClientName = (clientId) => {
    const cl = clients.find((c) => c.id === clientId);
    return cl ? cl.businessName : "General/Agency";
  };

  // Guard for Team Members
  if (role === "team") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white min-h-[500px]">
        <div className="w-full max-w-md p-8 border border-sky-100 rounded-3xl shadow-xl text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-sky-600">Access Restricted</h2>
          <p className="text-sm text-sky-400 mt-2">
            This module compiles agency-wide financial reports and is restricted to administrators and managers only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen print:p-0">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Title and Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-sky-600">Financial Reports</h1>
            <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
              Custom date statements and cash flow breakdowns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadExcel}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition shadow flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download Monthly Excel
            </button>
          </div>
        </div>

        {/* Filters Box */}
        <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4 print:hidden bg-white">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Report Parameters
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
            <div>
              <label className="block text-sky-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 border border-sky-100 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sky-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 border border-sky-100 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sky-500 mb-1">Filter Client</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full p-2.5 border border-sky-100 rounded-xl text-sky-600"
              >
                <option value="All">All Clients</option>
                {scopedClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block border-b border-sky-200 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-sky-600">Monk Media Financial Statement</h1>
          <p className="text-xs text-sky-400 font-bold uppercase tracking-widest mt-1">
            Date range: {startDate} to {endDate} • Scoped Client: {selectedClient === "All" ? "All Accounts" : getClientName(selectedClient)}
          </p>
        </div>

        {/* LOADING INDICATOR */}
        {loading ? (
          <div className="flex items-center justify-center py-20 print:hidden">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 border border-sky-100 rounded-3xl bg-white shadow-sm print:shadow-none print:border-sky-200">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Total Invoiced</span>
                <h3 className="text-xl font-bold text-sky-600 mt-1">${totalInvoiced.toLocaleString()}</h3>
                <span className="text-[9px] text-sky-400 block mt-0.5">Base billings issued</span>
              </div>
              <div className="p-5 border border-sky-100 rounded-3xl bg-white shadow-sm print:shadow-none print:border-sky-200">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Total Collected</span>
                <h3 className="text-xl font-bold text-sky-600 mt-1">${totalCollected.toLocaleString()}</h3>
                <span className="text-[9px] text-sky-400 block mt-0.5">Outstanding: ${totalOutstanding.toLocaleString()}</span>
              </div>
              <div className="p-5 border border-sky-100 rounded-3xl bg-white shadow-sm print:shadow-none print:border-sky-200">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Logged Expenses</span>
                <h3 className="text-xl font-bold text-sky-600 mt-1">${totalExpenses.toLocaleString()}</h3>
                <span className="text-[9px] text-sky-400 block mt-0.5">Outflow expenditures</span>
              </div>
              <div className="p-5 border border-sky-100 rounded-3xl bg-white shadow-sm print:shadow-none print:border-sky-200">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Net Revenue Profit</span>
                <h3 className={`text-xl font-bold mt-1 ${netEarnings >= 0 ? "text-sky-600" : "text-red-500"}`}>
                  ${netEarnings.toLocaleString()}
                </h3>
                <span className="text-[9px] text-sky-400 block mt-0.5">Collected cash margin</span>
              </div>
            </div>

            {/* ITEM DETAILS SECTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
              
              {/* Invoices List */}
              <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden print:border-sky-200 print:shadow-none">
                <div className="p-4 bg-sky-50/20 border-b border-sky-100 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-500" />
                  <h3 className="text-xs font-bold text-sky-600 uppercase tracking-wider">Statement Invoices</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead>
                      <tr className="bg-sky-50/10 border-b border-sky-100 text-[9px] font-bold text-sky-500 uppercase">
                        <th className="p-3 px-4">Invoice #</th>
                        <th className="p-3 px-4">Client</th>
                        <th className="p-3 px-4">Date</th>
                        <th className="p-3 px-4 text-center">Status</th>
                        <th className="p-3 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-sky-600 divide-y divide-sky-100">
                      {reportInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-sky-400 italic">
                            No matching invoices.
                          </td>
                        </tr>
                      ) : (
                        reportInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-sky-50/5">
                            <td className="p-3 px-4 font-bold">{inv.invoiceNumber}</td>
                            <td className="p-3 px-4 truncate max-w-[120px]">{getClientName(inv.clientId)}</td>
                            <td className="p-3 px-4">{inv.invoiceDate || inv.dueDate}</td>
                            <td className="p-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                (inv.status || "Due") === "Received" || (inv.status || "Due") === "Paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : (inv.status || "Due") === "Partial"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {inv.status || "Due"}
                              </span>
                            </td>
                            <td className="p-3 px-4 text-right font-bold">${Number(inv.total).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expenses List */}
              <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden print:border-sky-200 print:shadow-none print:mt-6">
                <div className="p-4 bg-sky-50/20 border-b border-sky-100 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-sky-500" />
                  <h3 className="text-xs font-bold text-sky-600 uppercase tracking-wider">Statement Outflows</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead>
                      <tr className="bg-sky-50/10 border-b border-sky-100 text-[9px] font-bold text-sky-500 uppercase">
                        <th className="p-3 px-4">Category</th>
                        <th className="p-3 px-4">Client</th>
                        <th className="p-3 px-4">Date</th>
                        <th className="p-3 px-4">Notes</th>
                        <th className="p-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="text-sky-600 divide-y divide-sky-100">
                      {reportExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-sky-400 italic">
                            No matching expenses.
                          </td>
                        </tr>
                      ) : (
                        reportExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-sky-50/5">
                            <td className="p-3 px-4 font-bold">{exp.category}</td>
                            <td className="p-3 px-4 truncate max-w-[120px]">{getClientName(exp.clientId)}</td>
                            <td className="p-3 px-4">{exp.date}</td>
                            <td className="p-3 px-4 text-sky-400 font-medium truncate max-w-[120px]">{exp.notes || "None"}</td>
                            <td className="p-3 px-4 text-right text-red-500 font-bold">-${Number(exp.amount).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
