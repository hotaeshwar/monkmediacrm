"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth, db, firebaseConfig } from "@/lib/firebase";
import { collection, getDocs, addDoc, doc, setDoc } from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert, UserCheck, Plus, Check, Copy, Key, X } from "lucide-react";
import Loader from "@/components/Loader";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.455L0 24zm6.59-11.236c-.144-.24-.016-.372.104-.492.112-.112.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.47-.393-.407-.54-.415-.137-.007-.294-.008-.45-.008-.156 0-.41.058-.624.294-.216.236-.82.8-.82 1.95s.84 2.26.957 2.42c.117.16 1.65 2.518 3.99 3.53.557.24 1.002.38 1.344.49.56.18 1.07.15 1.47.09.447-.067 1.38-.564 1.575-1.11.195-.546.195-1.01.137-1.11-.058-.09-.215-.14-.45-.257-.235-.117-1.38-.68-1.595-.76-.215-.08-.37-.12-.527.12-.157.24-.61.76-.748.92-.137.16-.274.18-.51.06-.235-.117-.994-.365-1.894-1.17-.7-.624-1.173-1.396-1.31-1.63z"/>
  </svg>
);

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

  // Client Selection / Provisioning States
  const [clientSelectionMode, setClientSelectionMode] = useState("existing"); // 'existing' or 'new'
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClientBusinessName, setNewClientBusinessName] = useState("");

  // Data
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sharePhone, setSharePhone] = useState("");

  const handleWhatsAppShare = (email, password, roleVal, customPhoneNum) => {
    const cleanPhone = customPhoneNum ? customPhoneNum.replace(/[^0-9]/g, "") : "";
    const portalPath = roleVal === "manager" ? "manager" : roleVal === "client" ? "client" : "team";
    const text = `Hi! Here are your login credentials for the Monk Media Portal:

Email: ${email}
Password: ${password}
Portal Link: ${window.location.origin}/login/${portalPath}

Please keep these credentials secure.`;

    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, "_blank");
  };

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

      let targetClients = selectedClients;

      if (userRole === "client") {
        if (clientSelectionMode === "new") {
          if (!newClientBusinessName.trim()) {
            throw new Error("Please specify the Client's Business Name.");
          }

          const onboardingDate = new Date().toISOString().split("T")[0];
          const start = new Date(onboardingDate + "T12:00:00");
          const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
          const nextPaymentDateStr = nextMonth.toISOString().split("T")[0];
          const dueDateStr = String(start.getDate());

          const clientPayload = {
            businessName: newClientBusinessName.trim(),
            legalName: newClientBusinessName.trim(),
            contactPerson: name,
            phone: phone || "",
            email: email || "",
            secondaryContact: "",
            website: "",
            address: "",
            city: "",
            province: "",
            postalCode: "",
            industry: "Other",
            status: "Active onboarding",
            dateJoined: onboardingDate,
            accountManager: currentUser?.uid,
            leadSource: "Direct",
            notes: "Client profile created automatically during client login provisioning.",
            logoUrl: "",
            logoTransparentUrl: "",
            services: [],
            deliverables: "",
            accountLinks: [],
            assignedTeam: [],
            financials: {
              monthlyRetainer: 0,
              oneTimeProjectValue: 0,
              paymentFrequency: "Monthly",
              dueDate: dueDateStr,
              projectStartDate: onboardingDate,
              contractStart: onboardingDate,
              contractEnd: "",
              taxRate: 13,
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

          const docRef = await addDoc(collection(db, "clients"), clientPayload);
          targetClients = [docRef.id];

          // Dynamically refresh clients list
          const snap = await getDocs(collection(db, "clients"));
          const list = [];
          snap.forEach((doc) => {
            list.push({ id: doc.id, businessName: doc.data().businessName });
          });
          setClients(list);
        } else {
          if (!selectedClientId) {
            throw new Error("Please select an existing client for this user.");
          }
          targetClients = [selectedClientId];
        }
      }

      // Initialize secondary Auth to create user record without signing out Admin
      const secondaryApp = getApps().find((app) => app.name === "secondary") || initializeApp(firebaseConfig, "secondary");
      const secondaryAuth = getAuth(secondaryApp);

      let userRecord;
      try {
        userRecord = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      } catch (authError) {
        console.error("Firebase Auth Creation Error:", authError);
        throw new Error(authError.message || "Failed to create Auth account.");
      }

      const newUserUid = userRecord.user.uid;
      const parsedRate = Number(rate) || 0;

      const userDocPayload = {
        name,
        email,
        role: userRole,
        phone: phone || "",
        status: "active",
        createdAt: new Date().toISOString()
      };

      if (userRole === "client") {
        userDocPayload.clientId = targetClients[0] || "";
      } else {
        userDocPayload.employmentType = employmentType || "Contractor";
        userDocPayload.paymentModel = paymentModel || "Hourly";
        userDocPayload.rate = parsedRate;
        userDocPayload.assignedClients = targetClients;
        userDocPayload.assignedProjects = [];
      }

      // Save directly to Firestore users collection
      await setDoc(doc(db, "users", newUserUid), userDocPayload);

      // Sign out from secondary auth instance
      await signOut(secondaryAuth);

      const successResponse = {
        success: true,
        uid: newUserUid,
        email: email,
        password: password,
        role: userRole,
        message: "Team member user created successfully."
      };

      setSuccessData(successResponse);
      setSharePhone(phone || "");
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setRate("");
      setSelectedClients([]);
      setNewClientBusinessName("");
      setSelectedClientId("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!successData) return;
    const portalPath = successData.role === "manager" ? "manager" : successData.role === "client" ? "client" : "team";
    const txt = `Email: ${successData.email}\nPassword: ${successData.password}\nPortal Link: ${
      window.location.origin
    }/login/${portalPath}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auth Protection guard
  if (authLoading) {
    return <Loader fullPage={true} message="Checking admin session..." />;
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
          <h1 className="text-3xl font-bold text-sky-600">Create Account / Portal</h1>
          <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
            Provision Manager, Contractor & Client Portals
          </p>
        </div>

        {/* Success Card */}
        {successData && (
          <div className="p-6 bg-sky-50/50 border border-sky-100 rounded-3xl shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                      {successData.role === "manager" ? "/login/manager" : successData.role === "client" ? "/login/client" : "/login/team"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow flex items-center justify-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Credentials"}
                </button>
              </div>
            </div>
            
            {/* WhatsApp Integration Panel */}
            <div className="pt-4 border-t border-sky-100 flex flex-col sm:flex-row items-end gap-3 max-w-md">
              <div className="w-full">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-sky-500 mb-1">
                  Share via WhatsApp Number
                </label>
                <input
                  type="text"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  placeholder="e.g. +1234567890"
                  className="w-full px-3 py-2 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-xl text-xs text-sky-600 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => handleWhatsAppShare(successData.email, successData.password, successData.role, sharePhone)}
                className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-2 flex-shrink-0"
              >
                <WhatsAppIcon />
                Share on WhatsApp
              </button>
            </div>
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
                  <option value="client">Client Portal</option>
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {userRole === "client" ? (
                <>
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">
                    Client Association
                  </h3>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-2">
                      Client Linking Mode
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                      <label className="flex items-center gap-2 text-xs font-semibold text-sky-600 cursor-pointer">
                        <input
                          type="radio"
                          name="clientSelectionMode"
                          value="existing"
                          checked={clientSelectionMode === "existing"}
                          onChange={() => setClientSelectionMode("existing")}
                          className="text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                        />
                        Link to Existing Client
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-sky-600 cursor-pointer">
                        <input
                          type="radio"
                          name="clientSelectionMode"
                          value="new"
                          checked={clientSelectionMode === "new"}
                          onChange={() => setClientSelectionMode("new")}
                          className="text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                        />
                        Create a New Client
                      </label>
                    </div>
                  </div>

                  {clientSelectionMode === "existing" ? (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                        Select Existing Client
                      </label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                      >
                        <option value="">-- Choose Client --</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.businessName}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                        Client Business Name
                      </label>
                      <input
                        type="text"
                        value={newClientBusinessName}
                        onChange={(e) => setNewClientBusinessName(e.target.value)}
                        placeholder="e.g. Metric Air Limited"
                        className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                      Client Contact Phone (for sharing details)
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 019-2834"
                      className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                    />
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {/* Client Multi-select Area */}
          {userRole !== "client" && (
            <div className="pt-4 border-t border-sky-50">
              <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-2">
                Assign Scoped Clients
              </label>
              {clients.length === 0 ? (
                <p className="text-xs text-sky-400">
                  No clients exist in the database. You can assign clients to this user later.
                </p>
              ) : (
                <div className="space-y-3">
                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !selectedClients.includes(val)) {
                        setSelectedClients([...selectedClients, val]);
                      }
                    }}
                    className="w-full max-w-md px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none transition-all duration-200"
                  >
                    <option value="">-- Choose Client to Assign --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.businessName}
                      </option>
                    ))}
                  </select>

                  {/* Selected Client Chips */}
                  {selectedClients.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {selectedClients.map((clientId) => {
                        const clientName = clients.find((c) => c.id === clientId)?.businessName || "Unknown Client";
                        return (
                          <div
                            key={clientId}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-100 text-sky-600 rounded-full text-xs font-semibold shadow-xs"
                          >
                            <span>{clientName}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedClients(selectedClients.filter((id) => id !== clientId))}
                              className="text-sky-400 hover:text-red-500 focus:outline-none transition-colors"
                              title="Remove Assignment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-sky-50">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (userRole === "client" ? "Creating Client Account..." : "Creating Member...") : (userRole === "client" ? "Create Client Account" : "Create Team Member")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
