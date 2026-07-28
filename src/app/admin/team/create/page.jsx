"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert, UserCheck, Plus, Check, Copy } from "lucide-react";

export default function CreateTeamPage() {
  const { currentUser, role, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState("team"); // 'manager' or 'team'
  const [phone, setPhone] = useState("");
  const [employmentType, setEmploymentType] = useState("Contractor");
  const [paymentModel, setPaymentModel] = useState("Hourly");
  const [rate, setRate] = useState("");
  const [selectedClients, setSelectedClients] = useState([]);

  // Data
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load clients list for assignment
  useEffect(() => {
    async function getClients() {
      try {
        const snap = await getDocs(collection(db, "clients"));
        const list = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, businessName: doc.data().businessName });
        });
        setClients(list);
      } catch (err) {
        console.error("Error loading clients list:", err);
      }
    }
    if (currentUser && role === "admin") {
      getClients();
    }
  }, [currentUser, role]);

  // Generate a secure random password
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let genPass = "";
    for (let i = 0; i < 12; i++) {
      genPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(genPass);
  };

  const handleClientToggle = (clientId) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter((id) => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccessData(null);

    try {
      if (!auth.currentUser) {
        throw new Error("You must be logged in as an Administrator.");
      }

      // Get current logged in user ID token
      const idToken = await auth.currentUser.getIdToken();

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: userRole,
          phone,
          employmentType,
          paymentModel,
          rate,
          assignedClients: selectedClients,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account.");
      }

      setSuccessData(data);
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRate("");
      setSelectedClients([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!successData) return;
    const txt = `Email: ${successData.email}\nPassword: ${successData.password}\nPortal Link: ${
      window.location.origin
    }/login/${successData.role === "manager" ? "manager" : "team"}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auth Protection guard
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

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-sky-600">Create Team Member</h1>
          <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
            Provision Manager & Contractor Portals
          </p>
        </div>

        {/* Success Card */}
        {successData && (
          <div className="p-6 bg-sky-50/50 border border-sky-100 rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <UserCheck className="w-6 h-6 text-sky-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-sm font-bold text-sky-600">Account Created Successfully!</h3>
                <p className="text-xs text-sky-400 mt-1">
                  Share these login credentials with the user. They will only be displayed once.
                </p>
                <div className="mt-3 bg-white p-3 rounded-2xl border border-sky-100 text-xs font-mono text-sky-600 space-y-1.5 max-w-sm">
                  <div><span className="font-bold">Email:</span> {successData.email}</div>
                  <div><span className="font-bold">Password:</span> {successData.password}</div>
                  <div>
                    <span className="font-bold">Portal:</span>{" "}
                    {successData.role === "manager" ? "/login/manager" : "/login/team"}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Credentials"}
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-50/50 border border-red-100 text-red-500 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Creation Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-sky-100 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">
                Basic Credentials
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Simran Monk"
                  className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@monkmedia.com"
                  className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-4 h-4 text-sky-400" />
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                  Role
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                >
                  <option value="team">Team Member / Contractor</option>
                  <option value="manager">Account Manager</option>
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">
                Employment & Financial Profile
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 019-2834"
                  className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                    Employment
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-xs text-sky-600 outline-none transition-all duration-200"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                    Payment Model
                  </label>
                  <select
                    value={paymentModel}
                    onChange={(e) => setPaymentModel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-xs text-sky-600 outline-none transition-all duration-200"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Hourly">Hourly</option>
                    <option value="Retainer">Retainer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                  Compensation Rate ($)
                </label>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 50 (hourly rate or monthly salary)"
                  className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Client Multi-select Area */}
          <div className="pt-4 border-t border-sky-50">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-3">
              Assign Scoped Clients
            </h3>
            {clients.length === 0 ? (
              <p className="text-xs text-sky-400">
                No clients exist in the database. You can assign clients to this user later.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {clients.map((c) => {
                  const isChecked = selectedClients.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => handleClientToggle(c.id)}
                      className={`p-3 rounded-2xl text-left border text-xs font-semibold transition-all duration-200 flex items-center justify-between ${
                        isChecked
                          ? "bg-sky-50 border-sky-200 text-sky-600"
                          : "bg-white border-sky-100 text-sky-500 hover:bg-sky-50/20"
                      }`}
                    >
                      <span className="truncate pr-2">{c.businessName}</span>
                      {isChecked && <Plus className="w-3.5 h-3.5 text-sky-600 flex-shrink-0 transform rotate-45" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-sky-50">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Member..." : "Create Team Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
