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
      const nextStatus = nextBal <= 0 ? "Paid" : "Sent";

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
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-36 right-6 z-[999] p-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full shadow-2xl hover:scale-105 transition-all duration-300 group"
        title="Quick Record Payment"
      >
        <div className="relative">
          <DollarSign className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </div>
      </button>

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

                <form onSubmit={handleQuickPayment} className="space-y-4">
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
