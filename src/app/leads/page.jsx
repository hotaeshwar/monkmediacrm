"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, addDoc, getDocs, deleteDoc } from "firebase/firestore";
import { BarChart3, Plus, Search, Filter, ArrowRight, Check, X, Trash2, User, Info, Calendar } from "lucide-react";
import Loader from "@/components/Loader";

export default function LeadsPage() {
  const { currentUser, role } = useAuth();

  const getStageHeaderStyles = (stage) => {
    switch (stage) {
      case "NEW":
        return {
          bg: "bg-sky-50/70 border-sky-100",
          text: "text-sky-600",
          badge: "bg-sky-100/60 text-sky-700 border-sky-200/50"
        };
      case "CONTACTED":
        return {
          bg: "bg-blue-50/70 border-blue-100",
          text: "text-blue-600",
          badge: "bg-blue-100/60 text-blue-700 border-blue-200/50"
        };
      case "PROPOSAL SENT":
        return {
          bg: "bg-indigo-50/70 border-indigo-100",
          text: "text-indigo-600",
          badge: "bg-indigo-100/60 text-indigo-700 border-indigo-200/50"
        };
      case "NEGOTIATING":
        return {
          bg: "bg-amber-50/70 border-amber-100",
          text: "text-amber-600",
          badge: "bg-amber-100/60 text-amber-700 border-amber-200/50"
        };
      case "CLOSED WON":
        return {
          bg: "bg-emerald-50/70 border-emerald-100",
          text: "text-emerald-600",
          badge: "bg-emerald-100/60 text-emerald-700 border-emerald-200/50"
        };
      case "CLOSED LOST":
        return {
          bg: "bg-rose-50/70 border-rose-100",
          text: "text-rose-600",
          badge: "bg-rose-100/60 text-rose-700 border-rose-200/50"
        };
      default:
        return {
          bg: "bg-sky-50/70 border-sky-100",
          text: "text-sky-600",
          badge: "bg-sky-100/60 text-sky-700 border-sky-200/50"
        };
    }
  };
  
  // Data State
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  
  // Form States
  const [leadName, setLeadName] = useState("");
  const [leadBusiness, setLeadBusiness] = useState("");
  const [leadContact, setLeadContact] = useState("");
  const [leadSource, setLeadSource] = useState("Direct");
  const [leadNotes, setLeadNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [formError, setFormError] = useState("");

  const stages = ["New", "Contacted", "Proposal Sent", "Negotiating", "Closed Won", "Closed Lost"];

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const unsubLeads = onSnapshot(collection(db, "leads"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setLeads(list);
    });

    setLoading(false);
    return () => unsubLeads();
  }, [currentUser]);

  // Scopes leads based on role
  const scopedLeads = leads.filter((l) => {
    if (role === "admin") return true;
    // Account manager sees leads where they are assignedRep
    return l.assignedRep === currentUser?.uid;
  });

  const filteredLeads = scopedLeads.filter((l) => {
    const matchSearch =
      l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.business?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const handleUpdateStatus = async (leadId, nextStatus) => {
    try {
      await updateDoc(doc(db, "leads", leadId), { status: nextStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!confirm("Are you sure you want to delete this lead?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "leads", leadId));
      alert("Lead deleted successfully!");
    } catch (err) {
      console.error("Error deleting lead:", err);
      alert("Failed to delete lead: " + err.message);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!leadName || !leadBusiness || !leadContact) {
      setFormError("Lead Name, Business Name, and Contact Info are required.");
      return;
    }

    try {
      const payload = {
        name: leadName,
        business: leadBusiness,
        contactInfo: leadContact,
        source: leadSource,
        status: "New",
        assignedRep: currentUser?.uid,
        followUpDate: followUp || "",
        notes: leadNotes,
        convertedToClientId: "",
      };

      await addDoc(collection(db, "leads"), payload);
      setLeadName("");
      setLeadBusiness("");
      setLeadContact("");
      setLeadSource("Direct");
      setLeadNotes("");
      setFollowUp("");
      setCreateOpen(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  // Pipe Action: Convert Lead to client
  const handleConvertToClient = async (lead) => {
    try {
      const clientPayload = {
        businessName: lead.business,
        legalName: lead.business,
        contactPerson: lead.name,
        phone: "",
        email: lead.contactInfo,
        secondaryContact: "",
        website: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        industry: "Other",
        status: "Onboarding",
        dateJoined: new Date().toISOString().split("T")[0],
        accountManager: lead.assignedRep || currentUser?.uid,
        leadSource: lead.source || "Direct",
        notes: lead.notes || "",
        logoUrl: "",
        logoTransparentUrl: "",
        services: [],
        deliverables: "",
        accountLinks: [],
        assignedTeam: [],
        financials: (() => {
          const onboardingDate = new Date().toISOString().split("T")[0];
          const start = new Date(onboardingDate + "T12:00:00");
          const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
          const nextPaymentDateStr = nextMonth.toISOString().split("T")[0];
          const dueDateStr = String(start.getDate());

          return {
            monthlyRetainer: 0,
            oneTimeProjectValue: 0,
            paymentFrequency: "Monthly",
            dueDate: dueDateStr,
            projectStartDate: onboardingDate,
            contractStart: onboardingDate,
            contractEnd: "",
            taxRate: 13,
            gstNumber: "",
            billingEmail: lead.contactInfo || "",
            paymentMethod: "Credit Card",
            depositRequired: false,
            depositReceived: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            nextPaymentDate: nextPaymentDateStr,
            lastPaymentDate: "",
          };
        })(),
      };

      // 1. Add new Client document
      const clientRef = await addDoc(collection(db, "clients"), clientPayload);

      // 2. Initialize Checklist
      await addDoc(collection(db, "onboardingChecklists"), {
        clientId: clientRef.id,
        clientInfoCollected: true, // auto checked
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

      // 3. Mark Lead as Converted
      await updateDoc(doc(db, "leads", lead.id), {
        status: "Closed Won",
        convertedToClientId: clientRef.id,
      });

      alert(`Success! Lead converted to Client profile.`);
    } catch (err) {
      alert("Conversion failed: " + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-sky-600">Leads Pipeline</h1>
            <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
              Sales Pipeline & Opportunity Stages
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            Add Opportunity
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
          <input
            type="text"
            placeholder="Search leads name or business..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none placeholder-sky-300 transition-all"
          />
        </div>

        {/* KANBAN BOARD */}
        {loading ? (
          <Loader />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
            {stages.map((stage) => {
              const columnLeads = filteredLeads.filter((l) => l.status === stage);
              const style = getStageHeaderStyles(stage);
              return (
                <div key={stage} className="bg-sky-50/10 border border-sky-100/40 rounded-3xl p-3.5 space-y-3 shadow-[0_2px_8px_rgba(14,165,233,0.01)]">
                  <div className={`flex items-center justify-between p-2.5 rounded-2xl border ${style.bg}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>{stage}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${style.badge}`}>
                      {columnLeads.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-0.5 scrollbar-none">
                    {columnLeads.map((l) => {
                      const isConverted = l.convertedToClientId !== "";
                      return (
                        <div
                          key={l.id}
                          className="relative p-4 bg-white border border-sky-100/50 hover:border-sky-300 hover:shadow-md rounded-2xl shadow-[0_2px_6px_rgba(14,165,233,0.02)] transition-all duration-300 space-y-2.5 group"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-sky-600 truncate group-hover:text-[#348eab] transition-colors">{l.name}</h4>
                              <div className="text-[10px] text-sky-400 font-bold uppercase mt-0.5 tracking-wider truncate">{l.business}</div>
                            </div>
                            {role === "admin" && (
                              <button
                                onClick={() => handleDeleteLead(l.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-lg transition-all duration-200"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-1.5 text-[9px] text-sky-500 font-medium">
                            <div className="flex items-center gap-1.5 text-sky-600 bg-sky-50/50 p-1.5 rounded-lg border border-sky-100/20 truncate">
                              <User className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                              <span className="truncate">{l.contactInfo}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-sky-500 bg-sky-50/20 p-1.5 rounded-lg border border-sky-100/10">
                              <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                              <span>Source: <strong className="text-sky-600">{l.source || "Direct"}</strong></span>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-sky-50 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-sky-400" />
                                {l.followUpDate ? l.followUpDate : "No date"}
                              </span>
                              <select
                                value={l.status}
                                onChange={(e) => handleUpdateStatus(l.id, e.target.value)}
                                className="p-1 px-1.5 border border-sky-100 rounded-lg text-[9px] font-bold text-sky-600 bg-white focus:outline-none focus:ring-1 focus:ring-sky-200 transition-all"
                              >
                                {stages.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Convert Lead Action */}
                            {!isConverted && (
                              <button
                                type="button"
                                onClick={() => handleConvertToClient(l)}
                                className="w-full py-2 bg-gradient-to-r from-sky-400 to-[#348eab] hover:from-sky-500 hover:to-[#28718a] text-white rounded-xl text-[9px] font-bold shadow-sm hover:shadow transition-all duration-300 flex items-center justify-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5 text-white" />
                                Convert to Client
                              </button>
                            )}

                            {isConverted && (
                              <div className="py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 text-center rounded-xl text-[9px] font-bold flex items-center justify-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                Converted
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {columnLeads.length === 0 && (
                      <div className="text-center py-8 text-sky-300 text-[10px] italic border border-dashed border-sky-100 rounded-2xl bg-white/50">
                        No leads
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Drawer Creation Opportunity */}
        {createOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                  <div>
                    <h2 className="text-xl font-bold text-sky-600">Add Lead Opportunity</h2>
                    <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Sales Pipeline Tracker</p>
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

                <form onSubmit={handleCreateLead} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Contact Representative
                    </label>
                    <input
                      type="text"
                      required
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="e.g. John Miller"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Brand / Business name
                    </label>
                    <input
                      type="text"
                      required
                      value={leadBusiness}
                      onChange={(e) => setLeadBusiness(e.target.value)}
                      placeholder="e.g. Miller Co. Marketing"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Contact Information (Email / Phone)
                    </label>
                    <input
                      type="text"
                      required
                      value={leadContact}
                      onChange={(e) => setLeadContact(e.target.value)}
                      placeholder="john@millerco.com"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                        Lead Source
                      </label>
                      <select
                        value={leadSource}
                        onChange={(e) => setLeadSource(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none"
                      >
                        <option value="Direct">Direct Outreach</option>
                        <option value="Referral">Referral</option>
                        <option value="Google Search">Google Search</option>
                        <option value="Social Media">Instagram/TikTok</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                        Follow Up Date
                      </label>
                      <input
                        type="date"
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Lead Notes
                    </label>
                    <textarea
                      rows={4}
                      value={leadNotes}
                      onChange={(e) => setLeadNotes(e.target.value)}
                      placeholder="Detail proposal items, budget expectations..."
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
                      Add Lead
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
