"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { ShieldAlert, TrendingUp, TrendingDown, DollarSign, Plus, Check, FileText, FileMinus, X, Printer, Download, Trash2 } from "lucide-react";

export default function FinancePage() {
  const { currentUser, role } = useAuth();
  
  // Data State
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState("invoices"); // invoices, expenses, payments, profit

  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState(null);
  const [isLogInvOpen, setIsLogInvOpen] = useState(false);
  const [isLogExpOpen, setIsLogExpOpen] = useState(false);
  const [isLogPayOpen, setIsLogPayOpen] = useState(false);

  // Generate invoice number automatically in the format MM-YYYY-MM-DD-001
  useEffect(() => {
    if (isLogInvOpen && invoices.length >= 0) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
      const matches = invoices.filter(inv => inv.invoiceNumber && inv.invoiceNumber.startsWith(`MM-${dateStr}-`));
      const nextNum = matches.length + 1;
      const serial = String(nextNum).padStart(3, "0");
      setInvNum(`MM-${dateStr}-${serial}`);
    }
  }, [isLogInvOpen, invoices]);

  // Form Fields
  // Invoice Form
  const [invNum, setInvNum] = useState("");
  const [invClientId, setInvClientId] = useState("");
  const [invProjId, setInvProjId] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDue, setInvDue] = useState("");
  
  // Expense Form
  const [expCategory, setExpCategory] = useState("Marketing");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState("");
  const [expClientId, setExpClientId] = useState("");
  const [expProjId, setExpProjId] = useState("");
  const [expNotes, setExpNotes] = useState("");

  // Payment Form
  const [payInvId, setPayInvId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payNotes, setPayNotes] = useState("");

  useEffect(() => {
    if (!currentUser || role === "team") return;
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

    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setInvoices(list);
    });

    const unsubExpenses = onSnapshot(collection(db, "expenses"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setExpenses(list);
    });

    const unsubPayments = onSnapshot(collection(db, "payments"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setPayments(list);
    });

    setLoading(false);

    return () => {
      unsubClients();
      unsubProjects();
      unsubInvoices();
      unsubExpenses();
      unsubPayments();
    };
  }, [currentUser, role]);

  // Scoped Data Boundary for managers
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

  const scopedPayments = payments.filter((pay) => {
    if (role === "admin") return true;
    // Map payment invoice to client check
    const parentInv = invoices.find((i) => i.id === pay.invoiceId);
    return parentInv && scopedClients.some((c) => c.id === parentInv.clientId);
  });

  // Calculate Metrics
  const todayStr = new Date().toISOString().split("T")[0];

  const totalBilling = scopedInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0);
  const totalReceived = scopedInvoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
  const totalOutstanding = scopedInvoices.reduce((acc, inv) => acc + (Number(inv.balance) || 0), 0);
  const totalExpenses = scopedExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  
  const totalOverdue = scopedInvoices.reduce((acc, inv) => {
    if (inv.status !== "Paid" && inv.dueDate < todayStr) {
      return acc + (Number(inv.balance) || 0);
    }
    return acc;
  }, 0);

  const netProfit = totalReceived - totalExpenses;

  // Add actions
  const handleLogInvoice = async (e) => {
    e.preventDefault();
    if (!invNum || !invClientId || !invAmount) return;

    try {
      const amount = Number(invAmount);
      const parentClient = clients.find((c) => c.id === invClientId);
      const taxRate = parentClient?.financials?.taxRate || 13;
      const tax = Number(((amount * taxRate) / 100).toFixed(2));
      const total = amount + tax;

      const payload = {
        invoiceNumber: invNum,
        clientId: invClientId,
        projectId: invProjId || "",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: invDue || "",
        amount,
        tax,
        total,
        amountPaid: 0,
        balance: total,
        status: "Sent",
        paymentMethod: parentClient?.financials?.paymentMethod || "Credit Card",
        receiptUrl: "",
        notes: "",
      };

      await addDoc(collection(db, "invoices"), payload);
      setInvNum("");
      setInvClientId("");
      setInvProjId("");
      setInvAmount("");
      setInvDue("");
      setIsLogInvOpen(false);
    } catch (err) {
      alert("Error adding invoice: " + err.message);
    }
  };

  const handleLogExpense = async (e) => {
    e.preventDefault();
    if (!expAmount || !expDate) return;

    try {
      const payload = {
        category: expCategory,
        amount: Number(expAmount),
        date: expDate,
        clientId: expClientId || "",
        projectId: expProjId || "",
        notes: expNotes || "",
      };

      await addDoc(collection(db, "expenses"), payload);
      setExpAmount("");
      setExpDate("");
      setExpClientId("");
      setExpProjId("");
      setExpNotes("");
      setIsLogExpOpen(false);
    } catch (err) {
      alert("Error logging expense: " + err.message);
    }
  };

  const handleLogPayment = async (e) => {
    e.preventDefault();
    if (!payInvId || !payAmount) return;

    try {
      const amount = Number(payAmount);
      const targetInvoice = invoices.find((i) => i.id === payInvId);
      if (!targetInvoice) return;

      const nextPaid = (Number(targetInvoice.amountPaid) || 0) + amount;
      const nextBal = Math.max(0, Number(targetInvoice.total) - nextPaid);
      const nextStatus = nextBal <= 0 ? "Paid" : "Sent";

      // 1. Add Payment record
      await addDoc(collection(db, "payments"), {
        invoiceId: payInvId,
        amount,
        dateReceived: new Date().toISOString().split("T")[0],
        method: payMethod,
        notes: payNotes || "",
      });

      // 2. Update parent invoice totals
      await updateDoc(doc(db, "invoices", payInvId), {
        amountPaid: nextPaid,
        balance: nextBal,
        status: nextStatus,
      });

      // 3. Update client total paid
      const clientRef = doc(db, "clients", targetInvoice.clientId);
      const clientDoc = await getDoc(clientRef);
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        const prevPaid = Number(clientData.financials?.totalPaid) || 0;
        await updateDoc(clientRef, {
          "financials.totalPaid": prevPaid + amount,
          "financials.lastPaymentDate": new Date().toISOString().split("T")[0],
        });
      }

      setPayInvId("");
      setPayAmount("");
      setPayNotes("");
      setIsLogPayOpen(false);
    } catch (err) {
      alert("Error processing payment: " + err.message);
    }
  };

  const getClientName = (clientId) => {
    const cl = clients.find((c) => c.id === clientId);
    return cl ? cl.businessName : "General";
  };

  const getClientObj = (clientId) => {
    return clients.find((c) => c.id === clientId) || null;
  };

  const formatDateFriendly = (dateStr) => {
    if (!dateStr) return "";
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', options);
    } catch (e) {
      return dateStr;
    }
  };

  const handleDownloadPDF = async (inv) => {
    const client = getClientObj(inv.clientId);
    const isPaid = inv.status === "Paid";
    const subtotal = Number(inv.amount) || 0;
    const tax = Number(inv.tax) || 0;
    const total = Number(inv.total) || 0;

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.width = "750px";
    container.style.backgroundColor = "#ffffff";
    container.style.color = "#1f2937";
    container.style.fontFamily = "sans-serif";
    container.style.padding = "40px";
    
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 30px; font-family: sans-serif;">
        <!-- Header -->
        <div style="background-color: #0e2430; color: #ffffff; padding: 30px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
          <!-- Logo -->
          <div>
            <img src="/logonew.png" alt="Monk Media Logo" style="height: 50px; width: auto; object-fit: contain;" />
          </div>
          <!-- Title & Meta -->
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; color: #348eab; font-weight: 900;">
              ${isPaid ? "Paid Invoice" : "Invoice"}
            </h2>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #d1d5db;">Invoice #: <strong>${inv.invoiceNumber}</strong></p>
            <p style="margin: 3px 0 0 0; font-size: 12px; color: #d1d5db;">Invoice Date: <strong>${formatDateFriendly(inv.invoiceDate)}</strong></p>
            <div style="margin-top: 10px;">
              <span style="background-color: ${isPaid ? "#16a34a" : "#eab308"}; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase;">
                ${isPaid ? "Paid In Full" : "Payment Pending"}
              </span>
            </div>
          </div>
        </div>

        <!-- Sender / Receiver Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-bottom: 1px solid #f3f4f6; padding-bottom: 20px; font-size: 13px;">
          <!-- From -->
          <div>
            <h4 style="margin: 0 0 8px 0; color: #348eab; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #e0f2fe; padding-bottom: 4px;">From</h4>
            <p style="margin: 0; font-weight: 700; color: #111827;">14689941 Canada Inc.</p>
            <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 11px;">Operating as Monk Media</p>
            <p style="margin: 2px 0 0 0; color: #4b5563; font-size: 11px;">Email: info@monkmedia.ca</p>
            <p style="margin: 2px 0 0 0; color: #4b5563; font-size: 11px;">CRA Business Number: 777790411</p>
            <p style="margin: 2px 0 0 0; color: #4b5563; font-size: 11px;">HST Registration No.: 777790411 RT 0001</p>
          </div>
          <!-- Bill To -->
          <div>
            <h4 style="margin: 0 0 8px 0; color: #348eab; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #e0f2fe; padding-bottom: 4px;">Bill To</h4>
            <p style="margin: 0; font-weight: 700; color: #111827;">${client ? client.businessName : "Client Business Name"}</p>
            <p style="margin: 4px 0 0 0; color: #4b5563; font-size: 11px;">Attention: ${client ? client.onboardingContactName || "Tejinder Singh" : "Tejinder Singh"}</p>
            <p style="margin: 2px 0 0 0; color: #4b5563; font-size: 11px;">Email: ${client ? client.email : "client@email.com"}</p>
          </div>
        </div>

        <!-- Summary Tri-Bar -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #e0f2fe; text-align: center; font-size: 12px; border-radius: 12px; background-color: #f0f9ff; padding: 15px;">
          <div>
            <p style="margin: 0; color: #348eab; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">Payment Status</p>
            <p style="margin: 4px 0 0 0; font-weight: 900; color: ${isPaid ? "#16a34a" : "#d97706"}; text-transform: uppercase;">${isPaid ? "Paid" : "Pending"}</p>
          </div>
          <div style="border-left: 1px solid #bae6fd; border-right: 1px solid #bae6fd;">
            <p style="margin: 0; color: #348eab; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">${isPaid ? "Payment Date" : "Due Date"}</p>
            <p style="margin: 4px 0 0 0; font-weight: 700; color: #111827;">${formatDateFriendly(isPaid ? inv.invoiceDate : inv.dueDate)}</p>
          </div>
          <div>
            <p style="margin: 0; color: #348eab; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">Amount Paid</p>
            <p style="margin: 4px 0 0 0; font-weight: 900; color: #111827;">$${Number(inv.amountPaid || 0).toLocaleString()} CAD</p>
          </div>
        </div>

        <!-- Items Table -->
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="background-color: #0e2430; color: #ffffff; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 12px 15px; font-weight: 700;">Description</th>
                <th style="padding: 12px 15px; text-align: right; font-weight: 700;">Amount (CAD)</th>
              </tr>
            </thead>
            <tbody style="color: #374151;">
              <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">Software and App Development</td>
                <td style="padding: 15px; text-align: right; font-weight: 700; border-bottom: 1px solid #e5e7eb;">$${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Calculations -->
        <div style="display: flex; flex-direction: column; align-items: flex-end; font-size: 13px; font-weight: 700; gap: 8px; padding-right: 15px;">
          <div style="display: flex; justify-content: space-between; width: 220px; color: #6b7280;">
            <span>Subtotal</span>
            <span>$${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          <div style="display: flex; justify-content: space-between; width: 220px; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
            <span>HST (13%)</span>
            <span>$${tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
          <div style="display: flex; justify-content: space-between; width: 220px; color: #16a34a; font-size: 16px; font-weight: 900;">
            <span>TOTAL PAID</span>
            <span>$${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          </div>
        </div>

        <!-- Paid full confirmation banner -->
        ${isPaid ? `
          <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 15px; border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
            <div style="background-color: #dcfce7; color: #16a34a; font-weight: bold; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; margin-top: 1px;">✓</div>
            <div>
              <h5 style="margin: 0; font-size: 12px; color: #166534; font-weight: 700;">PAYMENT RECEIVED IN FULL</h5>
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #15803d; line-height: 1.4;">
                This receipt confirms full payment of $${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD for the services listed above.
              </p>
            </div>
          </div>
        ` : ''}

        <!-- Footer -->
        <div style="border-top: 1px solid #f3f4f6; padding-top: 15px; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; font-weight: 600;">
          <span>Thank you for choosing Monk Media.</span>
          <span>info@monkmedia.ca</span>
        </div>
        <p style="margin: 5px 0 0 0; text-align: center; font-size: 9px; color: #9ca3af; font-weight: 600;">
          14689941 Canada Inc. operating as Monk Media
        </p>
      </div>
    `;

    document.body.appendChild(container);

    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Invoice-${inv.invoiceNumber}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().from(container).set(opt).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF: " + err.message);
    } finally {
      document.body.removeChild(container);
    }
  };

  // Auth Guards Block
  if (role === "team") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white min-h-[500px]">
        <div className="w-full max-w-md p-8 border border-sky-100 rounded-3xl shadow-xl text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-sky-600">Access Restricted</h2>
          <p className="text-sm text-sky-400 mt-2">
            This module contains confidential billing files and is restricted to administrators and managers only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-sky-600">Financial Control</h1>
            <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
              Billing Ledger, Payments Received & Agency Outflow
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsLogInvOpen(true)}
              className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition shadow"
            >
              Issue Invoice
            </button>
            <button
              onClick={() => setIsLogExpOpen(true)}
              className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl text-xs font-bold border border-sky-100 transition"
            >
              Log Expense
            </button>
            <button
              onClick={() => setIsLogPayOpen(true)}
              className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl text-xs font-bold border border-sky-100 transition"
            >
              Process Payment
            </button>
          </div>
        </div>

        {/* FINANCIAL MARGINS SUMMARY CARD PANEL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Total Billed</p>
            <h3 className="text-2xl font-bold text-sky-600 mt-1">${totalBilling.toLocaleString()}</h3>
            <p className="text-[10px] text-sky-400 mt-0.5 font-semibold">Outstanding: ${totalOutstanding.toLocaleString()}</p>
          </div>
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Revenue Received</p>
            <h3 className="text-2xl font-bold text-sky-600 mt-1">${totalReceived.toLocaleString()}</h3>
            <p className="text-[10px] text-sky-400 mt-0.5 font-semibold">Processed billing totals</p>
          </div>
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Total Outflow</p>
            <h3 className="text-2xl font-bold text-sky-600 mt-1">${totalExpenses.toLocaleString()}</h3>
            <p className="text-[10px] text-sky-400 mt-0.5 font-semibold">Logged agency expenses</p>
          </div>
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Net Cash Flow</p>
            <h3 className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-sky-600" : "text-red-500"}`}>
              ${netProfit.toLocaleString()}
            </h3>
            {totalOverdue > 0 ? (
              <p className="text-[10px] text-red-500 mt-0.5 font-bold flex items-center gap-1">
                ${totalOverdue.toLocaleString()} overdue
              </p>
            ) : (
              <p className="text-[10px] text-sky-400 mt-0.5 font-semibold">Net collected margin</p>
            )}
          </div>
        </div>

        {/* Tab selection */}
        <div className="border-b border-sky-100 overflow-x-auto flex gap-2">
          {[
            { id: "invoices", label: "Invoices Ledger", icon: FileText },
            { id: "expenses", label: "Agency Expenses", icon: TrendingDown },
            { id: "payments", label: "Payments Log", icon: DollarSign },
            { id: "profit", label: "Profit Statement", icon: TrendingUp },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-sky-400 hover:text-sky-500"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl min-h-[300px]">
            
            {/* SUB-TAB 1: INVOICES */}
            {activeTab === "invoices" && (
              <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-sky-50/20 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                      <th className="p-4 px-6">Invoice #</th>
                      <th className="p-4 px-6">Client Name</th>
                      <th className="p-4 px-6">Due Date</th>
                      <th className="p-4 px-6 text-center">Status</th>
                      <th className="p-4 px-6 text-right">Balance</th>
                      <th className="p-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                    {scopedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sky-400 font-medium">
                          No logged invoices found.
                        </td>
                      </tr>
                    ) : (
                      scopedInvoices.map((inv) => {
                        const isOverdue = inv.status !== "Paid" && inv.dueDate < todayStr;
                        return (
                          <tr key={inv.id} className="hover:bg-sky-50/10">
                            <td className="p-4 px-6 font-bold">{inv.invoiceNumber}</td>
                            <td className="p-4 px-6">{getClientName(inv.clientId)}</td>
                            <td className={`p-4 px-6 ${isOverdue ? "text-red-500 font-bold" : ""}`}>
                              {inv.dueDate}
                            </td>
                            <td className="p-4 px-6 text-center">
                              <select
                                value={inv.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  const updatePayload = { status: newStatus };
                                  if (newStatus === "Paid") {
                                    updatePayload.amountPaid = inv.total;
                                    updatePayload.balance = 0;
                                  } else if (inv.status === "Paid" && newStatus !== "Paid") {
                                    updatePayload.amountPaid = 0;
                                    updatePayload.balance = inv.total;
                                  }
                                  try {
                                    await updateDoc(doc(db, "invoices", inv.id), updatePayload);
                                  } catch (err) {
                                    alert("Error updating status: " + err.message);
                                  }
                                }}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded border cursor-pointer outline-none transition-all shadow-sm text-center ${
                                  inv.status === "Paid"
                                    ? "bg-emerald-500 border-emerald-600 text-white"
                                    : isOverdue || inv.status === "Overdue"
                                    ? "bg-red-600 border-red-700 text-white animate-pulse"
                                    : inv.status === "Draft"
                                    ? "bg-slate-400 border-slate-500 text-white"
                                    : "bg-sky-500 border-sky-600 text-white"
                                }`}
                              >
                                <option value="Sent">Sent</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Draft">Draft</option>
                              </select>
                            </td>
                            <td className="p-4 px-6 text-right font-bold">${Number(inv.balance).toLocaleString()}</td>
                            <td className="p-4 px-6 text-right flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDownloadPDF(inv)}
                                className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded border border-green-200 transition"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setSelectedInvoiceForPrint(inv)}
                                className="p-1 text-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded border border-sky-100 transition"
                                title="Print / Share Invoice"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {inv.status !== "Paid" && (
                                <button
                                  onClick={async () => {
                                    await updateDoc(doc(db, "invoices", inv.id), {
                                      status: "Paid",
                                      amountPaid: inv.total,
                                      balance: 0,
                                    });
                                  }}
                                  className="px-2 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-[10px] font-bold transition shadow"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {role === "admin" && (
                                <button
                                  onClick={async () => {
                                    if (confirm("Are you sure you want to delete this invoice?")) {
                                      try {
                                        await deleteDoc(doc(db, "invoices", inv.id));
                                        alert("Invoice deleted successfully!");
                                      } catch (err) {
                                        alert("Error: " + err.message);
                                      }
                                    }
                                  }}
                                  className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded border border-red-200 transition"
                                  title="Delete Invoice"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-TAB 2: EXPENSES */}
            {activeTab === "expenses" && (
              <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-sky-50/20 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                      <th className="p-4 px-6">Category</th>
                      <th className="p-4 px-6">Logged Date</th>
                      <th className="p-4 px-6">For Client</th>
                      <th className="p-4 px-6">Notes</th>
                      <th className="p-4 px-6 text-right">Amount</th>
                      <th className="p-4 px-6 text-right w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                    {scopedExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sky-400 font-medium">
                          No logged outflow items found.
                        </td>
                      </tr>
                    ) : (
                      scopedExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-sky-50/10">
                          <td className="p-4 px-6 font-bold">{exp.category}</td>
                          <td className="p-4 px-6">{exp.date}</td>
                          <td className="p-4 px-6">{getClientName(exp.clientId)}</td>
                          <td className="p-4 px-6 text-sky-400 font-medium">{exp.notes || "None"}</td>
                          <td className="p-4 px-6 text-right text-red-500 font-bold">-${Number(exp.amount).toLocaleString()}</td>
                          <td className="p-4 px-6 text-right">
                            {role === "admin" && (
                              <button
                                onClick={async () => {
                                  if (confirm("Are you sure you want to delete this expense?")) {
                                    try {
                                      await deleteDoc(doc(db, "expenses", exp.id));
                                      alert("Expense deleted successfully!");
                                    } catch (err) {
                                      alert("Error: " + err.message);
                                    }
                                  }
                                }}
                                className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded border border-red-200 transition inline-block"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-TAB 3: PAYMENTS */}
            {activeTab === "payments" && (
              <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-sky-50/20 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                      <th className="p-4 px-6">Invoice ID</th>
                      <th className="p-4 px-6">Date Received</th>
                      <th className="p-4 px-6">Payment Method</th>
                      <th className="p-4 px-6">Notes</th>
                      <th className="p-4 px-6 text-right">Processed Value</th>
                      <th className="p-4 px-6 text-right w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                    {scopedPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sky-400 font-medium">
                          No payments processed yet.
                        </td>
                      </tr>
                    ) : (
                      scopedPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-sky-50/10">
                          <td className="p-4 px-6 font-bold">Ref ID: {pay.invoiceId.substring(0, 8)}...</td>
                          <td className="p-4 px-6">{pay.dateReceived}</td>
                          <td className="p-4 px-6 capitalize">{pay.method}</td>
                          <td className="p-4 px-6 text-sky-400 font-medium">{pay.notes || "None"}</td>
                          <td className="p-4 px-6 text-right text-sky-600 font-bold">+${Number(pay.amount).toLocaleString()}</td>
                          <td className="p-4 px-6 text-right">
                            {role === "admin" && (
                              <button
                                onClick={async () => {
                                  if (confirm("Are you sure you want to delete this payment record?")) {
                                    try {
                                      await deleteDoc(doc(db, "payments", pay.id));
                                      alert("Payment record deleted successfully!");
                                    } catch (err) {
                                      alert("Error: " + err.message);
                                    }
                                  }
                                }}
                                className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded border border-red-200 transition inline-block"
                                title="Delete Payment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUB-TAB 4: PROFIT STATEMENT */}
            {activeTab === "profit" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-sky-100 rounded-3xl shadow-xl">
                <div>
                  <h3 className="text-sm font-bold text-sky-600 mb-4 pb-1 border-b border-sky-50">Earnings breakdown</h3>
                  <div className="space-y-3.5 text-xs text-sky-600 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-sky-400 font-bold uppercase">Total Billings Issued</span>
                      <span>${totalBilling.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-400 font-bold uppercase">Total Cash Inflow Collected</span>
                      <span className="text-sky-500 font-bold">${totalReceived.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-sky-100 pt-3">
                      <span className="text-sky-400 font-bold uppercase">Client Outstanding Balances</span>
                      <span>${totalOutstanding.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-sky-600 mb-4 pb-1 border-b border-sky-50">Profit summary</h3>
                  <div className="space-y-3.5 text-xs text-sky-600 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-sky-400 font-bold uppercase">Collected Cash</span>
                      <span>${totalReceived.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-400 font-bold uppercase">Logged Expenditures</span>
                      <span className="text-red-500 font-bold">-${totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-sky-100 pt-3 text-sm">
                      <span className="text-sky-600 font-bold uppercase">Net Profits Margin</span>
                      <span className={`font-bold ${netProfit >= 0 ? "text-sky-600" : "text-red-500"}`}>
                        ${netProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* LOG INVOICE DIALOG */}
        {isLogInvOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setIsLogInvOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                  <h2 className="text-xl font-bold text-sky-600">Issue Client Invoice</h2>
                  <button onClick={() => setIsLogInvOpen(false)} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleLogInvoice} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs font-semibold">
                  <div>
                    <label className="block text-sky-500 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      required
                      value={invNum}
                      onChange={(e) => setInvNum(e.target.value)}
                      placeholder="e.g. MM-INV-1002"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Client Business</label>
                    <select
                      value={invClientId}
                      required
                      onChange={(e) => setInvClientId(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    >
                      <option value="">Choose a Client...</option>
                      {scopedClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Base Billing Value ($)</label>
                    <input
                      type="number"
                      required
                      value={invAmount}
                      onChange={(e) => setInvAmount(e.target.value)}
                      placeholder="e.g. 2000"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={invDue}
                      onChange={(e) => setInvDue(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div className="pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLogInvOpen(false)}
                      className="px-4 py-2 border border-sky-100 text-sky-500 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-500 text-white rounded-xl font-bold"
                    >
                      Create Invoice
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* LOG EXPENSE DIALOG */}
        {isLogExpOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setIsLogExpOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                  <h2 className="text-xl font-bold text-sky-600">Log Agency Outflow</h2>
                  <button onClick={() => setIsLogExpOpen(false)} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleLogExpense} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs font-semibold">
                  <div>
                    <label className="block text-sky-500 mb-1">Category</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    >
                      <option value="Shoot Overhead">Shoot Overhead</option>
                      <option value="Marketing">Marketing / Ad spend</option>
                      <option value="Contractor payout">Contractor payout</option>
                      <option value="Tools / Subscriptions">Tools & Subs</option>
                      <option value="Office overhead">Office & Rentals</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Outflow Value ($)</label>
                    <input
                      type="number"
                      required
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Date Logged</label>
                    <input
                      type="date"
                      required
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">For Client Scopes</label>
                    <select
                      value={expClientId}
                      onChange={(e) => setExpClientId(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    >
                      <option value="">No Client (Agency general)</option>
                      {scopedClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Expenditure Details</label>
                    <textarea
                      rows={3}
                      value={expNotes}
                      onChange={(e) => setExpNotes(e.target.value)}
                      placeholder="e.g. paid local studio booking fees"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div className="pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLogExpOpen(false)}
                      className="px-4 py-2 border border-sky-100 text-sky-500 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-500 text-white rounded-xl font-bold"
                    >
                      Save Expense
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* LOG PAYMENT DIALOG */}
        {isLogPayOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setIsLogPayOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                  <h2 className="text-xl font-bold text-sky-600">Log Processing Payment</h2>
                  <button onClick={() => setIsLogPayOpen(false)} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleLogPayment} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs font-semibold">
                  <div>
                    <label className="block text-sky-500 mb-1">Target Invoice</label>
                    <select
                      value={payInvId}
                      required
                      onChange={(e) => setPayInvId(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    >
                      <option value="">Select Invoice...</option>
                      {scopedInvoices
                        .filter((i) => i.status !== "Paid")
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            Inv #{i.invoiceNumber} - Bal: ${i.balance} ({getClientName(i.clientId)})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Processing Amount ($)</label>
                    <input
                      type="number"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Payment Method</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    >
                      <option value="Bank Transfer">Direct Bank Transfer</option>
                      <option value="Credit Card">Credit Card portal</option>
                      <option value="Stripe">Stripe Checkout</option>
                      <option value="Cheque">Corporate Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Processing Notes</label>
                    <textarea
                      rows={3}
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="e.g. received via wire transfer ref no..."
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div className="pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLogPayOpen(false)}
                      className="px-4 py-2 border border-sky-100 text-sky-500 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-500 text-white rounded-xl font-bold"
                    >
                      Save Payment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* HIGH-FIDELITY PRINTABLE INVOICE MODAL */}
        {selectedInvoiceForPrint && (() => {
          const inv = selectedInvoiceForPrint;
          const client = getClientObj(inv.clientId);
          const isPaid = inv.status === "Paid";
          const subtotal = Number(inv.amount) || 0;
          const tax = Number(inv.tax) || 0;
          const total = Number(inv.total) || 0;
          
          return (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-sky-950/40 backdrop-blur-sm no-print">
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  .print-modal-container {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    z-index: 9999 !important;
                    transform: none !important;
                  }
                }
              `}} />
              
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden print-modal-container flex flex-col border border-sky-100">
                {/* Modal Actions Header (Hidden in print) */}
                <div className="p-4 bg-sky-50/50 border-b border-sky-100 flex items-center justify-between no-print">
                  <h3 className="text-sm font-bold text-sky-600 uppercase tracking-wider">Share / Export Invoice</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print / Export PDF
                    </button>
                    <button
                      onClick={() => setSelectedInvoiceForPrint(null)}
                      className="p-1.5 text-sky-400 hover:text-sky-500 border border-sky-100 rounded-xl"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* High Fidelity Invoice Content */}
                <div className="p-8 sm:p-12 flex-1 space-y-8 bg-white text-gray-800">
                  {/* Visual Header Block */}
                  <div className="bg-[#0e2430] text-white p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-2">
                      <img src="/logonew.png" alt="Monk Media Logo" className="h-12 w-auto object-contain brightness-0 invert" />
                    </div>
                    {/* Title & Metadata */}
                    <div className="text-right sm:text-right flex flex-col items-end gap-1.5">
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-sky-400">
                        {isPaid ? "Paid Invoice" : "Invoice"}
                      </h2>
                      <p className="text-xs text-gray-300 font-semibold">
                        Invoice #: <span className="font-bold text-white">{inv.invoiceNumber}</span>
                      </p>
                      <p className="text-xs text-gray-300 font-semibold">
                        Invoice Date: <span className="font-bold text-white">{formatDateFriendly(inv.invoiceDate)}</span>
                      </p>
                      <div className="mt-2">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                          isPaid ? "bg-green-600 text-white" : "bg-yellow-500 text-white"
                        }`}>
                          {isPaid ? "Paid In Full" : "Payment Pending"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sender vs Recipient */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-100 pb-6 text-sm">
                    {/* Sender Details */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-sky-600 uppercase tracking-wider border-b border-sky-100 pb-1.5">From</h4>
                      <p className="font-bold text-gray-900">14689941 Canada Inc.</p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">Operating as Monk Media</p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">Email: info@monkmedia.ca</p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">CRA Business Number: 777790411</p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">HST Registration No.: 777790411 RT 0001</p>
                    </div>
                    {/* Recipient Details */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-sky-600 uppercase tracking-wider border-b border-sky-100 pb-1.5">Bill To</h4>
                      <p className="font-bold text-gray-900">{client ? client.businessName : "Client Business Name"}</p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">
                        Attention: {client ? client.onboardingContactName || "Tejinder Singh" : "Tejinder Singh"}
                      </p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">
                        Email: {client ? client.email : "client@email.com"}
                      </p>
                    </div>
                  </div>

                  {/* Tri-Card Summary */}
                  <div className="grid grid-cols-3 gap-4 bg-sky-50/30 p-4 rounded-2xl border border-sky-50 text-center">
                    <div className="space-y-1">
                      <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">Payment Status</p>
                      <p className={`text-sm font-black uppercase ${isPaid ? "text-green-600" : "text-yellow-600"}`}>
                        {isPaid ? "Paid" : "Pending"}
                      </p>
                    </div>
                    <div className="space-y-1 border-x border-sky-100/70">
                      <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">
                        {isPaid ? "Payment Date" : "Due Date"}
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatDateFriendly(isPaid ? inv.invoiceDate : inv.dueDate)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">Amount Paid</p>
                      <p className="text-sm font-black text-gray-900">
                        ${Number(inv.amountPaid || 0).toLocaleString()} CAD
                      </p>
                    </div>
                  </div>

                  {/* Line Item List */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-[#0e2430] text-white text-xs uppercase font-bold">
                          <th className="p-4">Description</th>
                          <th className="p-4 text-right">Amount (CAD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                        <tr>
                          <td className="p-4 text-gray-900 font-medium">Software and App Development</td>
                          <td className="p-4 text-right">${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Breakdown Calculation */}
                  <div className="flex flex-col items-end space-y-2 text-sm font-bold pr-4">
                    <div className="flex gap-16 justify-between w-64 text-gray-500">
                      <span>Subtotal</span>
                      <span>${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex gap-16 justify-between w-64 text-gray-500 border-b border-gray-100 pb-2">
                      <span>HST (13%)</span>
                      <span>${tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex gap-16 justify-between w-64 text-green-600 text-lg font-black pt-1">
                      <span>TOTAL PAID</span>
                      <span>${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>

                  {/* Green Confirmation Pill if Paid */}
                  {isPaid && (
                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5 bg-green-100 rounded-full p-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-green-700">PAYMENT RECEIVED IN FULL</h5>
                        <p className="text-[11px] text-green-600 font-semibold mt-0.5">
                          This receipt confirms full payment of ${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD for the services listed above.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex justify-between border-t border-gray-100 pt-6 text-[10px] text-gray-400 font-semibold">
                    <span>Thank you for choosing Monk Media.</span>
                    <span>info@monkmedia.ca</span>
                  </div>
                  <p className="text-[9px] text-gray-400 text-center font-medium mt-4">
                    14689941 Canada Inc. operating as Monk Media
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
