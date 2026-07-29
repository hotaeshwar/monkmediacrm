"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { ShieldAlert, TrendingUp, TrendingDown, DollarSign, Plus, Check, FileText, FileMinus, X, Printer, Download, Trash2, Edit2 } from "lucide-react";

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
  const [invIncludeHST, setInvIncludeHST] = useState(false);
  const [invDescription, setInvDescription] = useState("Software and App Development");
  const [invClientName, setInvClientName] = useState("");
  const [invClientAttention, setInvClientAttention] = useState("");
  const [invClientEmail, setInvClientEmail] = useState("");
  const [invCraNumber, setInvCraNumber] = useState("");
  const [invHstNumber, setInvHstNumber] = useState("");
  const [invFromCompany, setInvFromCompany] = useState("14689941 Canada Inc.");
  const [invFromBrand, setInvFromBrand] = useState("Operating as Monk Media");
  const [invFromEmail, setInvFromEmail] = useState("info@monkmedia.ca");

  // Edit Invoice Form States
  const [isEditInvOpen, setIsEditInvOpen] = useState(false);
  const [editInvId, setEditInvId] = useState("");
  const [editInvNum, setEditInvNum] = useState("");
  const [editInvAmount, setEditInvAmount] = useState("");
  const [editInvTax, setEditInvTax] = useState("");
  const [editInvDue, setEditInvDue] = useState("");
  const [editInvDescription, setEditInvDescription] = useState("");
  const [editInvClientName, setEditInvClientName] = useState("");
  const [editInvClientAttention, setEditInvClientAttention] = useState("");
  const [editInvClientEmail, setEditInvClientEmail] = useState("");
  const [editInvCraNumber, setEditInvCraNumber] = useState("");
  const [editInvHstNumber, setEditInvHstNumber] = useState("");
  const [editInvFromCompany, setEditInvFromCompany] = useState("");
  const [editInvFromBrand, setEditInvFromBrand] = useState("");
  const [editInvFromEmail, setEditInvFromEmail] = useState("");
  
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

  // Load html2pdf and jsPDF from CDNs to prevent dynamic bundle loading and HMR hash mismatches
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("html2pdf-cdn")) {
      const script = document.createElement("script");
      script.id = "html2pdf-cdn";
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.async = true;
      document.body.appendChild(script);
    }

    if (!document.getElementById("jspdf-cdn")) {
      const script = document.createElement("script");
      script.id = "jspdf-cdn";
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Auto-populate custom client fields when selecting a client from dropdown
  useEffect(() => {
    if (!invClientId) {
      setInvClientName("");
      setInvClientAttention("");
      setInvClientEmail("");
      return;
    }
    const client = clients.find((c) => c.id === invClientId);
    if (client) {
      setInvClientName(client.businessName || "");
      setInvClientAttention(client.onboardingContactName || "Tejinder Singh");
      setInvClientEmail(client.email || "");
    }
  }, [invClientId, clients]);

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
    if (inv.status !== "Received" && inv.status !== "Paid" && inv.dueDate < todayStr) {
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
      const taxRate = invIncludeHST ? (parentClient?.financials?.taxRate || 13) : 0;
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
        status: "Due",
        paymentMethod: parentClient?.financials?.paymentMethod || "Credit Card",
        receiptUrl: "",
        notes: "",
        description: invDescription || "Software and App Development",
        clientName: invClientName,
        clientAttention: invClientAttention,
        clientEmail: invClientEmail,
        craNumber: invCraNumber || "",
        hstNumber: invHstNumber || "",
        fromCompanyName: invFromCompany || "14689941 Canada Inc.",
        fromBrandName: invFromBrand || "Operating as Monk Media",
        fromEmail: invFromEmail || "info@monkmedia.ca",
      };

      await addDoc(collection(db, "invoices"), payload);
      setInvNum("");
      setInvClientId("");
      setInvProjId("");
      setInvAmount("");
      setInvDue("");
      setInvIncludeHST(false);
      setInvDescription("Software and App Development");
      setInvClientName("");
      setInvClientAttention("");
      setInvClientEmail("");
      setInvCraNumber("");
      setInvHstNumber("");
      setInvFromCompany("14689941 Canada Inc.");
      setInvFromBrand("Operating as Monk Media");
      setInvFromEmail("info@monkmedia.ca");
      setIsLogInvOpen(false);
    } catch (err) {
      alert("Error adding invoice: " + err.message);
    }
  };

  const handleStartEditInvoice = (inv) => {
    const cl = getClientObj(inv.clientId);
    setEditInvId(inv.id);
    setEditInvNum(inv.invoiceNumber || "");
    setEditInvAmount(inv.amount || "");
    setEditInvTax(inv.tax || 0);
    setEditInvDue(inv.dueDate || "");
    setEditInvDescription(inv.description || "Software and App Development");
    setEditInvClientName(inv.clientName || cl?.businessName || "");
    setEditInvClientAttention(inv.clientAttention || cl?.onboardingContactName || "Tejinder Singh");
    setEditInvClientEmail(inv.clientEmail || cl?.email || "");
    setEditInvCraNumber(inv.craNumber || "");
    setEditInvHstNumber(inv.hstNumber || "");
    setEditInvFromCompany(inv.fromCompanyName || "14689941 Canada Inc.");
    setEditInvFromBrand(inv.fromBrandName || "Operating as Monk Media");
    setEditInvFromEmail(inv.fromEmail || "info@monkmedia.ca");
    setIsEditInvOpen(true);
  };

  const handleUpdateInvoice = async (e) => {
    e.preventDefault();
    if (!editInvId || !editInvNum || !editInvAmount) return;

    try {
      const amount = Number(editInvAmount);
      const tax = Number(editInvTax) || 0;
      const total = amount + tax;
      
      const targetInvoice = invoices.find((i) => i.id === editInvId);
      const amountPaid = Number(targetInvoice?.amountPaid) || 0;
      const balance = Math.max(0, total - amountPaid);

      const updatePayload = {
        invoiceNumber: editInvNum,
        amount,
        tax,
        total,
        balance,
        dueDate: editInvDue || "",
        description: editInvDescription || "Software and App Development",
        clientName: editInvClientName,
        clientAttention: editInvClientAttention,
        clientEmail: editInvClientEmail,
        craNumber: editInvCraNumber || "",
        hstNumber: editInvHstNumber || "",
        fromCompanyName: editInvFromCompany || "14689941 Canada Inc.",
        fromBrandName: editInvFromBrand || "Operating as Monk Media",
        fromEmail: editInvFromEmail || "info@monkmedia.ca",
      };

      await updateDoc(doc(db, "invoices", editInvId), updatePayload);
      setIsEditInvOpen(false);
      alert("Invoice updated successfully!");
    } catch (err) {
      alert("Error updating invoice: " + err.message);
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
      const nextStatus = nextBal <= 0 ? "Received" : nextPaid > 0 ? "Partial" : "Due";

      // 1. Add Payment record
      await addDoc(collection(db, "payments"), {
        invoiceId: payInvId,
        clientId: targetInvoice.clientId,
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
    const statusStr = (inv.status || "Due").trim().toLowerCase();
    const isPaid = statusStr === "received" || statusStr === "paid";
    const isPartial = statusStr === "partial";
    const subtotal = Number(inv.amount) || 0;
    const tax = Number(inv.tax) || 0;
    const total = Number(inv.total) || 0;

    // Load logo as Base64 in memory using browser Image canvas resolution
    const loadLogo = () => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
        img.src = "/logonew.png";
      });
    };
    const logoBase64 = await loadLogo();

    try {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error("The PDF generation library is still loading from the CDN. Please try again in 2 seconds.");
      }
      const { jsPDF } = window.jspdf;
      const pdfDoc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = pdfDoc.internal.pageSize.getWidth();
      const pageHeight = pdfDoc.internal.pageSize.getHeight();
      const leftMargin = 15;
      const rightMargin = 15;
      const contentWidth = pageWidth - leftMargin - rightMargin; // 180mm
      let yPos = 15;

      // Header Banner (Navy blue background)
      pdfDoc.setFillColor(11, 34, 47); // #0b222f
      pdfDoc.rect(leftMargin, yPos, contentWidth, 36, "F");

      // Accent Line (Cyan color border line)
      pdfDoc.setFillColor(52, 142, 171); // #348eab
      pdfDoc.rect(leftMargin, yPos + 36, contentWidth, 1.5, "F");

      // Logo Image on Left
      if (logoBase64) {
        try {
          pdfDoc.addImage(logoBase64, "PNG", leftMargin + 6, yPos + 4, 48, 28);
        } catch (imgError) {
          console.error("Error adding logo image to PDF:", imgError);
        }
      } else {
        pdfDoc.setTextColor(255, 255, 255);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(22);
        pdfDoc.text("MONK MEDIA", leftMargin + 10, yPos + 22);
      }

      // Title & Metadata on Right
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(16);
      pdfDoc.text(isPaid ? "PAID INVOICE" : isPartial ? "PARTIAL INVOICE" : "INVOICE", leftMargin + contentWidth - 8, yPos + 11, { align: "right" });

      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(8.5);
      pdfDoc.setTextColor(229, 231, 235);
      pdfDoc.text(`Invoice # ${inv.invoiceNumber}`, leftMargin + contentWidth - 8, yPos + 17, { align: "right" });
      pdfDoc.text(`Invoice Date: ${formatDateFriendly(inv.invoiceDate)}`, leftMargin + contentWidth - 8, yPos + 22, { align: "right" });

      // Status Badge (Received = Green, Partial = Blue, Due = Orange)
      let badgeColor = [245, 158, 11];
      let badgeText = "DUE";
      if (isPaid) {
        badgeColor = [22, 163, 74];
        badgeText = "RECEIVED";
      } else if (isPartial) {
        badgeColor = [14, 165, 233];
        badgeText = "PARTIAL";
      }

      pdfDoc.setFillColor(...badgeColor);
      pdfDoc.roundedRect(leftMargin + contentWidth - 38, yPos + 25.5, 30, 5.5, 1.5, 1.5, "F");
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(7);
      pdfDoc.text(badgeText, leftMargin + contentWidth - 23, yPos + 29.3, { align: "center" });

      yPos += 50;

      // Sender and Recipient Columns
      pdfDoc.setTextColor(52, 142, 171); // #348eab
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(9);
      pdfDoc.text("FROM", leftMargin, yPos);
      pdfDoc.text("BILL TO", leftMargin + 95, yPos);

      // Section underline
      pdfDoc.setDrawColor(229, 231, 235); // #e5e7eb
      pdfDoc.setLineWidth(0.5);
      pdfDoc.line(leftMargin, yPos + 2, leftMargin + 85, yPos + 2);
      pdfDoc.line(leftMargin + 95, yPos + 2, leftMargin + contentWidth, yPos + 2);

      yPos += 8;

      // From Text Details
      pdfDoc.setTextColor(17, 24, 39); // #111827
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(10);
      pdfDoc.text(inv.fromCompanyName || "14689941 Canada Inc.", leftMargin, yPos);

      pdfDoc.setTextColor(75, 85, 99); // #4b5563
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(8.5);
      pdfDoc.text(inv.fromBrandName || "Operating as Monk Media", leftMargin, yPos + 4.5);
      pdfDoc.text(`Email: ${inv.fromEmail || "info@monkmedia.ca"}`, leftMargin, yPos + 9);
      
      let lineOffset = 13.5;
      if (inv.craNumber) {
        pdfDoc.setTextColor(75, 85, 99);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text("CRA Business Number: ", leftMargin, yPos + lineOffset);
        pdfDoc.setTextColor(17, 24, 39);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text(inv.craNumber, leftMargin + 34, yPos + lineOffset);
        lineOffset += 4.5;
      }

      if (inv.hstNumber) {
        pdfDoc.setTextColor(75, 85, 99);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text("HST Registration No.: ", leftMargin, yPos + lineOffset);
        pdfDoc.setTextColor(17, 24, 39);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text(inv.hstNumber, leftMargin + 32, yPos + lineOffset);
      }

      // Bill To Text Details
      const customClientName = inv.clientName || (client ? client.businessName : "Client Business Name");
      const customAttentionName = inv.clientAttention || (client ? client.onboardingContactName || "Tejinder Singh" : "Tejinder Singh");
      const customClientEmail = inv.clientEmail || (client ? client.email : "client@email.com");

      pdfDoc.setTextColor(17, 24, 39); // #111827
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(10);
      pdfDoc.text(customClientName, leftMargin + 95, yPos);

      pdfDoc.setTextColor(75, 85, 99); // #4b5563
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(8.5);
      pdfDoc.text(`Attention: ${customAttentionName}`, leftMargin + 95, yPos + 4.5);
      pdfDoc.text(`Email: ${customClientEmail}`, leftMargin + 95, yPos + 9);

      yPos += 28;

      // Summary Tri-Bar Box
      pdfDoc.setFillColor(240, 249, 255); // #f0f9ff
      pdfDoc.setDrawColor(224, 242, 254); // #e0f2fe
      pdfDoc.setLineWidth(0.3);
      pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 18, 2, 2, "FD");

      // Tri-Bar content titles
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(7.5);
      pdfDoc.setTextColor(52, 142, 171); // #348eab
      pdfDoc.text("PAYMENT STATUS", leftMargin + 30, yPos + 5.5, { align: "center" });
      pdfDoc.text(isPaid ? "PAYMENT DATE" : "DUE DATE", leftMargin + 90, yPos + 5.5, { align: "center" });
      pdfDoc.text("AMOUNT PAID", leftMargin + 150, yPos + 5.5, { align: "center" });

      // Column Divider Lines inside Tri-bar
      pdfDoc.setDrawColor(186, 230, 253); // #bae6fd
      pdfDoc.line(leftMargin + 60, yPos + 2, leftMargin + 60, yPos + 16);
      pdfDoc.line(leftMargin + 120, yPos + 2, leftMargin + 120, yPos + 16);

      // Tri-Bar Values
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(11);
      if (isPaid) {
        pdfDoc.setTextColor(22, 163, 74); // #16a34a
        pdfDoc.text("RECEIVED", leftMargin + 30, yPos + 12.5, { align: "center" });
      } else if (isPartial) {
        pdfDoc.setTextColor(14, 165, 233); // #0ea5e9
        pdfDoc.text("PARTIAL", leftMargin + 30, yPos + 12.5, { align: "center" });
      } else {
        pdfDoc.setTextColor(245, 158, 11); // #f59e0b
        pdfDoc.text("DUE", leftMargin + 30, yPos + 12.5, { align: "center" });
      }

      pdfDoc.setTextColor(17, 24, 39); // #111827
      pdfDoc.setFontSize(10);
      pdfDoc.text(formatDateFriendly(isPaid ? inv.invoiceDate : inv.dueDate), leftMargin + 90, yPos + 12.5, { align: "center" });
      pdfDoc.text(`$${Number(inv.amountPaid || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD`, leftMargin + 150, yPos + 12.5, { align: "center" });

      yPos += 30;

      // Table Header (Navy Blue)
      pdfDoc.setFillColor(11, 34, 47); // #0b222f
      pdfDoc.rect(leftMargin, yPos, contentWidth, 9, "F");
      
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(8.5);
      pdfDoc.text("DESCRIPTION", leftMargin + 5, yPos + 6);
      pdfDoc.text("AMOUNT (CAD)", leftMargin + contentWidth - 5, yPos + 6, { align: "right" });

      yPos += 9;

      // Table Row
      pdfDoc.setDrawColor(229, 231, 235); // #e5e7eb
      pdfDoc.rect(leftMargin, yPos, contentWidth, 12);
      
      pdfDoc.setTextColor(17, 24, 39); // #111827
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(9);
      pdfDoc.text(inv.description || inv.notes || "Software and App Development", leftMargin + 5, yPos + 7.5);
      pdfDoc.text(`$${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, leftMargin + contentWidth - 5, yPos + 7.5, { align: "right" });

      yPos += 22;

      // Calculations Right Aligned
      pdfDoc.setTextColor(107, 114, 128); // #6b7280
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(9);
      pdfDoc.text("Subtotal", leftMargin + contentWidth - 65, yPos);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.text(`$${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, leftMargin + contentWidth - 5, yPos, { align: "right" });

      if (tax > 0) {
        yPos += 6;
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("HST (13%)", leftMargin + contentWidth - 65, yPos);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`$${tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, leftMargin + contentWidth - 5, yPos, { align: "right" });
      }

      yPos += 3;
      pdfDoc.setDrawColor(229, 231, 235); // #e5e7eb
      pdfDoc.line(leftMargin + contentWidth - 65, yPos + 1, leftMargin + contentWidth, yPos + 1);

      yPos += 8;
      if (isPaid) {
        pdfDoc.setTextColor(22, 163, 74); // #16a34a (green)
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(12);
        pdfDoc.text("TOTAL PAID", leftMargin + contentWidth - 65, yPos);
        pdfDoc.text(`$${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, leftMargin + contentWidth - 5, yPos, { align: "right" });
      } else if (isPartial) {
        pdfDoc.setTextColor(107, 114, 128); // gray
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(9);
        pdfDoc.text("TOTAL PAID", leftMargin + contentWidth - 65, yPos);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`$${(Number(inv.amountPaid) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, leftMargin + contentWidth - 5, yPos, { align: "right" });

        yPos += 6;
        pdfDoc.setTextColor(245, 158, 11); // amber
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(12);
        pdfDoc.text("TOTAL DUE", leftMargin + contentWidth - 65, yPos);
        pdfDoc.text(`$${(Number(inv.balance) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, leftMargin + contentWidth - 5, yPos, { align: "right" });
      } else {
        // Due
        pdfDoc.setTextColor(22, 163, 74); // Keep green highlight color for the primary metric
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(12);
        pdfDoc.text("TOTAL DUE", leftMargin + contentWidth - 65, yPos);
        pdfDoc.text(`$${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, leftMargin + contentWidth - 5, yPos, { align: "right" });
      }

      yPos += 14;

      // Bottom Confirmation Success Banner
      if (isPaid) {
        pdfDoc.setFillColor(240, 253, 244); // #f0fdf4
        pdfDoc.setDrawColor(220, 252, 231); // #dcfce7
        pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 18, 2, 2, "FD");

        // Checkmark badge circle
        pdfDoc.setFillColor(220, 252, 231);
        pdfDoc.roundedRect(leftMargin + 5, yPos + 4, 6, 6, 3, 3, "F");
        
        // Draw green checkmark tick lines
        pdfDoc.setDrawColor(22, 163, 74);
        pdfDoc.setLineWidth(0.6);
        pdfDoc.line(leftMargin + 6.5, yPos + 7, leftMargin + 7.5, yPos + 8);
        pdfDoc.line(leftMargin + 7.5, yPos + 8, leftMargin + 9.5, yPos + 5.5);

        pdfDoc.setTextColor(22, 101, 52); // #166534
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(9);
        pdfDoc.text("PAYMENT RECEIVED IN FULL", leftMargin + 15, yPos + 7.5);

        pdfDoc.setTextColor(21, 128, 61); // #15803d
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(7.5);
        pdfDoc.text(`This receipt confirms full payment of $${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD for the services listed above.`, leftMargin + 15, yPos + 12.5);
      } else if (isPartial) {
        pdfDoc.setFillColor(240, 249, 255); // #f0f9ff
        pdfDoc.setDrawColor(224, 242, 254); // #e0f2fe
        pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 18, 2, 2, "FD");

        // Info badge circle
        pdfDoc.setFillColor(224, 242, 254);
        pdfDoc.roundedRect(leftMargin + 5, yPos + 4, 6, 6, 3, 3, "F");
        
        pdfDoc.setTextColor(14, 165, 233);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(8);
        pdfDoc.text("i", leftMargin + 8, yPos + 8.2, { align: "center" });

        pdfDoc.setTextColor(3, 105, 161); // #0369a1
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(9);
        pdfDoc.text("PARTIAL PAYMENT RECEIVED", leftMargin + 15, yPos + 7.5);

        pdfDoc.setTextColor(2, 132, 199); // #0284c7
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(7.5);
        pdfDoc.text(`This receipt confirms a partial payment of $${Number(inv.amountPaid || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD. Outstanding balance: $${Number(inv.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD.`, leftMargin + 15, yPos + 12.5);
      }

      // Footer Position
      const footerY = pageHeight - 25;
      pdfDoc.setDrawColor(243, 244, 246); // #f3f4f6
      pdfDoc.setLineWidth(0.5);
      pdfDoc.line(leftMargin, footerY, leftMargin + contentWidth, footerY);

      pdfDoc.setTextColor(156, 163, 175); // #9ca3af
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setFontSize(8);
      pdfDoc.text("Thank you for choosing Monk Media.", leftMargin, footerY + 6);
      pdfDoc.text("info@monkmedia.ca", leftMargin + contentWidth, footerY + 6, { align: "right" });

      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(7.5);
      pdfDoc.text("14689941 Canada Inc. operating as Monk Media", leftMargin + contentWidth / 2, footerY + 13, { align: "center" });

      pdfDoc.save(`Invoice-${inv.invoiceNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF: " + err.message);
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
            <h3 className="text-2xl font-bold text-sky-600 mt-1">${totalBilling.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
            <p className="text-[10px] text-sky-400 mt-0.5 font-semibold">Outstanding: ${totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
          </div>
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Revenue Received</p>
            <h3 className="text-2xl font-bold text-sky-600 mt-1">${totalReceived.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
            <p className="text-[10px] text-sky-400 mt-0.5 font-semibold">Processed billing totals</p>
          </div>
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Total Outflow</p>
            <h3 className="text-2xl font-bold text-sky-600 mt-1">${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
            <p className="text-[10px] text-sky-400 mt-0.5 font-semibold">Logged agency expenses</p>
          </div>
          <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Net Cash Flow</p>
            <h3 className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-sky-600" : "text-red-500"}`}>
              ${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </h3>
            {totalOverdue > 0 ? (
              <p className="text-[10px] text-red-500 mt-0.5 font-bold flex items-center gap-1">
                ${totalOverdue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} overdue
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
                      <th className="p-4 px-6 text-right">Total</th>
                      <th className="p-4 px-6 text-right">Received</th>
                      <th className="p-4 px-6 text-right">Balance</th>
                      <th className="p-4 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                    {scopedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-sky-400 font-medium">
                          No logged invoices found.
                        </td>
                      </tr>
                    ) : (
                      scopedInvoices.map((inv) => {
                        const isOverdue = inv.status !== "Received" && inv.dueDate < todayStr;
                        return (
                          <tr key={inv.id} className="hover:bg-sky-50/10">
                            <td className="p-4 px-6 font-bold">{inv.invoiceNumber}</td>
                            <td className="p-4 px-6">{getClientName(inv.clientId)}</td>
                            <td className={`p-4 px-6 ${isOverdue ? "text-red-500 font-bold" : ""}`}>
                              {inv.dueDate}
                            </td>
                            <td className="p-4 px-6 text-center">
                              <select
                                value={inv.status || "Due"}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  const updatePayload = { status: newStatus };
                                  if (newStatus === "Received") {
                                    updatePayload.amountPaid = inv.total;
                                    updatePayload.balance = 0;
                                  } else if (newStatus === "Due") {
                                    updatePayload.amountPaid = 0;
                                    updatePayload.balance = inv.total;
                                  } else if (newStatus === "Partial") {
                                    const partialAmt = prompt("Enter amount received for this invoice:", inv.amountPaid || "0");
                                    if (partialAmt === null) return;
                                    const amt = Number(partialAmt) || 0;
                                    updatePayload.amountPaid = amt;
                                    updatePayload.balance = Math.max(0, inv.total - amt);
                                  }
                                  try {
                                    await updateDoc(doc(db, "invoices", inv.id), updatePayload);
                                  } catch (err) {
                                    alert("Error updating status: " + err.message);
                                  }
                                }}
                                className={`px-2 py-0.5 text-[10px] font-bold rounded border cursor-pointer outline-none transition-all shadow-sm text-center ${
                                  inv.status === "Received"
                                    ? "bg-emerald-500 border-emerald-600 text-white"
                                    : inv.status === "Partial"
                                    ? "bg-sky-500 border-sky-600 text-white"
                                    : inv.status === "Draft"
                                    ? "bg-slate-400 border-slate-500 text-white"
                                    : "bg-amber-500 border-amber-600 text-white"
                                }`}
                              >
                                <option value="Due">Due</option>
                                <option value="Partial">Partial</option>
                                <option value="Received">Received</option>
                                <option value="Draft">Draft</option>
                              </select>
                            </td>
                            <td className="p-4 px-6 text-right">${Number(inv.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td className="p-4 px-6 text-right">${Number(inv.amountPaid || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td className="p-4 px-6 text-right font-bold">${Number(inv.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            <td className="p-4 px-6 text-right flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDownloadPDF(inv)}
                                className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded border border-green-200 transition"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStartEditInvoice(inv)}
                                className="p-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded border border-sky-200 transition"
                                title="Edit Invoice"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {inv.status !== "Received" && (
                                <button
                                  onClick={async () => {
                                    await updateDoc(doc(db, "invoices", inv.id), {
                                      status: "Received",
                                      amountPaid: inv.total,
                                      balance: 0,
                                    });
                                  }}
                                  className="px-2 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-[10px] font-bold transition shadow"
                                >
                                  Mark Received
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
                      <span>${totalBilling.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-400 font-bold uppercase">Total Cash Inflow Collected</span>
                      <span className="text-sky-500 font-bold">${totalReceived.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-sky-100 pt-3">
                      <span className="text-sky-400 font-bold uppercase">Client Outstanding Balances</span>
                      <span>${totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-sky-600 mb-4 pb-1 border-b border-sky-50">Profit summary</h3>
                  <div className="space-y-3.5 text-xs text-sky-600 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-sky-400 font-bold uppercase">Collected Cash</span>
                      <span>${totalReceived.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-400 font-bold uppercase">Logged Expenditures</span>
                      <span className="text-red-500 font-bold">-${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div className="flex justify-between border-t border-sky-100 pt-3 text-sm">
                      <span className="text-sky-600 font-bold uppercase">Net Profits Margin</span>
                      <span className={`font-bold ${netProfit >= 0 ? "text-sky-600" : "text-red-500"}`}>
                        ${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
                    <label className="block text-sky-500 mb-1">Billing Client Name (Logo & PDF Header)</label>
                    <input
                      type="text"
                      required
                      value={invClientName}
                      onChange={(e) => setInvClientName(e.target.value)}
                      placeholder="e.g. Metric Air Limited"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Billing Contact / Attention</label>
                    <input
                      type="text"
                      required
                      value={invClientAttention}
                      onChange={(e) => setInvClientAttention(e.target.value)}
                      placeholder="e.g. Tejinder Singh"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Billing Email Address</label>
                    <input
                      type="email"
                      required
                      value={invClientEmail}
                      onChange={(e) => setInvClientEmail(e.target.value)}
                      placeholder="e.g. billing@metricair.com"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                   <div>
                    <label className="block text-sky-500 mb-1">CRA Business Number</label>
                    <input
                      type="text"
                      value={invCraNumber}
                      onChange={(e) => setInvCraNumber(e.target.value)}
                      placeholder="e.g. 777790411"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">HST Registration No.</label>
                    <input
                      type="text"
                      value={invHstNumber}
                      onChange={(e) => setInvHstNumber(e.target.value)}
                      placeholder="e.g. 777790411 RT 0001"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div className="pt-2 border-t border-dashed border-sky-100 mt-2">
                    <h4 className="text-[9px] font-black uppercase text-sky-400 tracking-wider mb-2">Sender (From) Customization</h4>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Sender Company Name</label>
                    <input
                      type="text"
                      required
                      value={invFromCompany}
                      onChange={(e) => setInvFromCompany(e.target.value)}
                      placeholder="e.g. 14689941 Canada Inc."
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Sender Brand/Operating Name</label>
                    <input
                      type="text"
                      required
                      value={invFromBrand}
                      onChange={(e) => setInvFromBrand(e.target.value)}
                      placeholder="e.g. Operating as Monk Media"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Sender Email Address</label>
                    <input
                      type="email"
                      required
                      value={invFromEmail}
                      onChange={(e) => setInvFromEmail(e.target.value)}
                      placeholder="e.g. info@monkmedia.ca"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Invoice Item / Description</label>
                    <input
                      type="text"
                      required
                      value={invDescription}
                      onChange={(e) => setInvDescription(e.target.value)}
                      placeholder="e.g. Software and App Development"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
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
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="invIncludeHST"
                      checked={invIncludeHST}
                      onChange={(e) => setInvIncludeHST(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-500 border-sky-200 focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="invIncludeHST" className="text-sky-500 cursor-pointer select-none font-bold text-xs">
                      Include HST / Tax (13%)
                    </label>
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
                        .filter((i) => i.status !== "Received" && i.status !== "Paid")
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
          const isPaid = inv.status === "Received" || inv.status === "Paid";
          const isPartial = inv.status === "Partial";
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
                  body * {
                    visibility: hidden !important;
                  }
                  .print-modal-container, .print-modal-container * {
                    visibility: visible !important;
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
                  .no-print {
                    display: none !important;
                    visibility: hidden !important;
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
                    <div className="space-y-2 text-left">
                      <h4 className="font-bold text-sky-600 uppercase tracking-wider border-b border-sky-100 pb-1.5">From</h4>
                      <p className="font-bold text-gray-900">{inv.fromCompanyName || "14689941 Canada Inc."}</p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">{inv.fromBrandName || "Operating as Monk Media"}</p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">Email: {inv.fromEmail || "info@monkmedia.ca"}</p>
                      {inv.craNumber && (
                        <p className="text-gray-500 font-medium text-xs text-sky-600/80">
                          CRA Business Number: <strong className="text-gray-900 font-bold">{inv.craNumber}</strong>
                        </p>
                      )}
                      {inv.hstNumber && (
                        <p className="text-gray-500 font-medium text-xs text-sky-600/80">
                          HST Registration No.: <strong className="text-gray-900 font-bold">{inv.hstNumber}</strong>
                        </p>
                      )}
                    </div>
                    {/* Recipient Details */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-sky-600 uppercase tracking-wider border-b border-sky-100 pb-1.5">Bill To</h4>
                      <p className="font-bold text-gray-900">{inv.clientName || (client ? client.businessName : "Client Business Name")}</p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">
                        Attention: {inv.clientAttention || (client ? client.onboardingContactName || "Tejinder Singh" : "Tejinder Singh")}
                      </p>
                      <p className="text-gray-500 font-medium text-xs text-sky-600/80">
                        Email: {inv.clientEmail || (client ? client.email : "client@email.com")}
                      </p>
                    </div>
                  </div>

                  {/* Tri-Card Summary */}
                  <div className="grid grid-cols-3 gap-4 bg-sky-50/30 p-4 rounded-2xl border border-sky-50 text-center">
                    <div className="space-y-1">
                      <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wider">Payment Status</p>
                      <p className={`text-sm font-black uppercase ${isPaid ? "text-green-600" : isPartial ? "text-sky-500" : "text-amber-500"}`}>
                        {isPaid ? "Received" : isPartial ? "Partial" : "Due"}
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
                        ${Number(inv.amountPaid || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD
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
                          <td className="p-4 text-gray-900 font-medium">{inv.description || inv.notes || "Software and App Development"}</td>
                          <td className="p-4 text-right">${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Breakdown Calculation */}
                  <div className="flex flex-col items-end space-y-2 text-sm font-bold pr-4">
                    <div className={`flex gap-16 justify-between w-64 text-gray-500 ${tax > 0 ? "" : "border-b border-gray-100 pb-2"}`}>
                      <span>Subtotal</span>
                      <span>${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    {tax > 0 && (
                      <div className="flex gap-16 justify-between w-64 text-gray-500 border-b border-gray-100 pb-2">
                        <span>HST (13%)</span>
                        <span>${tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    )}
                    
                    {isPaid ? (
                      <div className="flex gap-16 justify-between w-64 text-green-600 text-lg font-black pt-1">
                        <span>TOTAL PAID</span>
                        <span>${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    ) : isPartial ? (
                      <>
                        <div className="flex gap-16 justify-between w-64 text-gray-500 text-sm font-bold pt-1">
                          <span>TOTAL PAID</span>
                          <span>${(Number(inv.amountPaid) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex gap-16 justify-between w-64 text-amber-500 text-lg font-black pt-1">
                          <span>TOTAL DUE</span>
                          <span>${(Number(inv.balance) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-16 justify-between w-64 text-green-600 text-lg font-black pt-1">
                        <span>TOTAL DUE</span>
                        <span>${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                    )}
                  </div>

                  {/* Green Confirmation Pill if Paid */}
                  {isPaid && (
                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-start gap-3 text-left">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5 bg-green-100 rounded-full p-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-green-700">PAYMENT RECEIVED IN FULL</h5>
                        <p className="text-[11px] text-green-600 font-semibold mt-0.5">
                          This receipt confirms full payment of ${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD for the services listed above.
                        </p>
                      </div>
                    </div>
                  )}
                  {isPartial && (
                    <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl flex items-start gap-3 text-left">
                      <span className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5 bg-sky-100 rounded-full p-0.5 flex items-center justify-center font-bold text-xs">i</span>
                      <div>
                        <h5 className="text-xs font-bold text-sky-700">PARTIAL PAYMENT RECEIVED</h5>
                        <p className="text-[11px] text-sky-600 font-semibold mt-0.5">
                          This receipt confirms a partial payment of ${Number(inv.amountPaid || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD. Outstanding balance: ${Number(inv.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} CAD.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex justify-between border-t border-gray-100 pt-6 text-[10px] text-gray-400 font-semibold">
                    <span>Thank you for choosing Monk Media.</span>
                    <span>{inv.fromEmail || "info@monkmedia.ca"}</span>
                  </div>
                  <p className="text-[9px] text-gray-400 text-center font-medium mt-4">
                    {inv.fromCompanyName || "14689941 Canada Inc."} {inv.fromBrandName ? (inv.fromBrandName.toLowerCase().startsWith("operating as") ? inv.fromBrandName.toLowerCase() : "operating as " + inv.fromBrandName) : "operating as Monk Media"}
                  </p>
                </div>
              </div>
            </div>
          );
         })()}

        {/* EDIT INVOICE MODAL */}
        {isEditInvOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-sky-950/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-sky-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-sky-100 bg-sky-50/10">
                <h3 className="text-lg font-bold text-sky-600">Edit Invoice #{editInvNum}</h3>
                <button
                  onClick={() => setIsEditInvOpen(false)}
                  className="p-1.5 text-sky-400 hover:text-sky-500 rounded-xl border border-sky-100 hover:bg-sky-50/50 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateInvoice} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-semibold text-left">
                
                {/* General Invoice Info */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-wider border-b border-sky-100 pb-1">General Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sky-500 mb-1">Invoice Number</label>
                      <input
                        type="text"
                        required
                        value={editInvNum}
                        onChange={(e) => setEditInvNum(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Due Date</label>
                      <input
                        type="date"
                        required
                        value={editInvDue}
                        onChange={(e) => setEditInvDue(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Description / Item Name</label>
                    <input
                      type="text"
                      required
                      value={editInvDescription}
                      onChange={(e) => setEditInvDescription(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sky-500 mb-1">Base Billing Value ($)</label>
                      <input
                        type="number"
                        required
                        value={editInvAmount}
                        onChange={(e) => setEditInvAmount(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Tax / HST Amount ($)</label>
                      <input
                        type="number"
                        required
                        value={editInvTax}
                        onChange={(e) => setEditInvTax(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                      <p className="text-[10px] text-sky-400 mt-1 font-semibold">Set to 0 to completely hide the HST row in the PDF.</p>
                    </div>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-wider border-b border-sky-100 pb-1">Client (Bill To) Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sky-500 mb-1">Client Business Name</label>
                      <input
                        type="text"
                        required
                        value={editInvClientName}
                        onChange={(e) => setEditInvClientName(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Billing Contact / Attention</label>
                      <input
                        type="text"
                        required
                        value={editInvClientAttention}
                        onChange={(e) => setEditInvClientAttention(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Billing Email Address</label>
                    <input
                      type="email"
                      required
                      value={editInvClientEmail}
                      onChange={(e) => setEditInvClientEmail(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    />
                  </div>
                </div>

                {/* Sender Details */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-wider border-b border-sky-100 pb-1">Sender (From) Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sky-500 mb-1">Sender Company Name</label>
                      <input
                        type="text"
                        required
                        value={editInvFromCompany}
                        onChange={(e) => setEditInvFromCompany(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Sender Brand/Operating Name</label>
                      <input
                        type="text"
                        required
                        value={editInvFromBrand}
                        onChange={(e) => setEditInvFromBrand(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Sender Email Address</label>
                    <input
                      type="email"
                      required
                      value={editInvFromEmail}
                      onChange={(e) => setEditInvFromEmail(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sky-500 mb-1">CRA Business Number</label>
                      <input
                        type="text"
                        value={editInvCraNumber}
                        onChange={(e) => setEditInvCraNumber(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">HST Registration No.</label>
                      <input
                        type="text"
                        value={editInvHstNumber}
                        onChange={(e) => setEditInvHstNumber(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-2 border-t border-sky-100 bg-sky-50/5">
                  <button
                    type="button"
                    onClick={() => setIsEditInvOpen(false)}
                    className="px-4 py-2 border border-sky-100 text-sky-500 rounded-xl hover:bg-sky-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition shadow-lg shadow-sky-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
