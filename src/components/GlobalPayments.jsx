"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";
import { DollarSign, X, CreditCard, Check, AlertCircle, Sparkles } from "lucide-react";

export default function GlobalPayments() {
  const { currentUser, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // States
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payInvId, setPayInvId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payNotes, setPayNotes] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Personnel Payout States
  const [recordType, setRecordType] = useState("client_payment"); // client_payment, personnel_payout, or create_invoice
  const [payoutName, setPayoutName] = useState("");
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split("T")[0]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutRemaining, setPayoutRemaining] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("Bank Transfer");
  const [payoutNotes, setPayoutNotes] = useState("");

  // Create Manual Invoice States
  const [createInvClientId, setCreateInvClientId] = useState("");
  const [createInvNum, setCreateInvNum] = useState("");
  const [createInvDescription, setCreateInvDescription] = useState("Software and App Development");
  const [createInvAmount, setCreateInvAmount] = useState("");
  const [createInvDue, setCreateInvDue] = useState("");
  const [createInvIncludeHST, setCreateInvIncludeHST] = useState(true);

  // Auto populate invoice generation number & due date
  useEffect(() => {
    if (recordType === "create_invoice" && !createInvNum) {
      setCreateInvNum(`MM-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Math.floor(100 + Math.random() * 900))}`);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setCreateInvDue(d.toISOString().split("T")[0]);
    }
  }, [recordType, createInvNum]);

  // Observers
  useEffect(() => {
    if (!currentUser || (role !== "admin" && role !== "manager")) return;

    const unsubClients = onSnapshot(collection(db, "clients"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setClients(list);
    }, (err) => {
      console.warn("GlobalPayments clients sync error:", err);
    });

    const unsubInvoices = onSnapshot(collection(db, "invoices"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setInvoices(list);
    }, (err) => {
      console.warn("GlobalPayments invoices sync error:", err);
    });

    return () => {
      unsubClients();
      unsubInvoices();
    };
  }, [currentUser, role]);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener("toggle-global-payments", handleToggle);
    return () => window.removeEventListener("toggle-global-payments", handleToggle);
  }, []);

  if (!currentUser || (role !== "admin" && role !== "manager")) return null;

  // Filter scoped data
  const scopedClients = clients.filter((c) => {
    if (role === "admin") return true;
    if (role === "manager") return c.accountManager === currentUser?.uid;
    return false;
  });

  const scopedInvoices = invoices.filter((inv) => {
    if (role === "admin") return true;
    if (role === "manager") return scopedClients.some((c) => c.id === inv.clientId);
    return false;
  });

  const unpaidInvoices = scopedInvoices.filter((inv) => (Number(inv.balance) || 0) > 0);

  const getClientName = (clientId) => {
    const c = clients.find((client) => client.id === clientId);
    return c ? c.businessName : "Unknown Client";
  };

  const handleQuickPayment = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (recordType === "client_payment") {
      if (!payInvId || !payAmount) {
        setSubmitError("Please select an invoice and enter amount.");
        return;
      }

      try {
        const amount = Number(payAmount);
        const targetInvoice = invoices.find((i) => i.id === payInvId);
        if (!targetInvoice) {
          setSubmitError("Selected invoice not found.");
          return;
        }

        const nextPaid = (Number(targetInvoice.amountPaid) || 0) + amount;
        const nextBal = Math.max(0, Number(targetInvoice.total) - nextPaid);
        const nextStatus = nextBal <= 0 ? "Received" : "Partial";

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

        // Reset
        setPayInvId("");
        setPayAmount("");
        setPayNotes("");
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      } catch (err) {
        setSubmitError(err.message);
      }
    } else if (recordType === "create_invoice") {
      if (!createInvClientId || !createInvNum || !createInvAmount) {
        setSubmitError("Please fill in client, invoice number and amount.");
        return;
      }

      try {
        const amount = Number(createInvAmount);
        const parentClient = clients.find((c) => c.id === createInvClientId);
        const taxRate = createInvIncludeHST ? (parentClient?.financials?.taxRate ?? 13) : 0;
        const tax = Number(((amount * taxRate) / 100).toFixed(2));
        const total = amount + tax;

        const payload = {
          invoiceNumber: createInvNum,
          clientId: createInvClientId,
          projectId: "", // Manual invoice
          invoiceDate: new Date().toISOString().split("T")[0],
          dueDate: createInvDue || new Date().toISOString().split("T")[0],
          amount,
          tax,
          total,
          amountPaid: 0,
          balance: total,
          status: "Due",
          paymentMethod: parentClient?.financials?.paymentMethod || "Bank Transfer",
          receiptUrl: "",
          notes: "Manually created via Quick Record drawer.",
          description: createInvDescription || "Software and App Development",
          clientName: parentClient?.businessName || "",
          clientAttention: parentClient?.contactPerson || "",
          clientEmail: parentClient?.email || "",
          craNumber: parentClient?.financials?.craNumber || "777790411",
          hstNumber: parentClient?.financials?.hstRegistration || "777790411 RT 0001",
          fromCompanyName: "14689941 Canada Inc.",
          fromBrandName: "Operating as Monk Media",
          fromEmail: "info@monkmedia.ca"
        };

        await addDoc(collection(db, "invoices"), payload);

        // Reset
        setCreateInvClientId("");
        setCreateInvNum("");
        setCreateInvDescription("Software and App Development");
        setCreateInvAmount("");
        setCreateInvDue("");
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      } catch (err) {
        setSubmitError(err.message);
      }
    } else {
      // Personnel Payout
      if (!payoutName || !payoutAmount) {
        setSubmitError("Please enter name and payout amount.");
        return;
      }

      try {
        await addDoc(collection(db, "payouts"), {
          name: payoutName,
          date: payoutDate || new Date().toISOString().split("T")[0],
          amount: Number(payoutAmount) || 0,
          remainingBalance: Number(payoutRemaining) || 0,
          method: payoutMethod,
          notes: payoutNotes || "",
          createdAt: new Date().toISOString()
        });

        // Reset
        setPayoutName("");
        setPayoutAmount("");
        setPayoutRemaining("");
        setPayoutNotes("");
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
      } catch (err) {
        setSubmitError(err.message);
      }
    }
  };

  return (
    <>
      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end bg-sky-950/20 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white h-screen shadow-2xl p-6 flex flex-col justify-between border-l border-sky-100 animate-slide-in">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-sky-50 mb-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-sky-600">Quick Record Payment</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-sky-400 hover:bg-sky-50 rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form & Content */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-semibold">
                {submitError && (
                  <div className="p-3 bg-red-50/50 border border-red-100 text-red-500 rounded-2xl text-[11px] font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl text-[11px] font-bold flex items-center gap-1.5 border border-emerald-100">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>Payment recorded successfully!</span>
                  </div>
                )}

                {/* Record Type Switcher Toggle */}
                <div className="flex bg-sky-50 p-1 rounded-xl mb-4 text-[9px] select-none gap-0.5">
                  <button
                    type="button"
                    onClick={() => setRecordType("client_payment")}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      recordType === "client_payment"
                        ? "bg-white text-sky-600 shadow-sm"
                        : "text-sky-400 hover:text-sky-500"
                    }`}
                  >
                    Client Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordType("create_invoice")}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      recordType === "create_invoice"
                        ? "bg-white text-sky-600 shadow-sm"
                        : "text-sky-400 hover:text-sky-500"
                    }`}
                  >
                    Manual Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordType("personnel_payout")}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                      recordType === "personnel_payout"
                        ? "bg-white text-sky-600 shadow-sm"
                        : "text-sky-400 hover:text-sky-500"
                    }`}
                  >
                    Personnel Payout
                  </button>
                </div>

                <form onSubmit={handleQuickPayment} className="space-y-4">
                  {recordType === "client_payment" && (
                    <>
                      <div>
                        <label className="block text-sky-500 mb-1">Select Outstanding Invoice</label>
                        {unpaidInvoices.length === 0 ? (
                          <div className="p-4 bg-sky-50/20 text-sky-400 text-center rounded-2xl border border-sky-100/50 italic">
                            No outstanding invoices found.
                          </div>
                        ) : (
                          <select
                            value={payInvId}
                            required
                            onChange={(e) => {
                              setPayInvId(e.target.value);
                              const target = unpaidInvoices.find((i) => i.id === e.target.value);
                              if (target) setPayAmount(target.balance);
                            }}
                            className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 bg-white"
                          >
                            <option value="">Choose invoice...</option>
                            {unpaidInvoices.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.invoiceNumber} - {getClientName(inv.clientId)} (${Number(inv.balance).toLocaleString()} due)
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {unpaidInvoices.length > 0 && (
                        <>
                          <div>
                            <label className="block text-sky-500 mb-1">Payment Amount ($)</label>
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
                              className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 bg-white"
                            >
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Credit Card">Credit Card</option>
                              <option value="Cheque">Cheque</option>
                              <option value="Cash">Cash</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sky-500 mb-1">Internal Notes</label>
                            <textarea
                              value={payNotes}
                              onChange={(e) => setPayNotes(e.target.value)}
                              placeholder="Reference number, bank wire code, notes..."
                              className="w-full p-2 border border-sky-100 rounded-xl"
                              rows={3}
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                          >
                            Record Payment
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {recordType === "create_invoice" && (
                    <>
                      <div>
                        <label className="block text-sky-500 mb-1">Select Client</label>
                        <select
                          value={createInvClientId}
                          required
                          onChange={(e) => setCreateInvClientId(e.target.value)}
                          className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 bg-white"
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
                        <label className="block text-sky-500 mb-1">Invoice Number</label>
                        <input
                          type="text"
                          required
                          value={createInvNum}
                          onChange={(e) => setCreateInvNum(e.target.value)}
                          placeholder="e.g. MM-2026-08-01"
                          className="w-full p-2 border border-sky-100 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sky-500 mb-1">Invoice Item / Description</label>
                        <input
                          type="text"
                          required
                          value={createInvDescription}
                          onChange={(e) => setCreateInvDescription(e.target.value)}
                          placeholder="e.g. Software and App Development"
                          className="w-full p-2 border border-sky-100 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sky-500 mb-1">Billing Amount ($)</label>
                        <input
                          type="number"
                          required
                          value={createInvAmount}
                          onChange={(e) => setCreateInvAmount(e.target.value)}
                          placeholder="e.g. 1500"
                          className="w-full p-2 border border-sky-100 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sky-500 mb-1">Due Date</label>
                        <input
                          type="date"
                          required
                          value={createInvDue}
                          onChange={(e) => setCreateInvDue(e.target.value)}
                          className="w-full p-2 border border-sky-100 rounded-xl"
                        />
                      </div>

                      <div className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          id="createInvIncludeHST"
                          checked={createInvIncludeHST}
                          onChange={(e) => setCreateInvIncludeHST(e.target.checked)}
                          className="w-4 h-4 rounded text-sky-500 border-sky-200 focus:ring-sky-500 cursor-pointer"
                        />
                        <label htmlFor="createInvIncludeHST" className="text-sky-500 cursor-pointer select-none font-bold text-xs">
                          Include HST / Tax (13%)
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg mt-2"
                      >
                        Create Manual Invoice
                      </button>
                    </>
                  )}

                  {recordType === "personnel_payout" && (
                    <>
                      <div>
                        <label className="block text-sky-500 mb-1">Person Name</label>
                        <input
                          type="text"
                          required
                          value={payoutName}
                          onChange={(e) => setPayoutName(e.target.value)}
                          placeholder="e.g. John Doe (Contractor)"
                          className="w-full p-2 border border-sky-100 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sky-500 mb-1">Date of Payment</label>
                        <input
                          type="date"
                          required
                          value={payoutDate}
                          onChange={(e) => setPayoutDate(e.target.value)}
                          className="w-full p-2 border border-sky-100 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sky-500 mb-1">Amount Paid ($)</label>
                        <input
                          type="number"
                          required
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(e.target.value)}
                          placeholder="e.g. 1200"
                          className="w-full p-2 border border-sky-100 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sky-500 mb-1">Remaining Amount to Pay ($) (Optional)</label>
                        <input
                          type="number"
                          value={payoutRemaining}
                          onChange={(e) => setPayoutRemaining(e.target.value)}
                          placeholder="e.g. 300"
                          className="w-full p-2 border border-sky-100 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sky-500 mb-1">Payment Method</label>
                        <select
                          value={payoutMethod}
                          onChange={(e) => setPayoutMethod(e.target.value)}
                          className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 bg-white"
                        >
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Cash">Cash</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sky-500 mb-1">Notes</label>
                        <textarea
                          value={payoutNotes}
                          onChange={(e) => setPayoutNotes(e.target.value)}
                          placeholder="Payout details, invoice reference, etc..."
                          className="w-full p-2 border border-sky-100 rounded-xl"
                          rows={3}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                      >
                        Record Payout
                      </button>
                    </>
                  )}
                </form>
              </div>
            </div>

            <div className="pt-4 border-t border-sky-50 text-center">
              <span className="text-[9px] text-sky-400 font-medium">Quick Floating Finance Tool</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
