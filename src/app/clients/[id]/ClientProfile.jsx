"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  Link2,
  ListTodo,
  Settings,
  Upload,
  User,
  Plus,
  Trash,
  Check,
  Globe,
  Share2,
  FileDown,
  ShieldAlert
} from "lucide-react";

export default function ClientProfilePage() {
  const { id } = useParams();
  const { currentUser, role, loading: authLoading } = useAuth();
  const router = useRouter();

  // Core Data
  const [client, setClient] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [contentList, setContentList] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form states inside tabs
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [teamSelect, setTeamSelect] = useState([]);
  
  // New Project Form
  const [newProjName, setNewProjName] = useState("");
  const [newProjType, setNewProjType] = useState("Marketing");
  const [newProjDeadline, setNewProjDeadline] = useState("");
  const [newProjValue, setNewProjValue] = useState("");

  // New Invoice Form
  const [newInvNum, setNewInvNum] = useState("");
  const [newInvAmount, setNewInvAmount] = useState("");
  const [newInvDue, setNewInvDue] = useState("");

  // New Content Form
  const [newContentTitle, setNewContentTitle] = useState("");
  const [newContentPlatform, setNewContentPlatform] = useState("Instagram");
  const [newContentDate, setNewContentDate] = useState("");
  const [newContentStatus, setNewContentStatus] = useState("Planned");

  // New Document Upload State
  const [docCategory, setDocCategory] = useState("Logo");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // New Account Link Form
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  useEffect(() => {
    if (!currentUser || authLoading) return;

    const fetchClientData = async () => {
      try {
        setLoading(true);
        setError("");

        // 1. Fetch Client doc
        const clientDoc = await getDoc(doc(db, "clients", id));
        if (!clientDoc.exists()) {
          setError("Client profile not found.");
          setLoading(false);
          return;
        }

        const clientData = { id: clientDoc.id, ...clientDoc.data() };
        
        // Auth Guards check
        if (role === "manager" && clientData.accountManager !== currentUser?.uid) {
          setError("Access Denied: Scoped managers only.");
          setLoading(false);
          return;
        }
        if (role === "team" && !clientData.assignedTeam?.includes(currentUser?.uid) && clientData.accountManager !== currentUser?.uid) {
          setError("Access Denied: You are not assigned to this client.");
          setLoading(false);
          return;
        }

        setClient(clientData);
        setNotesText(clientData.notes || "");
        setTeamSelect(clientData.assignedTeam || []);

        // 2. Fetch Team/Users list for assignments
        const teamSnap = await getDocs(collection(db, "users"));
        const members = [];
        teamSnap.forEach((doc) => {
          members.push({ id: doc.id, ...doc.data() });
        });
        setTeamMembers(members);

        // 3. Real-time subqueries
        const unsubChecklist = onSnapshot(
          query(collection(db, "onboardingChecklists"), where("clientId", "==", id)),
          (snap) => {
            if (!snap.empty) {
              setChecklist({ id: snap.docs[0].id, ...snap.docs[0].data() });
            }
          }
        );

        const unsubProjects = onSnapshot(
          query(collection(db, "projects"), where("clientId", "==", id)),
          (snap) => {
            const list = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            setProjects(list);
          }
        );

        const unsubInvoices = onSnapshot(
          query(collection(db, "invoices"), where("clientId", "==", id)),
          (snap) => {
            const list = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            setInvoices(list);
          }
        );

        const unsubContent = onSnapshot(
          query(collection(db, "content"), where("clientId", "==", id)),
          (snap) => {
            const list = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            setContentList(list);
          }
        );

        const unsubDocs = onSnapshot(
          query(collection(db, "documents"), where("clientId", "==", id)),
          (snap) => {
            const list = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            setDocuments(list);
          }
        );

        setLoading(false);

        return () => {
          unsubChecklist();
          unsubProjects();
          unsubInvoices();
          unsubContent();
          unsubDocs();
        };
      } catch (err) {
        console.error("Client load error:", err);
        setError("Error querying database records.");
        setLoading(false);
      }
    };

    fetchClientData();
  }, [currentUser, role, authLoading, id]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white min-h-[500px]">
        <div className="w-full max-w-md p-8 border border-sky-100 rounded-3xl shadow-xl text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-sky-600">Access Restricted</h2>
          <p className="text-sm text-sky-400 mt-2">{error}</p>
          <button
            onClick={() => router.push("/clients")}
            className="mt-6 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold"
          >
            Back to Clients
          </button>
        </div>
      </div>
    );
  }

  // Update Client Fields
  const handleUpdateClient = async (updatedFields) => {
    try {
      const clientRef = doc(db, "clients", id);
      await updateDoc(clientRef, updatedFields);
      setClient((prev) => ({ ...prev, ...updatedFields }));
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
  };

  // Onboarding Toggle
  const handleToggleChecklist = async (key, val) => {
    if (!checklist) return;
    try {
      const checkRef = doc(db, "onboardingChecklists", checklist.id);
      await updateDoc(checkRef, { [key]: val });
    } catch (err) {
      console.error("Checklist toggle failure:", err);
    }
  };

  // Add Project
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjName) return;

    try {
      const payload = {
        name: newProjName,
        clientId: id,
        type: newProjType,
        description: "",
        startDate: new Date().toISOString().split("T")[0],
        deadline: newProjDeadline || "",
        completionDate: "",
        value: Number(newProjValue) || 0,
        estimatedCost: 0,
        actualCost: 0,
        profit: 0,
        projectManager: client.accountManager || currentUser?.uid,
        assignedTeam: client.assignedTeam || [],
        status: "In Progress",
        priority: "Medium",
        progressPercent: 0,
        driveFolder: "",
        notes: "",
      };

      await addDoc(collection(db, "projects"), payload);
      setNewProjName("");
      setNewProjDeadline("");
      setNewProjValue("");
    } catch (err) {
      alert("Error adding project: " + err.message);
    }
  };

  // Add Invoice
  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!newInvNum || !newInvAmount) return;

    try {
      const amount = Number(newInvAmount);
      const taxRate = client.financials?.taxRate || 13;
      const tax = Number(((amount * taxRate) / 100).toFixed(2));
      const total = amount + tax;

      const payload = {
        invoiceNumber: newInvNum,
        clientId: id,
        projectId: "",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: newInvDue || "",
        amount,
        tax,
        total,
        amountPaid: 0,
        balance: total,
        status: "Sent",
        paymentMethod: client.financials?.paymentMethod || "Credit Card",
        receiptUrl: "",
        notes: "",
      };

      await addDoc(collection(db, "invoices"), payload);
      setNewInvNum("");
      setNewInvAmount("");
      setNewInvDue("");
    } catch (err) {
      alert("Error adding invoice: " + err.message);
    }
  };

  // Add Content Item
  const handleAddContent = async (e) => {
    e.preventDefault();
    if (!newContentTitle) return;

    try {
      const payload = {
        title: newContentTitle,
        clientId: id,
        platform: newContentPlatform,
        contentType: "Video",
        shootDate: newContentDate || "",
        editingStatus: "Planned",
        approvalStatus: "Draft",
        postingDate: "",
        publishedLink: "",
      };

      await addDoc(collection(db, "content"), payload);
      setNewContentTitle("");
      setNewContentDate("");
    } catch (err) {
      alert("Error adding content tracker: " + err.message);
    }
  };

  // Document File Upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadLoading(true);
    try {
      const filePath = `/clients/${id}/documents/${docCategory}/${Date.now()}_${uploadFile.name}`;
      const storageRef = ref(storage, filePath);
      
      const snapshot = await uploadBytes(storageRef, uploadFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Write doc to Firestore
      const docPayload = {
        fileName: uploadFile.name,
        type: uploadFile.type || "file",
        clientId: id,
        projectId: "",
        category: docCategory,
        uploadDate: new Date().toISOString().split("T")[0],
        uploadedBy: currentUser?.email || "unknown",
        version: "1.0",
        approvalStatus: "Approved",
        storageUrl: downloadUrl,
        notes: "",
      };

      await addDoc(collection(db, "documents"), docPayload);
      setUploadFile(null);
      alert("Document uploaded successfully.");
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // Add Link
  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newLinkTitle || !newLinkUrl) return;

    try {
      const links = client.accountLinks || [];
      const updatedLinks = [...links, { title: newLinkTitle, url: newLinkUrl }];
      await handleUpdateClient({ accountLinks: updatedLinks });
      setNewLinkTitle("");
      setNewLinkUrl("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveLink = async (index) => {
    try {
      const links = client.accountLinks || [];
      const updatedLinks = links.filter((_, i) => i !== index);
      await handleUpdateClient({ accountLinks: updatedLinks });
    } catch (err) {
      console.error(err);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "projects", label: "Projects", icon: Briefcase },
    { id: "payments", label: "Payments", icon: CreditCard, adminOnly: true },
    { id: "content", label: "Content", icon: Calendar },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "links", label: "Account Links", icon: Link2 },
    { id: "checklist", label: "Onboarding Checklist", icon: ListTodo },
  ].filter(t => !t.adminOnly || (role === "admin" || role === "manager"));

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Back and Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-sky-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/clients")}
              className="p-2 rounded-xl hover:bg-sky-50 text-sky-500 border border-sky-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-sky-600">{client.businessName}</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 border border-sky-200 text-sky-600 rounded-full">
                  {client.status}
                </span>
              </div>
              <p className="text-xs text-sky-400 font-semibold">{client.industry} • Joined {client.dateJoined}</p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-sky-100 overflow-x-auto flex gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? "border-sky-500 text-sky-600"
                    : "border-transparent text-sky-400 hover:text-sky-500"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="bg-white rounded-3xl min-h-[300px]">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Profile details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-sky-50">
                    <h3 className="text-sm font-bold text-sky-600">Company Overview</h3>
                    <button
                      onClick={() => setIsEditingClient(!isEditingClient)}
                      className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl text-xs font-bold transition-all"
                    >
                      {isEditingClient ? "Cancel" : "Edit Profile"}
                    </button>
                  </div>

                  {isEditingClient ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                      <div>
                        <label className="block text-sky-500 mb-1 font-bold uppercase">Legal Name</label>
                        <input
                          type="text"
                          defaultValue={client.legalName}
                          onChange={(e) => handleUpdateClient({ legalName: e.target.value })}
                          className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sky-500 mb-1 font-bold uppercase">Contact Person</label>
                        <input
                          type="text"
                          defaultValue={client.contactPerson}
                          onChange={(e) => handleUpdateClient({ contactPerson: e.target.value })}
                          className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sky-500 mb-1 font-bold uppercase">Email Address</label>
                        <input
                          type="email"
                          defaultValue={client.email}
                          onChange={(e) => handleUpdateClient({ email: e.target.value })}
                          className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sky-500 mb-1 font-bold uppercase">Phone Number</label>
                        <input
                          type="text"
                          defaultValue={client.phone}
                          onChange={(e) => handleUpdateClient({ phone: e.target.value })}
                          className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sky-500 mb-1 font-bold uppercase">Website</label>
                        <input
                          type="text"
                          defaultValue={client.website}
                          onChange={(e) => handleUpdateClient({ website: e.target.value })}
                          className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-sky-600">
                      <div>
                        <p className="text-sky-400 font-bold uppercase">Legal Entity Name</p>
                        <p className="mt-0.5">{client.legalName || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sky-400 font-bold uppercase">Primary Representative</p>
                        <p className="mt-0.5">{client.contactPerson || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sky-400 font-bold uppercase">Email Address</p>
                        <p className="mt-0.5">{client.email}</p>
                      </div>
                      <div>
                        <p className="text-sky-400 font-bold uppercase">Phone Line</p>
                        <p className="mt-0.5">{client.phone || "Not set"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-sky-400 font-bold uppercase">Website Domain</p>
                        <p className="mt-0.5 text-sky-500 underline">
                          {client.website ? (
                            <a href={client.website} target="_blank" rel="noopener noreferrer">
                              {client.website}
                            </a>
                          ) : (
                            "Not set"
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes division */}
                <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-3">
                  <h3 className="text-sm font-bold text-sky-600">Client Strategy & Notes</h3>
                  <textarea
                    rows={4}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Provide special notes, retainer updates, shoot guidelines..."
                    className="w-full p-3 border border-sky-100 rounded-2xl text-xs text-sky-600 font-medium focus:outline-none focus:ring-1 focus:ring-sky-300"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleUpdateClient({ notes: notesText })}
                      className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              </div>

              {/* Team assignment section */}
              <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4 h-fit">
                <h3 className="text-sm font-bold text-sky-600">Assigned Team Pool</h3>
                <div className="space-y-3">
                  {teamMembers.map((member) => {
                    const isAssigned = teamSelect.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        onClick={async () => {
                          let nextTeam;
                          if (isAssigned) {
                            nextTeam = teamSelect.filter((uid) => uid !== member.id);
                          } else {
                            nextTeam = [...teamSelect, member.id];
                          }
                          setTeamSelect(nextTeam);
                          await handleUpdateClient({ assignedTeam: nextTeam });
                        }}
                        className={`w-full p-2.5 rounded-2xl border text-xs text-left flex items-center justify-between font-semibold transition-all ${
                          isAssigned
                            ? "bg-sky-50 border-sky-200 text-sky-600"
                            : "bg-white border-sky-100 text-sky-400 hover:bg-sky-50/10"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate">{member.name}</p>
                          <p className="text-[10px] text-sky-400 capitalize">{member.role}</p>
                        </div>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PROJECTS */}
          {activeTab === "projects" && (
            <div className="space-y-6">
              
              {/* Form creation */}
              {(role === "admin" || role === "manager") && (
                <form onSubmit={handleAddProject} className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-sky-600">Launch Project Campaign</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-semibold">
                    <div className="sm:col-span-2">
                      <label className="block text-sky-500 mb-1">Project Name</label>
                      <input
                        type="text"
                        required
                        value={newProjName}
                        onChange={(e) => setNewProjName(e.target.value)}
                        placeholder="e.g. Autumn Fashion Shoot"
                        className="w-full p-2 border border-sky-100 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Type</label>
                      <select
                        value={newProjType}
                        onChange={(e) => setNewProjType(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      >
                        <option value="Social Media">Social Media</option>
                        <option value="Video Shoot">Video Production</option>
                        <option value="Web Development">Web Development</option>
                        <option value="Ad Campaign">Ad Campaign</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Project Value ($)</label>
                      <input
                        type="number"
                        value={newProjValue}
                        onChange={(e) => setNewProjValue(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full p-2 border border-sky-100 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Deadline Date</label>
                      <input
                        type="date"
                        value={newProjDeadline}
                        onChange={(e) => setNewProjDeadline(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-end justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow"
                      >
                        Create Project
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Projects List */}
              <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-sky-50/20 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                      <th className="p-4 px-6">Name</th>
                      <th className="p-4 px-6">Type</th>
                      <th className="p-4 px-6">Status</th>
                      <th className="p-4 px-6">Deadline</th>
                      <th className="p-4 px-6">Progress</th>
                      <th className="p-4 px-6 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sky-400">
                          No active projects found for this client.
                        </td>
                      </tr>
                    ) : (
                      projects.map((p) => (
                        <tr key={p.id} className="hover:bg-sky-50/10">
                          <td className="p-4 px-6 font-bold">{p.name}</td>
                          <td className="p-4 px-6">{p.type}</td>
                          <td className="p-4 px-6">
                            <span className="px-2 py-0.5 border border-sky-100 text-sky-500 rounded bg-sky-50/30">
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4 px-6">{p.deadline || "None"}</td>
                          <td className="p-4 px-6">
                            <div className="w-full bg-sky-50 rounded-full h-1.5 max-w-[80px]">
                              <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${p.progressPercent || 0}%` }}></div>
                            </div>
                          </td>
                          <td className="p-4 px-6 text-right">${Number(p.value).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: PAYMENTS (Admin/Manager Scoped) */}
          {activeTab === "payments" && (role === "admin" || role === "manager") && (
            <div className="space-y-6">
              
              {/* Financial Profile & Retainer edits */}
              <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-sky-600">Financial Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-semibold">
                  <div>
                    <label className="block text-sky-500 mb-1">Monthly Retainer ($)</label>
                    <input
                      type="number"
                      defaultValue={client.financials?.monthlyRetainer || 0}
                      onBlur={(e) => handleUpdateClient({ "financials.monthlyRetainer": Number(e.target.value) || 0 })}
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">GST/Tax Number</label>
                    <input
                      type="text"
                      defaultValue={client.financials?.gstNumber || ""}
                      onBlur={(e) => handleUpdateClient({ "financials.gstNumber": e.target.value })}
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Billing Email</label>
                    <input
                      type="email"
                      defaultValue={client.financials?.billingEmail || ""}
                      onBlur={(e) => handleUpdateClient({ "financials.billingEmail": e.target.value })}
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Frequency</label>
                    <select
                      defaultValue={client.financials?.paymentFrequency || "Monthly"}
                      onChange={(e) => handleUpdateClient({ "financials.paymentFrequency": e.target.value })}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    >
                      <option value="One-Time">One-Time</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Bi-Weekly">Bi-Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Invoicing Section & Create Form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Form to log invoice */}
                <form onSubmit={handleAddInvoice} className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4 h-fit">
                  <h3 className="text-sm font-bold text-sky-600">Issue Invoice</h3>
                  <div className="space-y-3 text-xs font-semibold">
                    <div>
                      <label className="block text-sky-500 mb-1">Invoice Number</label>
                      <input
                        type="text"
                        required
                        value={newInvNum}
                        onChange={(e) => setNewInvNum(e.target.value)}
                        placeholder="e.g. MM-2026-001"
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Base Amount ($)</label>
                      <input
                        type="number"
                        required
                        value={newInvAmount}
                        onChange={(e) => setNewInvAmount(e.target.value)}
                        placeholder="e.g. 1500"
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Due Date</label>
                      <input
                        type="date"
                        required
                        value={newInvDue}
                        onChange={(e) => setNewInvDue(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold transition-all shadow"
                    >
                      Log Invoice
                    </button>
                  </div>
                </form>

                {/* Invoice listing */}
                <div className="lg:col-span-2 bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden flex flex-col">
                  <div className="p-4 bg-sky-50/20 border-b border-sky-100">
                    <h3 className="text-sm font-bold text-sky-600">Client Invoices</h3>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-sky-50/10 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                          <th className="p-3 px-4">Invoice #</th>
                          <th className="p-3 px-4">Issued</th>
                          <th className="p-3 px-4">Due Date</th>
                          <th className="p-3 px-4 text-center">Status</th>
                          <th className="p-3 px-4 text-right">Total</th>
                          <th className="p-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                        {invoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-sky-400">
                              No invoices found.
                            </td>
                          </tr>
                        ) : (
                          invoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-sky-50/5">
                              <td className="p-3 px-4 font-bold">{inv.invoiceNumber}</td>
                              <td className="p-3 px-4">{inv.invoiceDate}</td>
                              <td className="p-3 px-4">{inv.dueDate}</td>
                              <td className="p-3 px-4 text-center">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                  inv.status === "Paid"
                                    ? "bg-sky-50 text-sky-600 border border-sky-100"
                                    : "bg-red-50 text-red-500 border border-red-100"
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="p-3 px-4 text-right font-bold">${Number(inv.total).toLocaleString()}</td>
                              <td className="p-3 px-4 text-right">
                                {inv.status !== "Paid" && (
                                  <button
                                    onClick={async () => {
                                      const invRef = doc(db, "invoices", inv.id);
                                      await updateDoc(invRef, {
                                        status: "Paid",
                                        amountPaid: inv.total,
                                        balance: 0
                                      });
                                    }}
                                    className="px-2 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-[10px] font-bold transition"
                                  >
                                    Mark Paid
                                  </button>
                                )}
                              </td>
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

          {/* TAB 4: CONTENT */}
          {activeTab === "content" && (
            <div className="space-y-6">
              
              {/* Form creation */}
              {(role === "admin" || role === "manager") && (
                <form onSubmit={handleAddContent} className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-sky-600">Schedule Deliverable / Post</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-semibold">
                    <div className="sm:col-span-2">
                      <label className="block text-sky-500 mb-1">Content Title / Subject</label>
                      <input
                        type="text"
                        required
                        value={newContentTitle}
                        onChange={(e) => setNewContentTitle(e.target.value)}
                        placeholder="e.g. Logo Reveal Reel"
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Platform</label>
                      <select
                        value={newContentPlatform}
                        onChange={(e) => setNewContentPlatform(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      >
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">TikTok</option>
                        <option value="YouTube">YouTube</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Website">Website</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Shoot Date</label>
                      <input
                        type="date"
                        value={newContentDate}
                        onChange={(e) => setNewContentDate(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-4 flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow"
                      >
                        Schedule Content
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Content Grid */}
              <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-sky-50/20 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                      <th className="p-4 px-6">Title</th>
                      <th className="p-4 px-6">Platform</th>
                      <th className="p-4 px-6">Shoot Date</th>
                      <th className="p-4 px-6">Approval Status</th>
                      <th className="p-4 px-6 text-right">Published Link</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                    {contentList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-sky-400">
                          No deliverables or shoots scheduled.
                        </td>
                      </tr>
                    ) : (
                      contentList.map((c) => (
                        <tr key={c.id} className="hover:bg-sky-50/10">
                          <td className="p-4 px-6 font-bold">{c.title}</td>
                          <td className="p-4 px-6">{c.platform}</td>
                          <td className="p-4 px-6">{c.shootDate || "Not set"}</td>
                          <td className="p-4 px-6">
                            <select
                              defaultValue={c.approvalStatus || "Draft"}
                              onChange={async (e) => {
                                const contentRef = doc(db, "content", c.id);
                                await updateDoc(contentRef, { approvalStatus: e.target.value });
                              }}
                              className="p-1 border border-sky-100 rounded text-[10px] font-bold text-sky-600 focus:outline-none"
                            >
                              <option value="Draft">Draft</option>
                              <option value="Awaiting Approval">Awaiting Approval</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                          <td className="p-4 px-6 text-right text-sky-500 underline">
                            {c.publishedLink ? (
                              <a href={c.publishedLink} target="_blank" rel="noopener noreferrer">
                                Link
                              </a>
                            ) : (
                              "None"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 5: DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              
              {/* Document upload form */}
              <form onSubmit={handleFileUpload} className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-sky-600">Upload Logo, Contract or brand collateral</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold items-end">
                  <div>
                    <label className="block text-sky-500 mb-1">Document Category</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    >
                      <option value="Logo">Logo</option>
                      <option value="Logo Transparent">Logo Transparent</option>
                      <option value="Brand Guide">Brand Guide</option>
                      <option value="Contracts">Contracts</option>
                      <option value="Proposals">Proposals</option>
                      <option value="Receipts">Receipts</option>
                      <option value="Raw Footage">Raw Footage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Select File</label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setUploadFile(e.target.files[0])}
                      className="w-full p-1.5 border border-sky-100 rounded-xl text-[10px]"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={uploadLoading}
                      className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold flex items-center justify-center gap-1 shadow disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadLoading ? "Uploading..." : "Upload to Storage"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Document Registry cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {documents.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-sky-400 text-xs font-semibold">
                    No documents uploaded.
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div key={doc.id} className="p-4 border border-sky-100 rounded-3xl shadow-md bg-white space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="px-2 py-0.5 text-[8px] uppercase tracking-widest font-bold bg-sky-50 border border-sky-200 text-sky-600 rounded-md">
                          {doc.category}
                        </span>
                        <h4 className="text-xs font-bold text-sky-600 truncate mt-1.5" title={doc.fileName}>
                          {doc.fileName}
                        </h4>
                        <p className="text-[10px] text-sky-400 mt-0.5">Uploaded on {doc.uploadDate}</p>
                      </div>
                      <div className="pt-3 border-t border-sky-50 flex justify-end">
                        <a
                          href={doc.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-600 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <FileDown className="w-3 h-3" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 6: ACCOUNT LINKS */}
          {activeTab === "links" && (
            <div className="space-y-6">
              
              {/* Form creation */}
              {(role === "admin" || role === "manager") && (
                <form onSubmit={handleAddLink} className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-sky-600">Register Asset/Meta/Drive Directory</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold items-end">
                    <div>
                      <label className="block text-sky-500 mb-1">Shortcut Title</label>
                      <input
                        type="text"
                        required
                        value={newLinkTitle}
                        onChange={(e) => setNewLinkTitle(e.target.value)}
                        placeholder="e.g. Shared Google Drive Folder"
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Resource URL</label>
                      <input
                        type="url"
                        required
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow"
                      >
                        Add Link
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Links view */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(!client.accountLinks || client.accountLinks.length === 0) ? (
                  <div className="col-span-full text-center py-12 text-sky-400 text-xs font-semibold">
                    No resource shortcuts mapped.
                  </div>
                ) : (
                  client.accountLinks.map((link, idx) => (
                    <div key={idx} className="p-4 border border-sky-100 rounded-3xl shadow-md bg-white flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-sky-600 truncate">{link.title}</h4>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-sky-400 hover:text-sky-500 hover:underline truncate block"
                        >
                          {link.url}
                        </a>
                      </div>
                      <div className="flex gap-1 items-center">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-500 border border-sky-100"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                        {(role === "admin" || role === "manager") && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(idx)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 border border-sky-100 hover:border-red-100"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 7: ONBOARDING CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4">
              <div className="pb-2 border-b border-sky-50">
                <h3 className="text-sm font-bold text-sky-600">Client Onboarding Milestones</h3>
                <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">17 Core Agency Tasks Checklist</p>
              </div>

              {!checklist ? (
                <div className="text-center py-12 text-sky-400 text-xs font-semibold">
                  No checklist registered for this client.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { key: "clientInfoCollected", label: "Client Info Collected" },
                    { key: "contractSigned", label: "Contract Signed" },
                    { key: "depositReceived", label: "Deposit Received" },
                    { key: "invoiceCreated", label: "Invoice Created" },
                    { key: "driveFolderCreated", label: "Drive Folder Created" },
                    { key: "logoUploaded", label: "Logo Assets Uploaded" },
                    { key: "brandAssetsUploaded", label: "Brand Collaterals Uploaded" },
                    { key: "socialMediaAccess", label: "Social Media Credentials Logged" },
                    { key: "metaBusinessAccess", label: "Meta Business Manager Access" },
                    { key: "adAccountAccess", label: "Meta Ad Account Access Shared" },
                    { key: "websiteAccess", label: "Website CMS/Hosting access shared" },
                    { key: "servicesConfirmed", label: "Services Structure Finalized" },
                    { key: "deliverablesConfirmed", label: "Deliverables Pipeline Confirmed" },
                    { key: "firstShootScheduled", label: "First Content Shoot Scheduled" },
                    { key: "teamAssigned", label: "Team Members Assigned" },
                    { key: "addedToCalendar", label: "Google Calendar Sync complete" },
                    { key: "reportingTemplateCreated", label: "Monthly Report Dashboard Setup" },
                  ].map((item) => {
                    const isChecked = checklist[item.key] === true;
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => handleToggleChecklist(item.key, !isChecked)}
                        className={`p-3.5 rounded-2xl border text-xs text-left flex items-center justify-between font-semibold transition-all ${
                          isChecked
                            ? "bg-sky-50 border-sky-200 text-sky-600"
                            : "bg-white border-sky-100 text-sky-400 hover:bg-sky-50/10"
                        }`}
                      >
                        <span>{item.label}</span>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked
                            ? "bg-sky-500 border-sky-500 text-white"
                            : "border-sky-200 bg-white"
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
