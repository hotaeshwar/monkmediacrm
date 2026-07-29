"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert, Check, Copy, Trash2, Clock, Mail, Shield, RefreshCw } from "lucide-react";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.455L0 24zm6.59-11.236c-.144-.24-.016-.372.104-.492.112-.112.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.47-.393-.407-.54-.415-.137-.007-.294-.008-.45-.008-.156 0-.41.058-.624.294-.216.236-.82.8-.82 1.95s.84 2.26.957 2.42c.117.16 1.65 2.518 3.99 3.53.557.24 1.002.38 1.344.49.56.18 1.07.15 1.47.09.447-.067 1.38-.564 1.575-1.11.195-.546.195-1.01.137-1.11-.058-.09-.215-.14-.45-.257-.235-.117-1.38-.68-1.595-.76-.215-.08-.37-.12-.527.12-.157.24-.61.76-.748.92-.137.16-.274.18-.51.06-.235-.117-.994-.365-1.894-1.17-.7-.624-1.173-1.396-1.31-1.63z"/>
  </svg>
);

export default function PasswordResetsPage() {
  const { currentUser, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Reset modal state
  const [selectedReq, setSelectedReq] = useState(null);
  const [customPassword, setCustomPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [users, setUsers] = useState([]);

  // Subscribe to Users collection to fetch their phone numbers
  useEffect(() => {
    if (!currentUser || role !== "admin") return;
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setUsers(list);
    });
    return () => unsubUsers();
  }, [currentUser, role]);

  const getUserPhone = (email) => {
    const u = users.find(x => x.email?.toLowerCase() === email?.toLowerCase());
    return u ? u.phone : "";
  };

  const handleWhatsAppShare = (email, password, roleVal, customPhoneNum) => {
    const cleanPhone = customPhoneNum ? customPhoneNum.replace(/[^0-9]/g, "") : "";
    const portalPath = roleVal === "manager" ? "manager" : "team";
    const text = `Hi! Here are your credentials for the Monk Media Portal:

Email: ${email}
Temporary Password: ${password}
Portal Link: ${window.location.origin}/login/${portalPath}

Please log in and update your password.`;

    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, "_blank");
  };

  // 1. Subscribe to Password Reset Requests in real-time
  useEffect(() => {
    if (!currentUser || role !== "admin") return;

    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "passwordResetRequests"),
      (snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        // Sort by createdAt descending
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRequests(list);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setError("Failed to load reset requests from database.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser, role]);

  // 2. Helper to generate a password
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%&*";
    let genPass = "Monk@";
    for (let i = 0; i < 7; i++) {
      genPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCustomPassword(genPass);
  };

  // Pre-fill generated password when selecting a request
  useEffect(() => {
    if (selectedReq) {
      generatePassword();
    } else {
      setCustomPassword("");
    }
  }, [selectedReq]);

  // 3. Handle Password Reset Form Submit
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    setError("");
    setSuccessMsg("");
    setResetLoading(true);

    try {
      if (!customPassword || customPassword.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      const idToken = await auth.currentUser.getIdToken();

      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: selectedReq.email,
          password: customPassword,
          requestId: selectedReq.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccessMsg(`Successfully reset password for ${selectedReq.email}!`);
      alert(`Success: Password reset for ${selectedReq.email}. Share it with them.`);
      setSelectedReq(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to reset password.");
      alert(`Error: ${err.message || "Failed to reset password."}`);
    } finally {
      setResetLoading(false);
    }
  };

  // 4. Handle Delete/Dismiss Request
  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to delete this password reset request?")) return;

    try {
      await deleteDoc(doc(db, "passwordResetRequests", requestId));
      alert("Request deleted successfully.");
    } catch (err) {
      console.error("Error deleting request:", err);
      alert("Failed to delete request.");
    }
  };

  // 5. Handle Copy to Clipboard
  const handleCopy = (req) => {
    const text = `Portal: ${window.location.origin}/login/${req.role}\nEmail: ${req.email}\nNew Password: ${req.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopiedId(req.id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  // Authentication guards
  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white min-h-[500px]">
        <div className="w-full max-w-md p-8 border border-sky-100 rounded-3xl shadow-xl text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-sky-600">Access Denied</h2>
          <p className="text-sm text-sky-400 mt-2">
            This module is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const completedRequests = requests.filter((r) => r.status === "completed");

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-sky-600 flex items-center gap-2">
              <KeyRound className="w-8 h-8 text-sky-500" />
              Password Reset Portal
            </h1>
            <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
              Manage forgot password requests for team members and managers
            </p>
          </div>
          <div className="flex items-center gap-2 bg-sky-50 px-4 py-2 rounded-2xl border border-sky-100 text-xs font-semibold text-sky-600">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>{pendingRequests.length} Pending Requests</span>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="p-4 bg-red-50/50 border border-red-100 text-red-500 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-sky-50 border border-sky-100 text-sky-600 rounded-2xl text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {/* Dynamic Layout: Pending vs Completed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left/Middle Columns: Reset Requests list */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Section: Pending Requests */}
            <div className="bg-white border border-sky-100 rounded-3xl shadow-xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-sky-600 uppercase tracking-wider border-b border-sky-50 pb-2">
                Pending Requests
              </h2>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-sky-400 text-xs font-medium">
                  No pending password reset requests. All clear!
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-white border border-sky-100 hover:border-sky-200 rounded-2xl transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                          <Mail className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-sky-600 truncate max-w-xs sm:max-w-md">
                            {req.email}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1 items-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              req.role === "manager" ? "bg-cyan-50 text-cyan-600" : "bg-emerald-50 text-emerald-600"
                            }`}>
                              {req.role}
                            </span>
                            <span className="text-[10px] text-sky-400">
                              Requested: {new Date(req.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedReq(req)}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Reset
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-2 border border-red-100 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Completed Resets */}
            <div className="bg-white border border-sky-100 rounded-3xl shadow-xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-sky-600 uppercase tracking-wider border-b border-sky-50 pb-2">
                Processed Resets (Ready to Share)
              </h2>

              {completedRequests.length === 0 ? (
                <div className="text-center py-8 text-sky-400 text-xs font-medium">
                  No recently completed resets.
                </div>
              ) : (
                <div className="space-y-4">
                  {completedRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-sky-50/30 border border-sky-100 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 flex-shrink-0">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-sky-600 truncate max-w-xs sm:max-w-md">
                            {req.email}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1 items-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              req.role === "manager" ? "bg-cyan-50 text-cyan-600" : "bg-emerald-50 text-emerald-600"
                            }`}>
                              {req.role}
                            </span>
                            <span className="text-[10px] text-sky-400">
                              Temp Pass: <code className="bg-white px-1.5 py-0.5 rounded border border-sky-100 text-sky-700 font-mono text-[11px] font-bold">{req.tempPassword}</code>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 items-end flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(req)}
                            className="px-3 py-2 border border-sky-200 text-sky-600 bg-white hover:bg-sky-50 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5"
                          >
                            {copiedId === req.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === req.id ? "Copied!" : "Copy info"}
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="p-2 border border-red-50 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                            title="Dismiss"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* WhatsApp Sharing */}
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="WhatsApp Number"
                            defaultValue={getUserPhone(req.email)}
                            id={`wa-${req.id}`}
                            className="w-32 px-2 py-1.5 border border-sky-100 rounded-xl text-[10px] text-sky-600 bg-white outline-none focus:border-sky-300"
                          />
                          <button
                            onClick={() => {
                              const inputVal = document.getElementById(`wa-${req.id}`)?.value || "";
                              handleWhatsAppShare(req.email, req.tempPassword, req.role, inputVal);
                            }}
                            className="p-2 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-xl transition-all shadow-sm"
                            title="Share on WhatsApp"
                          >
                            <WhatsAppIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Active Action Panel (Modals or Forms) */}
          <div className="space-y-6">
            
            {/* Action Panel */}
            <div className="bg-white border border-sky-100 rounded-3xl shadow-xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-sky-600 uppercase tracking-wider border-b border-sky-50 pb-2 flex items-center gap-1.5">
                <Shield className="w-4.5 h-4.5 text-sky-500" />
                Reset Action Center
              </h2>

              {selectedReq ? (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-2xl text-[11px] text-amber-600 leading-normal">
                    You are resetting the password for: <span className="font-bold">{selectedReq.email}</span> ({selectedReq.role})
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      New Password
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="flex-1 px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 font-mono outline-none transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="px-3 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-2xl text-sky-600 text-xs font-bold transition-all"
                        title="Auto Generate"
                      >
                        Generate
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      {resetLoading ? "Processing..." : "Confirm Reset"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedReq(null)}
                      className="px-4 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-2xl text-xs font-bold border border-sky-100"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-12 text-sky-400 text-xs leading-relaxed">
                  Select a pending request from the list to trigger a password reset.
                </div>
              )}
            </div>

            {/* Quick Helper Instructions */}
            <div className="p-5 bg-sky-50/40 border border-sky-100 rounded-3xl space-y-3">
              <h3 className="text-xs font-bold text-sky-500 uppercase tracking-widest">
                Sharing Credentials
              </h3>
              <p className="text-[11px] text-sky-400 leading-relaxed">
                When you reset a password, the system updates their account immediately. The temporary credentials will be stored in the list. Copy the credentials block and send it to them via email, Slack, or WhatsApp.
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
