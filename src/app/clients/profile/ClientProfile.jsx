"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  deleteDoc
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
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
  ShieldAlert,
  X,
  Save,
  Edit,
  KeyRound
} from "lucide-react";
import Loader from "@/components/Loader";

export default function ClientProfilePage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { currentUser, role, clientId, loading: authLoading } = useAuth();
  const router = useRouter();

  // Core Data
  const [client, setClient] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [projects, setProjects] = useState([]);

  // Checklist CRUD States
  const [editingRowId, setEditingRowId] = useState(null);
  const [editRowData, setEditRowData] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [contentList, setContentList] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Client Portal Credentials Form State
  const [portalEmail, setPortalEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalFormError, setPortalFormError] = useState("");
  const [portalSuccessData, setPortalSuccessData] = useState(null);
  
  // UI States
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form states inside tabs
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editData, setEditData] = useState(null);
  const [notesText, setNotesText] = useState("");
  const [teamSelect, setTeamSelect] = useState([]);
  
  // New Project Form
  const [newProjName, setNewProjName] = useState("");
  const [newProjType, setNewProjType] = useState("Marketing");
  const [newProjStartDate, setNewProjStartDate] = useState("");
  const [newProjEndDate, setNewProjEndDate] = useState("");
  const [newProjInvoiceDueDate, setNewProjInvoiceDueDate] = useState("");
  const [newProjValue, setNewProjValue] = useState("");
  const [newProjBillingType, setNewProjBillingType] = useState("One-Time");

  // Edit Project Form States
  const [editProjOpen, setEditProjOpen] = useState(false);
  const [editProjId, setEditProjId] = useState("");
  const [editProjName, setEditProjName] = useState("");
  const [editProjType, setEditProjType] = useState("Social Media");
  const [editProjStartDate, setEditProjStartDate] = useState("");
  const [editProjEndDate, setEditProjEndDate] = useState("");
  const [editProjValue, setEditProjValue] = useState("");
  const [editProjStatus, setEditProjStatus] = useState("Planned");
  const [editProjProgress, setEditProjProgress] = useState(0);
  const [editProjDriveFolder, setEditProjDriveFolder] = useState("");
  const [editProjManager, setEditProjManager] = useState("");
  const [editProjDescription, setEditProjDescription] = useState("");
  const [editProjNotes, setEditProjNotes] = useState("");
  const [editProjBillingType, setEditProjBillingType] = useState("One-Time");

  // Project Billing Form State
  const [billProjOpen, setBillProjOpen] = useState(false);
  const [billProject, setBillProject] = useState(null);
  const [billInvNum, setBillInvNum] = useState("");
  const [billInvAmount, setBillInvAmount] = useState("");
  const [billInvDue, setBillInvDue] = useState("");
  const [billIncludeHST, setBillIncludeHST] = useState(false);
  const [billInvDescription, setBillInvDescription] = useState("Software and App Development");
  const [billClientName, setBillClientName] = useState("");
  const [billClientAttention, setBillClientAttention] = useState("");
  const [billClientEmail, setBillClientEmail] = useState("");
  const [billCraNumber, setBillCraNumber] = useState("");
  const [billHstNumber, setBillHstNumber] = useState("");
  const [billFromCompany, setBillFromCompany] = useState("14689941 Canada Inc.");
  const [billFromBrand, setBillFromBrand] = useState("Operating as Monk Media");
  const [billFromEmail, setBillFromEmail] = useState("info@monkmedia.ca");

  // Project Payment Form State
  const [payProjOpen, setPayProjOpen] = useState(false);
  const [payProject, setPayProject] = useState(null);
  const [payProjInvoices, setPayProjInvoices] = useState([]);
  const [paySelectedInvId, setPaySelectedInvId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Bank Transfer");
  const [payNotes, setPayNotes] = useState("");

  // New Invoice Form
  const [newInvNum, setNewInvNum] = useState("");
  const [newInvAmount, setNewInvAmount] = useState("");
  const [newInvDue, setNewInvDue] = useState("");
  const [newInvIncludeHST, setNewInvIncludeHST] = useState(false);
  const [newInvDescription, setNewInvDescription] = useState("Software and App Development");
  const [newInvClientName, setNewInvClientName] = useState("");
  const [newInvClientAttention, setNewInvClientAttention] = useState("");
  const [newInvClientEmail, setNewInvClientEmail] = useState("");
  const [newInvCraNumber, setNewInvCraNumber] = useState("");
  const [newInvHstNumber, setNewInvHstNumber] = useState("");
  const [newInvFromCompany, setNewInvFromCompany] = useState("14689941 Canada Inc.");
  const [newInvFromBrand, setNewInvFromBrand] = useState("Operating as Monk Media");
  const [newInvFromEmail, setNewInvFromEmail] = useState("info@monkmedia.ca");

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

  // Auto-populate custom client fields when client page loads
  useEffect(() => {
    if (client) {
      setNewInvClientName(client.businessName || "");
      setNewInvClientAttention(client.onboardingContactName || "Tejinder Singh");
      setNewInvClientEmail(client.email || "");
      setPortalEmail(client.email || "");
    }
  }, [client]);

  useEffect(() => {
    if (checklist && checklist.items) {
      setSelectedKeys(checklist.items.filter(item => item.tracked !== false).map(item => item.id));
    }
  }, [checklist]);

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
        if (role === "client" && clientData.id !== clientId) {
          setError("Access Denied: You can only view your own client profile.");
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
          async (snap) => {
            if (!snap.empty) {
              const docSnap = snap.docs[0];
              const data = docSnap.data();
              if (!data.items) {
                // Auto-migrate checklist to have items array
                const defaultKeys = [
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
                ];
                const items = defaultKeys.map(item => ({
                  id: item.key,
                  label: item.label,
                  checked: data[item.key] === true,
                  projectId: data[item.key + "_projectId"] || "",
                  notes: data[item.key + "_notes"] || "",
                  tracked: true
                }));
                try {
                  await updateDoc(doc(db, "onboardingChecklists", docSnap.id), { items });
                } catch (err) {
                  console.error("Migration failed:", err);
                }
              } else {
                setChecklist({ id: docSnap.id, ...data });
              }
            } else {
              setChecklist(null);
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

        const unsubPayments = onSnapshot(
          collection(db, "payments"),
          (snap) => {
            const list = [];
            snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
            setPayments(list);
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
          unsubPayments();
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

  const primaryInvoiceNumber = React.useMemo(() => {
    if (invoices && invoices.length > 0) {
      const firstInv = invoices.find((inv) => inv.invoiceNumber);
      if (firstInv) return firstInv.invoiceNumber;
    }
    return "INV-WEB-856502";
  }, [invoices]);

  const synthesizedProjectInvoices = React.useMemo(() => {
    return projects.map((proj) => {
      const realInv = invoices.find((inv) => inv.projectId === proj.id);
      const taxRate = client?.financials?.taxRate ?? 13;
      const baseVal = Number(proj.value) || 0;
      const tax = Number(((baseVal * taxRate) / 100).toFixed(2));
      const total = baseVal + tax;
      const status = proj.status === "Completed" ? "Paid" : "Due";

      return {
        id: realInv?.id || `sim-inv-${proj.id}`,
        invoiceNumber: realInv?.invoiceNumber || primaryInvoiceNumber,
        invoiceDate: realInv?.invoiceDate || proj.startDate || new Date().toISOString().split("T")[0],
        dueDate: realInv?.dueDate || proj.endDate || proj.deadline || new Date().toISOString().split("T")[0],
        amount: baseVal,
        tax,
        total,
        amountPaid: status === "Paid" ? total : 0,
        balance: status === "Paid" ? 0 : total,
        status,
        projectId: proj.id,
        projectName: proj.name,
        realInvoiceId: realInv?.id || null
      };
    });
  }, [projects, invoices, client, primaryInvoiceNumber]);

  const clientPayments = React.useMemo(() => {
    const list = [];
    synthesizedProjectInvoices.forEach((inv) => {
      if (inv.status === "Paid") {
        const realPay = payments.find((p) => p.invoiceId === inv.invoiceNumber && p.amount > 0);
        list.push({
          id: `pay-${inv.id}`,
          invoiceId: inv.invoiceNumber,
          clientId: id,
          amount: inv.total,
          dateReceived: realPay?.dateReceived || inv.invoiceDate,
          method: realPay?.method || "",
          notes: realPay?.notes || `Payment for Campaign: ${inv.projectName}`,
          isOutstanding: false
        });
      } else {
        list.push({
          id: `pay-${inv.id}`,
          invoiceId: inv.invoiceNumber,
          clientId: id,
          amount: 0,
          dateReceived: inv.dueDate,
          method: "",
          notes: `Project Campaign: ${inv.projectName} (Unpaid)`,
          isOutstanding: true,
          balance: inv.total
        });
      }
    });
    return list;
  }, [synthesizedProjectInvoices, id, client, payments]);

  if (authLoading || loading) {
    return <Loader fullPage={true} message="Loading client profile data..." />;
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

  const handleStartEdit = () => {
    setEditData({
      businessName: client.businessName || "",
      legalName: client.legalName || "",
      contactPerson: client.contactPerson || "",
      email: client.email || "",
      phone: client.phone || "",
      website: client.website || "",
      industry: client.industry || "",
      monthlyRetainer: client.financials?.monthlyRetainer || 0,
      projectStartDate: client.financials?.projectStartDate || client.financials?.contractStart || "",
      notes: client.notes || "",
    });
    setIsEditingClient(true);
  };

  const handleSaveProfile = async () => {
    try {
      const payload = {
        businessName: editData.businessName,
        legalName: editData.legalName,
        contactPerson: editData.contactPerson,
        email: editData.email,
        phone: editData.phone,
        website: editData.website,
        industry: editData.industry,
        notes: editData.notes,
        "financials.monthlyRetainer": Number(editData.monthlyRetainer) || 0,
        "financials.projectStartDate": editData.projectStartDate || "",
        "financials.contractStart": editData.projectStartDate || "",
      };
      await handleUpdateClient(payload);
      
      // Update local client financials state
      setClient((prev) => ({
        ...prev,
        financials: {
          ...prev.financials,
          monthlyRetainer: Number(editData.monthlyRetainer) || 0,
          projectStartDate: editData.projectStartDate || "",
          contractStart: editData.projectStartDate || "",
        }
      }));

      setNotesText(editData.notes || "");
      setIsEditingClient(false);
      setEditData(null);
    } catch (err) {
      alert("Failed to save changes: " + err.message);
    }
  };

  // Initialize checklist for client
  const handleInitializeChecklist = async () => {
    try {
      const defaultKeys = [
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
      ];
      const items = defaultKeys.map(item => ({
        id: item.key,
        label: item.label,
        checked: false,
        projectId: "",
        notes: "",
        tracked: true
      }));
      await addDoc(collection(db, "onboardingChecklists"), {
        clientId: id,
        items
      });
    } catch (err) {
      alert("Failed to initialize checklist: " + err.message);
    }
  };

  // Toggle checklist checkbox
  const handleToggleItem = async (itemId, isChecked) => {
    if (!checklist) return;
    try {
      const updatedItems = checklist.items.map(item =>
        item.id === itemId ? { ...item, checked: isChecked } : item
      );
      const checkRef = doc(db, "onboardingChecklists", checklist.id);
      await updateDoc(checkRef, { items: updatedItems });
    } catch (err) {
      console.error("Checklist toggle failure:", err);
    }
  };

  // Start editing a row
  const handleStartEditRow = (item) => {
    setEditingRowId(item.id);
    setEditRowData({ ...item });
  };

  // Save changes to edited row
  const handleSaveRow = async () => {
    if (!checklist || !editRowData) return;
    try {
      const updatedItems = checklist.items.map(item =>
        item.id === editRowData.id ? { ...editRowData } : item
      );
      const checkRef = doc(db, "onboardingChecklists", checklist.id);
      await updateDoc(checkRef, { items: updatedItems });
      setEditingRowId(null);
      setEditRowData(null);
    } catch (err) {
      alert("Failed to save row: " + err.message);
    }
  };

  // Toggle select state locally for checklist items in the checklist selector grid
  const handleToggleSelectKey = (key) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Save the selection of checklist milestones to track in the table
  const handleSaveSelection = async () => {
    if (!checklist) return;
    try {
      const updatedItems = checklist.items.map(item => ({
        ...item,
        tracked: selectedKeys.includes(item.id)
      }));
      const checkRef = doc(db, "onboardingChecklists", checklist.id);
      await updateDoc(checkRef, { items: updatedItems });
      alert("Tracked milestones updated successfully.");
    } catch (err) {
      alert("Failed to save selection: " + err.message);
    }
  };

  // Remove/Delete a milestone from tracking
  const handleRemoveTrackedItem = async (itemId) => {
    if (!checklist) return;
    if (!confirm("Are you sure you want to remove this milestone from the tracking table?")) return;
    try {
      const updatedItems = checklist.items.map(item =>
        item.id === itemId ? { ...item, tracked: false } : item
      );
      const checkRef = doc(db, "onboardingChecklists", checklist.id);
      await updateDoc(checkRef, { items: updatedItems });
    } catch (err) {
      console.error("Remove tracked milestone failure:", err);
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
        startDate: newProjStartDate || new Date().toISOString().split("T")[0],
        endDate: newProjEndDate || "",
        deadline: newProjEndDate || "",
        completionDate: "",
        value: Number(newProjValue) || 0,
        billingType: newProjBillingType || "One-Time",
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

      const projRef = await addDoc(collection(db, "projects"), payload);

      // Auto-create invoice for project value if project value is set
      const projectVal = Number(newProjValue) || 0;
      if (projectVal > 0) {
        const clientName = client ? client.businessName : "General";
        const clientAttention = client ? client.contactPerson : "";
        const clientEmail = client ? client.email : "";

        const cleanProjName = newProjName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
        const invoiceNum = `INV-${cleanProjName}-${Date.now().toString().slice(-6)}`;
        
        const addDays = (dateStr, days) => {
          const d = new Date(dateStr + "T12:00:00");
          d.setDate(d.getDate() + days);
          return d.toISOString().split("T")[0];
        };

        const projStart = newProjStartDate || new Date().toISOString().split("T")[0];
        const dueStr = newProjInvoiceDueDate || addDays(projStart, 14);
        const taxRate = client?.financials?.taxRate ?? 0;
        const tax = Number(((projectVal * taxRate) / 100).toFixed(2));
        const total = projectVal + tax;

        await addDoc(collection(db, "invoices"), {
          invoiceNumber: invoiceNum,
          clientId: id,
          projectId: projRef.id,
          invoiceDate: projStart,
          dueDate: dueStr,
          amount: projectVal,
          tax,
          total,
          amountPaid: 0,
          balance: total,
          status: "Due",
          paymentMethod: client?.financials?.paymentMethod || "Credit Card",
          receiptUrl: "",
          notes: `Automatically generated invoice for project campaign "${newProjName}".`,
          description: `Project Campaign: ${newProjName}`,
          clientName,
          clientAttention,
          clientEmail,
          craNumber: "777790411",
          hstNumber: "777790411 RT 0001",
          fromCompanyName: "14689941 Canada Inc.",
          fromBrandName: "Operating as Monk Media",
          fromEmail: "info@monkmedia.ca",
        });
      }

      setNewProjName("");
      setNewProjStartDate("");
      setNewProjEndDate("");
      setNewProjInvoiceDueDate("");
      setNewProjValue("");
      setNewProjBillingType("One-Time");
      alert("Project created successfully!");
    } catch (err) {
      alert("Error adding project: " + err.message);
    }
  };

  const handleStartEditProject = (project) => {
    setEditProjId(project.id);
    setEditProjName(project.name || "");
    setEditProjType(project.type || "Social Media");
    setEditProjStartDate(project.startDate || "");
    setEditProjEndDate(project.endDate || project.deadline || "");
    setEditProjValue(project.value || "");
    setEditProjStatus(project.status || "Planned");
    setEditProjProgress(project.progressPercent || 0);
    setEditProjDriveFolder(project.driveFolder || "");
    setEditProjManager(project.projectManager || "");
    setEditProjDescription(project.description || "");
    setEditProjNotes(project.notes || "");
    setEditProjBillingType(project.billingType || "One-Time");
    setEditProjOpen(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editProjName) return;

    try {
      const payload = {
        name: editProjName,
        type: editProjType,
        startDate: editProjStartDate || "",
        endDate: editProjEndDate || "",
        deadline: editProjEndDate || "",
        value: Number(editProjValue) || 0,
        billingType: editProjBillingType || "One-Time",
        status: editProjStatus,
        progressPercent: Number(editProjProgress) || 0,
        driveFolder: editProjDriveFolder || "",
        projectManager: editProjManager || currentUser?.uid,
        description: editProjDescription || "",
        notes: editProjNotes || "",
      };

      const projRef = doc(db, "projects", editProjId);
      await updateDoc(projRef, payload);
      setEditProjOpen(false);
    } catch (err) {
      alert("Error updating project: " + err.message);
    }
  };

  const handleStartBillProject = (project) => {
    setBillProject(project);
    const rand = Math.floor(100 + Math.random() * 900);
    setBillInvNum(`INV-PROJ-${rand}-${Date.now().toString().slice(-4)}`);
    setBillInvAmount(project.value || "");
    
    const due = new Date();
    due.setDate(due.getDate() + 14);
    setBillInvDue(due.toISOString().split("T")[0]);
    setBillIncludeHST(false);
    setBillInvDescription(`Campaign execution for project "${project.name}"`);
    if (client) {
      setBillClientName(client.businessName || "");
      setBillClientAttention(client.onboardingContactName || "Tejinder Singh");
      setBillClientEmail(client.email || "");
      setBillCraNumber("");
      setBillHstNumber("");
      setBillFromCompany("14689941 Canada Inc.");
      setBillFromBrand("Operating as Monk Media");
      setBillFromEmail("info@monkmedia.ca");
    }
    setBillProjOpen(true);
  };

  const handleBillProject = async (e) => {
    e.preventDefault();
    if (!billInvNum || !billInvAmount || !billProject) return;

    try {
      const amount = Number(billInvAmount);
      const taxRate = billIncludeHST ? (client.financials?.taxRate ?? 13) : 0;
      const tax = Number(((amount * taxRate) / 100).toFixed(2));
      const total = amount + tax;

      const payload = {
        invoiceNumber: billInvNum,
        clientId: id,
        projectId: billProject.id,
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: billInvDue || "",
        amount,
        tax,
        total,
        amountPaid: 0,
        balance: total,
        status: "Due",
        paymentMethod: client.financials?.paymentMethod || "Credit Card",
        receiptUrl: "",
        notes: `Project invoice for campaign "${billProject.name}".`,
        description: billInvDescription || "Software and App Development",
        clientName: billClientName,
        clientAttention: billClientAttention,
        clientEmail: billClientEmail,
        craNumber: billCraNumber || "",
        hstNumber: billHstNumber || "",
        fromCompanyName: billFromCompany || "14689941 Canada Inc.",
        fromBrandName: billFromBrand || "Operating as Monk Media",
        fromEmail: billFromEmail || "info@monkmedia.ca",
      };

      await addDoc(collection(db, "invoices"), payload);

      // Auto-rollover retainer dates on billing
      if (billProject.billingType === "Retainer") {
        const shiftDate = (dateStr) => {
          if (!dateStr) return "";
          const d = new Date(dateStr + "T12:00:00");
          if (isNaN(d.getTime())) return dateStr;
          d.setMonth(d.getMonth() + 1);
          return d.toISOString().split("T")[0];
        };
        const nextStart = shiftDate(billProject.startDate || new Date().toISOString().split("T")[0]);
        const nextEnd = shiftDate(billProject.endDate || billProject.deadline);
        await updateDoc(doc(db, "projects", billProject.id), {
          startDate: nextStart,
          endDate: nextEnd,
          deadline: nextEnd
        });
      }

      setBillProjOpen(false);
      setBillProject(null);
      setBillInvDescription("Software and App Development");
      setBillClientName("");
      setBillClientAttention("");
      setBillClientEmail("");
      setBillCraNumber("");
      setBillHstNumber("");
      setBillFromCompany("14689941 Canada Inc.");
      setBillFromBrand("Operating as Monk Media");
      setBillFromEmail("info@monkmedia.ca");
    } catch (err) {
      alert("Error invoicing project: " + err.message);
    }
  };

  const handleRolloverProject = async (project) => {
    try {
      const shiftDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr + "T12:00:00");
        if (isNaN(d.getTime())) return dateStr;
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().split("T")[0];
      };
      const nextStart = shiftDate(project.startDate || new Date().toISOString().split("T")[0]);
      const nextEnd = shiftDate(project.endDate || project.deadline);
      await updateDoc(doc(db, "projects", project.id), {
        startDate: nextStart,
        endDate: nextEnd,
        deadline: nextEnd
      });
      alert(`Project "${project.name}" rolled over to next month (${nextStart} to ${nextEnd})`);
    } catch (err) {
      alert("Error rolling over project: " + err.message);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project? This will not delete its invoices or payments.")) return;
    try {
      await deleteDoc(doc(db, "projects", projectId));
      alert("Project deleted successfully.");
    } catch (err) {
      alert("Error deleting project: " + err.message);
    }
  };

  const handleStartProjectPayment = async (project) => {
    setPayProject(project);
    setPayProjInvoices([]);
    setPaySelectedInvId("");
    setPayAmount("");
    setPayNotes("");
    
    try {
      const q = query(
        collection(db, "invoices"),
        where("clientId", "==", project.clientId),
        where("projectId", "==", project.id)
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if ((Number(data.balance) || 0) > 0) {
          list.push({ id: doc.id, ...data });
        }
      });
      setPayProjInvoices(list);
      if (list.length > 0) {
        setPaySelectedInvId(list[0].id);
        setPayAmount(list[0].balance);
      }
      setPayProjOpen(true);
    } catch (err) {
      alert("Error fetching project invoices: " + err.message);
    }
  };

  const handleRecordProjectPayment = async (e) => {
    e.preventDefault();
    if (!paySelectedInvId || !payAmount || !payProject) return;

    try {
      const amount = Number(payAmount);
      const targetInvoice = payProjInvoices.find((i) => i.id === paySelectedInvId);
      if (!targetInvoice) return;

      const nextPaid = (Number(targetInvoice.amountPaid) || 0) + amount;
      const nextBal = Math.max(0, Number(targetInvoice.total) - nextPaid);
      const nextStatus = nextBal <= 0 ? "Received" : nextPaid > 0 ? "Partial" : "Due";

      // 1. Add Payment record
      await addDoc(collection(db, "payments"), {
        invoiceId: paySelectedInvId,
        clientId: targetInvoice.clientId,
        amount,
        dateReceived: new Date().toISOString().split("T")[0],
        method: payMethod,
        notes: payNotes || "",
      });

      // 2. Update parent invoice totals
      await updateDoc(doc(db, "invoices", paySelectedInvId), {
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

      setPayProjOpen(false);
      setPayProject(null);
    } catch (err) {
      alert("Error recording payment: " + err.message);
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

  // Helper to convert file to base64
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Document File Upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploadLoading(true);
    try {
      // Convert file to base64 string
      const fileDataUrl = await getBase64(uploadFile);

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
        storageUrl: fileDataUrl, // Direct base64 string
        notes: "",
      };

      await addDoc(collection(db, "documents"), docPayload);
      setUploadFile(null);
      if (e.target) e.target.reset(); // clear the file input
      alert("Document uploaded successfully.");
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDoc(doc(db, "documents", docId));
      alert("Document deleted successfully.");
    } catch (err) {
      alert("Failed to delete document: " + err.message);
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
    { id: "payments", label: "Payments", icon: CreditCard, roles: ["admin", "manager", "client"] },
    { id: "content", label: "Content", icon: Calendar },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "links", label: "Account Links", icon: Link2 },
    { id: "checklist", label: "Onboarding Checklist", icon: ListTodo },
  ].filter(t => !t.roles || t.roles.includes(role || ""));

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Back and Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-sky-100">
          <div className="flex items-center gap-3">
            {role !== "client" && (
              <button
                onClick={() => router.push("/clients")}
                className="p-2 rounded-xl hover:bg-sky-50 text-sky-500 border border-sky-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
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

        {/* Tab Selection (Glassmorphic Styling) */}
        <div className="bg-sky-50/20 backdrop-blur-md border border-sky-100/40 p-2 rounded-[28px] overflow-x-auto flex gap-2 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${
                  isActive
                    ? "bg-white border border-sky-100/50 shadow-[0_4px_12px_rgba(14,165,233,0.06)] text-sky-600 rounded-[20px]"
                    : "text-sky-400 hover:text-sky-500 hover:bg-white/40 rounded-[20px]"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
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
                    {role !== "client" && (
                      <button
                        onClick={() => {
                          if (isEditingClient) {
                            setIsEditingClient(false);
                            setEditData(null);
                          } else {
                            handleStartEdit();
                          }
                        }}
                        className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl text-xs font-bold transition-all"
                      >
                        {isEditingClient ? "Cancel" : "Edit Profile"}
                      </button>
                    )}
                  </div>

                  {isEditingClient && editData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                        <div>
                          <label className="block text-sky-500 mb-1 font-bold uppercase">Business / Brand Name</label>
                          <input
                            type="text"
                            value={editData.businessName}
                            onChange={(e) => setEditData({ ...editData, businessName: e.target.value })}
                            className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1 font-bold uppercase">Legal Name</label>
                          <input
                            type="text"
                            value={editData.legalName}
                            onChange={(e) => setEditData({ ...editData, legalName: e.target.value })}
                            className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1 font-bold uppercase">Contact Person</label>
                          <input
                            type="text"
                            value={editData.contactPerson}
                            onChange={(e) => setEditData({ ...editData, contactPerson: e.target.value })}
                            className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1 font-bold uppercase">Email Address</label>
                          <input
                            type="email"
                            value={editData.email}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1 font-bold uppercase">Phone Number</label>
                          <input
                            type="text"
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1 font-bold uppercase">Industry</label>
                          <input
                            type="text"
                            value={editData.industry}
                            onChange={(e) => setEditData({ ...editData, industry: e.target.value })}
                            className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1 font-bold uppercase">Website</label>
                          <input
                            type="text"
                            value={editData.website}
                            onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                            className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1 font-bold uppercase">Project Start Date</label>
                          <input
                            type="date"
                            value={editData.projectStartDate}
                            onChange={(e) => setEditData({ ...editData, projectStartDate: e.target.value })}
                            className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                          />
                        </div>
                        {(role === "admin" || role === "manager") && (
                          <div>
                            <label className="block text-sky-500 mb-1 font-bold uppercase">Monthly Retainer ($)</label>
                            <input
                              type="number"
                              value={editData.monthlyRetainer}
                              onChange={(e) => setEditData({ ...editData, monthlyRetainer: Number(e.target.value) || 0 })}
                              className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                            />
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <label className="block text-sky-500 mb-1 font-bold uppercase">Client Strategy & Notes</label>
                          <textarea
                            rows={3}
                            value={editData.notes}
                            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                            placeholder="Enter strategy guidelines, client notes..."
                            className="w-full p-2.5 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleSaveProfile}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
                        >
                          Save Changes
                        </button>
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
                        <p className="mt-0.5">{client.email || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sky-400 font-bold uppercase">Phone Line</p>
                        <p className="mt-0.5">{client.phone || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sky-400 font-bold uppercase">Industry</p>
                        <p className="mt-0.5 capitalize">{client.industry || "Not set"}</p>
                      </div>
                      <div>
                        <p className="text-sky-400 font-bold uppercase">Project Start Date</p>
                        <p className="mt-0.5">{client.financials?.projectStartDate || client.financials?.contractStart || "Not set"}</p>
                      </div>
                      {(role === "admin" || role === "manager" || role === "client") && (
                        <div>
                          <p className="text-sky-400 font-bold uppercase">Monthly Retainer</p>
                          <p className="mt-0.5">${(client.financials?.monthlyRetainer || 0).toLocaleString()}</p>
                        </div>
                      )}

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
                {role !== "client" && (
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
                )}

                {/* Client Projects Overview Card */}
                <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-sky-50">
                    <h3 className="text-sm font-bold text-sky-600">Client Projects ({projects.length})</h3>
                    {(role === "admin" || role === "manager") && (
                      <button
                        onClick={() => {
                          setActiveTab("projects");
                        }}
                        className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-xl text-xs font-bold transition-all"
                      >
                        + Launch Project
                      </button>
                    )}
                  </div>

                  {projects.length === 0 ? (
                    <p className="text-xs text-sky-400 py-2">No active projects found under this client.</p>
                  ) : (
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {projects.map((p) => (
                        <div key={p.id} className="p-3 bg-sky-50/10 border border-sky-100/50 rounded-2xl flex items-center justify-between gap-4 text-xs font-semibold">
                          <div>
                            <p className="font-bold text-sky-600">{p.name}</p>
                            <p className="text-[10px] text-sky-400 capitalize mt-0.5">{p.type} • {p.status}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sky-500 font-bold">${Number(p.value).toLocaleString()}</p>
                            </div>
                            {(role === "admin" || role === "manager") && (
                              <button
                                onClick={() => handleStartEditProject(p)}
                                className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-500 rounded-lg border border-sky-100 text-[10px] font-bold"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Team assignment section */}
              <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4 h-fit">
                <h3 className="text-sm font-bold text-sky-600">Assigned Team Pool</h3>
                {role === "client" ? (
                  <div className="space-y-3">
                    {teamMembers.filter((m) => teamSelect.includes(m.id)).map((member) => (
                      <div
                        key={member.id}
                        className="w-full p-2.5 rounded-2xl border border-sky-100 bg-sky-50/20 text-xs font-semibold text-sky-600 flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate">{member.name}</p>
                          <p className="text-[10px] text-sky-400 capitalize">{member.role}</p>
                        </div>
                      </div>
                    ))}
                    {teamMembers.filter((m) => teamSelect.includes(m.id)).length === 0 && (
                      <p className="text-xs text-sky-400 italic">No assigned team members.</p>
                    )}
                  </div>
                ) : (
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
                )}
              </div>

              {/* Client Portal Access Card */}
              {role === "admin" && (() => {
                const clientPortalUser = teamMembers.find(
                  (member) => member.role === "client" && member.clientId === id
                );
                return (
                  <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4 h-fit bg-white">
                    <div className="flex items-center gap-2 pb-2 border-b border-sky-50">
                      <KeyRound className="w-5 h-5 text-sky-500" />
                      <h3 className="text-sm font-bold text-sky-600">Client Portal Access</h3>
                    </div>

                    {clientPortalUser ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-sky-50/50 border border-sky-100/80 rounded-2xl text-xs font-semibold space-y-1">
                          <p className="text-sky-400 uppercase text-[9px] font-bold">Portal Access Email</p>
                          <p className="text-sky-600 font-bold">{clientPortalUser.email}</p>
                          <p className="text-sky-400 uppercase text-[9px] font-bold mt-2">Account Status</p>
                          <p className="capitalize text-sky-600">{clientPortalUser.status || "Active"}</p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] text-sky-400 italic">This client has active login access to their portal.</p>
                          <button
                            onClick={async () => {
                              const newPass = prompt("Enter a new password for this client:");
                              if (!newPass) return;
                              if (newPass.length < 6) {
                                alert("Password must be at least 6 characters.");
                                return;
                              }
                              try {
                                const idToken = await auth.currentUser.getIdToken();
                                const res = await fetch("/api/admin/reset-password", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${idToken}`,
                                  },
                                  body: JSON.stringify({ email: clientPortalUser.email, password: newPass }),
                                });
                                if (!res.ok) {
                                  const data = await res.json();
                                  throw new Error(data.error || "Failed to reset password.");
                                }
                                alert("Success: Client password updated successfully!");
                              } catch (err) {
                                alert("Error resetting password: " + err.message);
                              }
                            }}
                            className="w-full py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 rounded-xl text-xs font-bold transition-all"
                          >
                            Reset Password
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-sky-400 leading-relaxed font-semibold">
                          This client does not have login credentials yet. Provision credentials to allow them to access their portal.
                        </p>

                        {portalFormError && (
                          <div className="p-2.5 bg-red-50 text-red-500 rounded-xl text-[10px] font-bold border border-red-100">
                            {portalFormError}
                          </div>
                        )}

                        {portalSuccessData ? (
                          <div className="p-3 bg-sky-50 border border-sky-100 rounded-2xl space-y-2.5">
                            <div className="text-xs font-semibold space-y-1">
                              <p className="text-emerald-600 font-bold">✓ Portal Access Created!</p>
                              <div className="bg-white p-2 rounded-xl border border-sky-100 space-y-1 select-all font-mono text-[10px]">
                                <p>Email: {portalSuccessData.email}</p>
                                <p>Password: {portalSuccessData.password}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const txt = `Email: ${portalSuccessData.email}\nPassword: ${portalSuccessData.password}\nPortal Link: ${window.location.origin}/login/client`;
                                  navigator.clipboard.writeText(txt);
                                  alert("Copied credentials to clipboard!");
                                }}
                                className="flex-1 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-600 rounded-xl text-[10px] font-bold transition"
                              >
                                Copy
                              </button>
                              <button
                                onClick={() => {
                                  const cleanPhone = client.phone ? client.phone.replace(/[^0-9]/g, "") : "";
                                  const text = `Hi! Here are your login credentials for the Monk Media Portal:\n\nEmail: ${portalSuccessData.email}\nPassword: ${portalSuccessData.password}\nPortal Link: ${window.location.origin}/login/client\n\nPlease keep these credentials secure.`;
                                  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
                                  window.open(url, "_blank");
                                }}
                                className="flex-1 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-[10px] font-bold transition"
                              >
                                Share WA
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                setPortalSuccessData(null);
                              }}
                              className="w-full text-center text-[10px] text-sky-400 hover:underline"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 text-xs font-semibold">
                            <div>
                              <label className="block text-sky-500 mb-1 font-bold uppercase text-[10px]">Email Address</label>
                              <input
                                type="email"
                                value={portalEmail}
                                onChange={(e) => setPortalEmail(e.target.value)}
                                placeholder="client@company.com"
                                className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                              />
                            </div>
                            <div>
                              <label className="block text-sky-500 mb-1 font-bold uppercase text-[10px]">Password</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={portalPassword}
                                  onChange={(e) => setPortalPassword(e.target.value)}
                                  placeholder="Enter or generate password"
                                  className="flex-1 p-2 border border-sky-100 rounded-xl text-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-300"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
                                    let gen = "";
                                    for (let i = 0; i < 10; i++) {
                                      gen += chars.charAt(Math.floor(Math.random() * chars.length));
                                    }
                                    setPortalPassword(gen);
                                  }}
                                  className="px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 rounded-xl text-[10px]"
                                >
                                  Generate
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={portalLoading}
                              onClick={async () => {
                                setPortalFormError("");
                                if (!portalEmail || !portalPassword) {
                                  setPortalFormError("Email and password are required.");
                                  return;
                                }
                                if (portalPassword.length < 6) {
                                  setPortalFormError("Password must be at least 6 characters.");
                                  return;
                                }
                                setPortalLoading(true);
                                try {
                                  const idToken = await auth.currentUser.getIdToken();
                                  const res = await fetch("/api/admin/create-user", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${idToken}`,
                                    },
                                    body: JSON.stringify({
                                      name: client.contactPerson || client.businessName,
                                      email: portalEmail,
                                      password: portalPassword,
                                      role: "client",
                                      assignedClients: [id],
                                    }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) {
                                    throw new Error(data.error || "Failed to create client user account.");
                                  }
                                  setPortalSuccessData(data);
                                  setPortalEmail("");
                                  setPortalPassword("");
                                  
                                  // Refresh users list so the local state catches it
                                  const teamSnap = await getDocs(collection(db, "users"));
                                  const members = [];
                                  teamSnap.forEach((doc) => {
                                    members.push({ id: doc.id, ...doc.data() });
                                  });
                                  setTeamMembers(members);
                                } catch (err) {
                                  setPortalFormError(err.message);
                                } finally {
                                  setPortalLoading(false);
                                }
                              }}
                              className="w-full py-2 bg-sky-505 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow"
                            >
                              {portalLoading ? "Provisioning..." : "Enable Portal Access"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                      <label className="block text-sky-500 mb-1">Billing Model</label>
                      <select
                        value={newProjBillingType}
                        onChange={(e) => setNewProjBillingType(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl text-sky-600 font-semibold"
                      >
                        <option value="One-Time">One-Time Project</option>
                        <option value="Retainer">Monthly Retainer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={newProjStartDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewProjStartDate(val);
                          if (val) {
                            const start = new Date(val + 'T00:00:00');
                            start.setDate(start.getDate() + 30);
                            setNewProjEndDate(start.toISOString().split("T")[0]);
                          }
                        }}
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">End Date</label>
                      <input
                        type="date"
                        value={newProjEndDate}
                        onChange={(e) => setNewProjEndDate(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-500 mb-1">Invoice Due Date</label>
                      <input
                        type="date"
                        value={newProjInvoiceDueDate}
                        onChange={(e) => setNewProjInvoiceDueDate(e.target.value)}
                        className="w-full p-2 border border-sky-100 rounded-xl"
                      />
                    </div>
                    <div className="sm:col-span-4 flex items-end justify-end">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                  <thead>
                    <tr className="bg-sky-50/20 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                      <th className="p-4 px-6">Name</th>
                      <th className="p-4 px-6">Type</th>
                      <th className="p-4 px-6">Status</th>
                      <th className="p-4 px-6">Billing Period</th>
                      <th className="p-4 px-6 text-right">Value</th>
                      <th className="p-4 px-6 text-right">Action</th>
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
                          <td className="p-4 px-6">
                            {p.startDate ? p.startDate + " to " + (p.endDate || p.deadline) : (p.deadline || "None")}
                          </td>

                          <td className="p-4 px-6 text-right">${Number(p.value).toLocaleString()}</td>
                          <td className="p-4 px-6 text-right">
                            {(role === "admin" || role === "manager") && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleStartBillProject(p)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold transition-all"
                                  title="Bill Campaign"
                                >
                                  Bill
                                </button>
                                <button
                                  onClick={() => handleStartProjectPayment(p)}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-100 rounded-xl text-[10px] font-bold transition-all"
                                  title="Log Payment"
                                >
                                  Pay
                                </button>
                                <button
                                  onClick={() => handleStartEditProject(p)}
                                  className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-100 rounded-xl text-xs font-bold transition-all"
                                >
                                  Edit
                                </button>
                                {p.billingType === "Retainer" && (
                                  <button
                                    onClick={() => handleRolloverProject(p)}
                                    className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-100 rounded-xl text-[10px] font-bold transition-all"
                                    title="Rollover Retainer to Next Month"
                                  >
                                    Rollover
                                  </button>
                                )}
                                {role === "admin" && (
                                  <button
                                    onClick={() => handleDeleteProject(p.id)}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 rounded-xl text-[10px] font-bold transition-all"
                                    title="Delete Project"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Edit Project Drawer */}
              {editProjOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                  <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setEditProjOpen(false)} />
                  <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
                    <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                      <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                        <div>
                          <h2 className="text-xl font-bold text-sky-600">Edit Project</h2>
                          <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Modify campaign parameters</p>
                        </div>
                        <button onClick={() => setEditProjOpen(false)} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleUpdateProject} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                            Project Name
                          </label>
                          <input
                            type="text"
                            required
                            value={editProjName}
                            onChange={(e) => setEditProjName(e.target.value)}
                            placeholder="e.g. Winter Social Launch"
                            className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                            Project Type
                          </label>
                          <select
                            value={editProjType}
                            onChange={(e) => setEditProjType(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none"
                          >
                            <option value="Social Media">Social Media</option>
                            <option value="Video Shoot">Video Production</option>
                            <option value="Web Development">Web Development</option>
                            <option value="Ad Campaign">Ad Campaign</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                              Campaign Value ($)
                            </label>
                            <input
                              type="number"
                              value={editProjValue}
                              onChange={(e) => setEditProjValue(e.target.value)}
                              placeholder="e.g. 5000"
                              className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                              Billing Model
                            </label>
                            <select
                              value={editProjBillingType}
                              onChange={(e) => setEditProjBillingType(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none text-sky-600 font-semibold"
                            >
                              <option value="One-Time">One-Time Project</option>
                              <option value="Retainer">Monthly Retainer</option>
                            </select>
                          </div>
                           <div>
                             <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                               Start Date
                             </label>
                             <input
                               type="date"
                               value={editProjStartDate}
                               onChange={(e) => {
                                 const val = e.target.value;
                                 setEditProjStartDate(val);
                                 if (val) {
                                   const start = new Date(val + 'T00:00:00');
                                   start.setDate(start.getDate() + 30);
                                   setEditProjEndDate(start.toISOString().split("T")[0]);
                                 }
                               }}
                               className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none"
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                               End Date
                             </label>
                             <input
                               type="date"
                               value={editProjEndDate}
                               onChange={(e) => setEditProjEndDate(e.target.value)}
                               className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none"
                             />
                           </div>
                        </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                              Status / Stage
                            </label>
                            <select
                              value={editProjStatus}
                              onChange={(e) => setEditProjStatus(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-sky-100 rounded-2xl text-xs outline-none text-sky-600"
                            >
                              {["Planned", "Awaiting Deposit", "In Progress", "Completed", "On Hold", "Cancelled"].map((stg) => (
                                <option key={stg} value={stg}>
                                  {stg}
                                </option>
                              ))}
                            </select>
                          </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                            Drive Link / Folder URL
                          </label>
                          <input
                            type="url"
                            value={editProjDriveFolder}
                            onChange={(e) => setEditProjDriveFolder(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                            Project Manager
                          </label>
                          <select
                            value={editProjManager}
                            onChange={(e) => setEditProjManager(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 outline-none"
                          >
                            <option value="">Assign to client manager</option>
                            {teamMembers
                              .filter((u) => u.role === "manager" || u.role === "admin")
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                            Campaign Description
                          </label>
                          <textarea
                            rows={3}
                            value={editProjDescription}
                            onChange={(e) => setEditProjDescription(e.target.value)}
                            placeholder="Enter brief description, deliverables guidelines..."
                            className="w-full p-3 border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-xs text-sky-600 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
                            Internal Notes
                          </label>
                          <textarea
                            rows={3}
                            value={editProjNotes}
                            onChange={(e) => setEditProjNotes(e.target.value)}
                            placeholder="Additional manager/team internal notes..."
                            className="w-full p-3 border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-xs text-sky-600 outline-none"
                          />
                        </div>

                        <div className="pt-4 border-t border-sky-50 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditProjOpen(false)}
                            className="px-4 py-2 border border-sky-100 text-sky-500 rounded-2xl text-xs font-bold hover:bg-sky-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold shadow hover:shadow-lg"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
              {/* Bill Project Drawer */}
              {billProjOpen && billProject && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                  <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => { setBillProjOpen(false); setBillProject(null); }} />
                  <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
                    <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                      <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                        <div>
                          <h2 className="text-xl font-bold text-sky-600">Bill Project</h2>
                          <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Issue Campaign Invoice</p>
                        </div>
                        <button onClick={() => { setBillProjOpen(false); setBillProject(null); }} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleBillProject} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs font-semibold">
                        <div>
                          <label className="block text-sky-500 mb-1">Invoice Number</label>
                          <input
                            type="text"
                            required
                            value={billInvNum}
                            onChange={(e) => setBillInvNum(e.target.value)}
                            placeholder="e.g. MM-INV-1002"
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">Project Name</label>
                          <input
                            disabled
                            value={billProject.name}
                            className="w-full p-2 border border-sky-50 rounded-xl bg-sky-50/20 text-sky-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">Billing Client Name (Logo & PDF Header)</label>
                          <input
                            type="text"
                            required
                            value={billClientName}
                            onChange={(e) => setBillClientName(e.target.value)}
                            placeholder="e.g. Metric Air Limited"
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">Billing Contact / Attention</label>
                          <input
                            type="text"
                            required
                            value={billClientAttention}
                            onChange={(e) => setBillClientAttention(e.target.value)}
                            placeholder="e.g. Tejinder Singh"
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">Billing Email Address</label>
                          <input
                            type="email"
                            required
                            value={billClientEmail}
                            onChange={(e) => setBillClientEmail(e.target.value)}
                            placeholder="e.g. billing@metricair.com"
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">CRA Business Number</label>
                          <input
                            type="text"
                            value={billCraNumber}
                            onChange={(e) => setBillCraNumber(e.target.value)}
                            placeholder="e.g. 777790411"
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">HST Registration No.</label>
                          <input
                            type="text"
                            value={billHstNumber}
                            onChange={(e) => setBillHstNumber(e.target.value)}
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
                            value={billFromCompany}
                            onChange={(e) => setBillFromCompany(e.target.value)}
                            placeholder="e.g. 14689941 Canada Inc."
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">Sender Brand/Operating Name</label>
                          <input
                            type="text"
                            required
                            value={billFromBrand}
                            onChange={(e) => setBillFromBrand(e.target.value)}
                            placeholder="e.g. Operating as Monk Media"
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">Sender Email Address</label>
                          <input
                            type="email"
                            required
                            value={billFromEmail}
                            onChange={(e) => setBillFromEmail(e.target.value)}
                            placeholder="e.g. info@monkmedia.ca"
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">Invoice Item / Description</label>
                          <input
                            type="text"
                            required
                            value={billInvDescription}
                            onChange={(e) => setBillInvDescription(e.target.value)}
                            placeholder="e.g. Software and App Development"
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">Billing Amount ($)</label>
                          <input
                            type="number"
                            required
                            value={billInvAmount}
                            onChange={(e) => setBillInvAmount(e.target.value)}
                            placeholder="e.g. 2000"
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sky-500 mb-1">Due Date</label>
                          <input
                            type="date"
                            required
                            value={billInvDue}
                            onChange={(e) => setBillInvDue(e.target.value)}
                            className="w-full p-2 border border-sky-100 rounded-xl"
                          />
                        </div>
                        <div className="flex items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            id="billIncludeHSTClient"
                            checked={billIncludeHST}
                            onChange={(e) => setBillIncludeHST(e.target.checked)}
                            className="w-4 h-4 rounded text-sky-500 border-sky-200 focus:ring-sky-500 cursor-pointer"
                          />
                          <label htmlFor="billIncludeHSTClient" className="text-sky-500 cursor-pointer select-none font-bold text-xs">
                            Include HST / Tax (13%)
                          </label>
                        </div>
                        <div className="pt-4 border-t border-sky-50 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setBillProjOpen(false); setBillProject(null); }}
                            className="px-4 py-2 border border-sky-100 text-sky-500 rounded-xl"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-sky-500 text-white rounded-xl font-bold shadow hover:bg-sky-600 transition-all"
                          >
                            Issue Invoice
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Record Project Payment Drawer */}
              {payProjOpen && payProject && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                  <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => { setPayProjOpen(false); setPayProject(null); }} />
                  <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
                    <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                      <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                        <div>
                          <h2 className="text-xl font-bold text-sky-600">Record Payment</h2>
                          <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Collect Project Revenue</p>
                        </div>
                        <button onClick={() => { setPayProjOpen(false); setPayProject(null); }} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleRecordProjectPayment} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs font-semibold">
                        <div>
                          <label className="block text-sky-500 mb-1">Project Name</label>
                          <input
                            type="text"
                            disabled
                            value={payProject.name}
                            className="w-full p-2 border border-sky-50 rounded-xl bg-sky-50/20 text-sky-400"
                          />
                        </div>

                        {payProjInvoices.length === 0 ? (
                          <div className="p-4 bg-sky-50/20 text-sky-500 text-center rounded-2xl border border-sky-100 font-bold">
                            No unpaid invoices found for this project. Please click &quot;Bill&quot; first to issue an invoice.
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sky-500 mb-1">Select Project Invoice</label>
                              <select
                                value={paySelectedInvId}
                                required
                                onChange={(e) => {
                                  setPaySelectedInvId(e.target.value);
                                  const target = payProjInvoices.find((i) => i.id === e.target.value);
                                  if (target) setPayAmount(target.balance);
                                }}
                                className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                              >
                                {payProjInvoices.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.invoiceNumber} (Oustanding: ${Number(inv.balance).toLocaleString()})
                                  </option>
                                ))}
                              </select>
                            </div>
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
                                className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
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
                                value={payNotes}
                                onChange={(e) => setPayNotes(e.target.value)}
                                placeholder="Payment details, transaction ID, bank wire confirmation..."
                                className="w-full p-2 border border-sky-100 rounded-xl"
                                rows={3}
                              />
                            </div>
                          </>
                        )}

                        <div className="pt-4 border-t border-sky-50 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setPayProjOpen(false); setPayProject(null); }}
                            className="px-4 py-2 border border-sky-100 text-sky-500 rounded-xl"
                          >
                            Cancel
                          </button>
                          {payProjInvoices.length > 0 && (
                            <button
                              type="submit"
                              className="px-4 py-2 bg-sky-500 text-white rounded-xl font-bold shadow hover:bg-sky-600 transition-all"
                            >
                              Record Payment
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              
              {/* Financial Profile & Retainer edits */}
              {role !== "client" && (
                <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-4">
                  <h3 className="text-sm font-bold text-sky-600">Financial Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs font-semibold">
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
                    <div>
                      <label className="block text-sky-500 mb-1">HST / Tax Option</label>
                      <select
                        value={client.financials?.taxRate === 13 ? "13" : "0"}
                        onChange={(e) => handleUpdateClient({ "financials.taxRate": Number(e.target.value) || 0 })}
                        disabled={role !== "admin"}
                        className={`w-full p-2 border border-sky-100 rounded-xl text-sky-600 bg-white ${role !== "admin" ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <option value="13">Include HST (13%)</option>
                        <option value="0">No Tax (0%)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoicing Section */}
              <div className="w-full">
                
                {/* Invoice listing */}
                <div className="col-span-full bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden flex flex-col">
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
                        {synthesizedProjectInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-sky-400">
                              No invoices found.
                            </td>
                          </tr>
                        ) : (
                          synthesizedProjectInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-sky-50/5">
                              <td className="p-3 px-4 font-bold">{inv.invoiceNumber}</td>
                              <td className="p-3 px-4">{inv.invoiceDate}</td>
                              <td className="p-3 px-4">{inv.dueDate}</td>
                              <td className="p-3 px-4 text-center">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                  inv.status === "Received" || inv.status === "Paid"
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : inv.status === "Partial"
                                    ? "bg-sky-50 text-sky-600 border border-sky-100"
                                    : "bg-amber-50 text-amber-600 border border-amber-100"
                                }`}>
                                  {inv.status || "Due"}
                                </span>
                              </td>
                              <td className="p-3 px-4 text-right font-bold">${Number(inv.total).toLocaleString()}</td>
                              <td className="p-3 px-4 text-right">
                                {role !== "client" && inv.status !== "Received" && inv.status !== "Paid" && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        if (inv.realInvoiceId) {
                                          await updateDoc(doc(db, "invoices", inv.realInvoiceId), {
                                            status: "Received",
                                            amountPaid: inv.total,
                                            balance: 0
                                          });
                                        }
                                        await updateDoc(doc(db, "projects", inv.projectId), {
                                          status: "Completed"
                                        });

                                        await addDoc(collection(db, "payments"), {
                                          invoiceId: inv.invoiceNumber,
                                          clientId: id,
                                          amount: inv.total,
                                          dateReceived: new Date().toISOString().split("T")[0],
                                          method: client?.financials?.paymentMethod || "Bank Transfer",
                                          notes: `Payment for Campaign: ${inv.projectName}`
                                        });

                                        const clientRef = doc(db, "clients", id);
                                        const clientDoc = await getDoc(clientRef);
                                        if (clientDoc.exists()) {
                                          const clientData = clientDoc.data();
                                          const prevPaid = Number(clientData.financials?.totalPaid) || 0;
                                          await updateDoc(clientRef, {
                                            "financials.totalPaid": prevPaid + inv.total,
                                            "financials.lastPaymentDate": new Date().toISOString().split("T")[0],
                                          });
                                        }
                                        alert("Invoice marked as Paid successfully!");
                                      } catch (err) {
                                        alert("Error updating status: " + err.message);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-full text-[10px] font-bold transition shadow-sm whitespace-nowrap inline-block text-center"
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

                {/* Client Payments Received Table */}
                <div className="bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden flex flex-col mt-6">
                  <div className="p-4 bg-sky-50/20 border-b border-sky-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-sky-600">Client Payments Received</h3>
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                      Individual Transaction Logs
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-sky-50/10 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                          <th className="p-3 px-4">Date</th>
                          <th className="p-3 px-4">Invoice / Reference</th>
                          <th className="p-3 px-4">Method</th>
                          <th className="p-3 px-4">Notes</th>
                          <th className="p-3 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                        {clientPayments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-sky-400">
                              No payment logs found for this client.
                            </td>
                          </tr>
                        ) : (
                          [...clientPayments]
                            .sort((a, b) => (b.dateReceived || "").localeCompare(a.dateReceived || ""))
                            .map((pay) => (
                              <tr key={pay.id} className="hover:bg-sky-50/5">
                                <td className="p-3 px-4">{pay.dateReceived}</td>
                                <td className="p-3 px-4 font-bold">
                                  {pay.invoiceId}
                                </td>
                                <td className="p-3 px-4 capitalize">
                                  {pay.isOutstanding ? (
                                    <span className="text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-[10px] font-bold">Outstanding</span>
                                  ) : (
                                    pay.method || "Other"
                                  )}
                                </td>
                                <td className="p-3 px-4 text-sky-400 font-medium">{pay.notes || "None"}</td>
                                {pay.isOutstanding ? (
                                  <td className="p-3 px-4 text-right text-amber-500 font-bold whitespace-nowrap">
                                    Due: ${Number(pay.balance).toLocaleString()}
                                  </td>
                                ) : (
                                  <td className="p-3 px-4 text-right text-emerald-600 font-bold whitespace-nowrap">
                                    +${Number(pay.amount).toLocaleString()}
                                  </td>
                                )}
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
                <div className="overflow-x-auto">
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

            </div>
          )}

          {/* TAB 5: DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              
              {/* Document upload form */}
              {role !== "client" && (
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
                        {uploadLoading ? "Uploading..." : "Upload Document"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Document Registry Table */}
              <div className="p-6 border border-sky-100 rounded-3xl shadow-xl bg-white space-y-4">
                <div className="pb-2 border-b border-sky-50">
                  <h3 className="text-sm font-bold text-sky-600">Document Registry</h3>
                  <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Stored database files and assets</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-sky-50/20 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                        <th className="p-4 px-6 w-20">Preview</th>
                        <th className="p-4 px-6 min-w-[200px]">File Name</th>
                        <th className="p-4 px-6 min-w-[120px]">Category</th>
                        <th className="p-4 px-6 min-w-[120px]">Uploaded On</th>
                        <th className="p-4 px-6 min-w-[150px]">Uploaded By</th>
                        <th className="p-4 px-6 text-right w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                      {documents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-sky-400">
                            No documents uploaded.
                          </td>
                        </tr>
                      ) : (
                        documents.map((doc) => {
                          const isImage = doc.type?.startsWith("image/") || doc.storageUrl?.startsWith("data:image/");
                          return (
                            <tr key={doc.id} className="hover:bg-sky-50/10">
                              {/* Preview */}
                              <td className="p-4 px-6">
                                {isImage ? (
                                  <a href={doc.storageUrl} target="_blank" rel="noopener noreferrer">
                                    <img
                                      src={doc.storageUrl}
                                      className="w-10 h-10 object-cover rounded-lg border border-sky-100 shadow-sm hover:scale-105 transition-transform"
                                      alt={doc.fileName}
                                    />
                                  </a>
                                ) : (
                                  <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center border border-sky-100 text-sky-500">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                )}
                              </td>

                              {/* File Name */}
                              <td className="p-4 px-6 font-bold truncate max-w-[250px]" title={doc.fileName}>
                                {doc.fileName}
                              </td>

                              {/* Category */}
                              <td className="p-4 px-6">
                                <span className="px-2 py-0.5 text-[8px] uppercase tracking-widest font-bold bg-sky-50 border border-sky-200 text-sky-600 rounded-md">
                                  {doc.category}
                                </span>
                              </td>

                              {/* Uploaded On */}
                              <td className="p-4 px-6 text-sky-400">
                                {doc.uploadDate}
                              </td>

                              {/* Uploaded By */}
                              <td className="p-4 px-6 text-sky-400">
                                {doc.uploadedBy}
                              </td>

                              {/* Actions */}
                              <td className="p-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <a
                                    href={doc.storageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={doc.fileName}
                                    className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-600 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all"
                                  >
                                    <FileDown className="w-3.5 h-3.5" />
                                    Download
                                  </a>
                                  {role !== "client" && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDocument(doc.id)}
                                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                      title="Delete Document"
                                    >
                                      <Trash className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
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
            <div className="space-y-6">
              {!checklist ? (
                <div className="text-center py-12 border border-sky-100 rounded-3xl shadow-xl bg-white space-y-4">
                  <div className="text-sky-400 text-xs font-semibold">
                    No onboarding checklist registered for this client.
                  </div>
                  {role !== "client" && (
                    <button
                      onClick={handleInitializeChecklist}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-all shadow"
                    >
                      Initialize Onboarding Checklist
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Step 1: Checklist Selector Grid */}
                  {role !== "client" && (
                    <div className="p-6 border border-sky-100 rounded-3xl shadow-xl bg-white space-y-4">
                      <div className="pb-2 border-b border-sky-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-sky-600">1. Select Milestones to Track</h3>
                          <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">Toggle tasks from the 17 core agency steps</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveSelection}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-all shadow self-end sm:self-auto"
                        >
                          Save Selection to Table
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {checklist.items && checklist.items.map((item) => {
                          const isSelected = selectedKeys.includes(item.id);
                          return (
                            <button
                              type="button"
                              key={item.id}
                              onClick={() => handleToggleSelectKey(item.id)}
                              className={`p-3 rounded-2xl border text-xs text-left flex items-center justify-between font-semibold transition-all ${
                                isSelected
                                  ? "bg-sky-50 border-sky-200 text-sky-600"
                                  : "bg-white border-sky-100 text-sky-400 hover:bg-sky-50/10"
                              }`}
                            >
                              <span>{item.label}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-sky-500 border-sky-500 text-white"
                                  : "border-sky-200 bg-white"
                              }`}>
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Tracked Milestones CRUD Table */}
                  {(() => {
                    const trackedItems = checklist.items ? checklist.items.filter(item => item.tracked !== false) : [];
                    const completedCount = trackedItems.filter(i => i.checked).length;
                    const totalCount = trackedItems.length;
                    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                    
                    return (
                      <div className="space-y-6">
                        {/* Progress Bar */}
                        {totalCount > 0 && (
                          <div className="p-6 border border-sky-100 rounded-3xl shadow-md bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h4 className="text-sm font-bold text-sky-600">Onboarding Completion Status</h4>
                              <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">{completedCount} of {totalCount} tracked tasks completed</p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:max-w-xs">
                              <div className="w-full bg-sky-50 rounded-full h-2 border border-sky-100">
                                <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-sky-600 w-10 text-right">{percent}%</span>
                            </div>
                          </div>
                        )}

                        <div className="p-6 border border-sky-100 rounded-3xl shadow-xl bg-white space-y-4">
                          <div className="pb-2 border-b border-sky-50">
                            <h3 className="text-sm font-bold text-sky-600">2. Onboarding Milestones Table</h3>
                            <p className="text-[10px] text-sky-400 font-bold uppercase mt-0.5">CRUD application linking tasks and project details</p>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-sky-50/20 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                                  <th className="p-4 px-6 w-16">Status</th>
                                  <th className="p-4 px-6 min-w-[180px]">Milestone / Task</th>
                                  <th className="p-4 px-6 min-w-[150px]">Project</th>
                                  <th className="p-4 px-6 min-w-[220px]">Project Details</th>
                                  <th className="p-4 px-6 min-w-[180px]">Notes</th>
                                  {role !== "client" && <th className="p-4 px-6 text-right w-24">Actions</th>}
                                </tr>
                              </thead>
                              <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                                {trackedItems.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="p-8 text-center text-sky-400">
                                      No milestones selected. Choose steps to track in Step 1.
                                    </td>
                                  </tr>
                                ) : (
                                  trackedItems.map((item) => {
                                    const isEditing = editingRowId === item.id;
                                    const rowData = isEditing ? editRowData : item;
                                    const isChecked = item.checked === true;
                                    const linkedProject = projects.find(p => p.id === item.projectId);

                                    return (
                                      <tr key={item.id} className={`hover:bg-sky-50/5 ${isChecked ? "bg-sky-50/10" : ""}`}>
                                        {/* Status */}
                                        <td className="p-4 px-6">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (role === "client") return;
                                              handleToggleItem(item.id, !isChecked);
                                            }}
                                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                                              role === "client" ? "cursor-default " : "hover:border-sky-300 "
                                            }${
                                              isChecked ? "bg-sky-500 border-sky-500 text-white" : "border-sky-200 bg-white"
                                            }`}
                                          >
                                            {isChecked && <Check className="w-3.5 h-3.5" />}
                                          </button>
                                        </td>

                                        {/* Milestone Name */}
                                        <td className="p-4 px-6 font-bold text-sky-700">
                                          {item.label}
                                        </td>

                                        {/* Project Association */}
                                        <td className="p-4 px-6">
                                          {isEditing ? (
                                            <select
                                              value={rowData.projectId || ""}
                                              onChange={(e) => setEditRowData({ ...rowData, projectId: e.target.value })}
                                              className="w-full p-1.5 border border-sky-100 rounded-lg text-xs bg-white text-sky-600 focus:outline-none focus:border-sky-300"
                                            >
                                              <option value="">General Onboarding</option>
                                              {projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                  {p.name}
                                                </option>
                                              ))}
                                            </select>
                                          ) : (
                                            <span className="text-[10px] uppercase font-bold bg-sky-50/50 border border-sky-100 text-sky-500 px-2 py-0.5 rounded-md truncate max-w-[120px] inline-block" title={linkedProject?.name || "General Onboarding"}>
                                              {linkedProject ? linkedProject.name : "General Onboarding"}
                                            </span>
                                          )}
                                        </td>

                                        {/* Project Details */}
                                        <td className="p-4 px-6 text-sky-500 text-[10px]">
                                          {linkedProject ? (
                                            <div className="space-y-0.5 font-normal">
                                              <p><span className="font-bold text-sky-600">Status:</span> {linkedProject.status}</p>
                                              <p><span className="font-bold text-sky-600">Deadline:</span> {linkedProject.deadline || "None"}</p>
                                              <p><span className="font-bold text-sky-600">Value:</span> ${Number(linkedProject.value).toLocaleString()}</p>
                                            </div>
                                          ) : (
                                            <span className="opacity-50">No project associated</span>
                                          )}
                                        </td>

                                        {/* Notes */}
                                        <td className="p-4 px-6 text-sky-500">
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={rowData.notes || ""}
                                              placeholder="Add notes..."
                                              onChange={(e) => setEditRowData({ ...rowData, notes: e.target.value })}
                                              className="w-full p-1.5 border border-sky-100 rounded-lg text-xs bg-white text-sky-600 focus:outline-none focus:border-sky-300"
                                            />
                                          ) : (
                                            <p className="text-sky-400 truncate max-w-[150px] font-normal italic" title={item.notes || "No notes"}>
                                              {item.notes || <span className="opacity-50">No notes</span>}
                                            </p>
                                          )}
                                        </td>

                                        {/* Actions */}
                                        {role !== "client" && (
                                          <td className="p-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              {isEditing ? (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={handleSaveRow}
                                                    className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                                                    title="Save Row"
                                                  >
                                                    <Save className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setEditingRowId(null);
                                                      setEditRowData(null);
                                                    }}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
                                                    title="Cancel"
                                                  >
                                                    <X className="w-3.5 h-3.5" />
                                                  </button>
                                                </>
                                              ) : (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleStartEditRow(item)}
                                                    className="p-1.5 rounded-lg text-sky-500 hover:bg-sky-50 transition-colors"
                                                    title="Edit Notes & Project"
                                                  >
                                                    <Edit className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRemoveTrackedItem(item.id)}
                                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    title="Remove from tracking table"
                                                  >
                                                    <Trash className="w-3.5 h-3.5" />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
