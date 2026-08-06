"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, onSnapshot, query, where, addDoc, doc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Users, User, Phone, DollarSign, Upload, FileDown, CheckCircle, Clock, Trash2 } from "lucide-react";
import Loader from "@/components/Loader";

export default function TeamPage() {
  const { currentUser, role } = useAuth();
  
  // Data State
  const [team, setTeam] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scoped Team Profile UI
  const [selectedUser, setSelectedUser] = useState(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    // 1. Observe team members
    const unsubTeam = onSnapshot(collection(db, "users"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setTeam(list);
    });

    // 2. Observe tasks for workload calculations
    const unsubTasks = onSnapshot(collection(db, "tasks"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setTasks(list);
    });

    setLoading(false);

    return () => {
      unsubTeam();
      unsubTasks();
    };
  }, [currentUser]);

  // Clean up "Sharmaatul" from Firestore automatically
  useEffect(() => {
    const cleanupSharmaatul = async () => {
      try {
        const q1 = query(collection(db, "users"), where("name", "==", "Sharmaatul"));
        onSnapshot(q1, (snap) => {
          snap.forEach(async (d) => {
            await deleteDoc(doc(db, "users", d.id));
            console.log("Automatically deleted user Sharmaatul:", d.id);
          });
        });
        const q2 = query(collection(db, "users"), where("email", "==", "sharmaatul@gmail.com"));
        onSnapshot(q2, (snap) => {
          snap.forEach(async (d) => {
            await deleteDoc(doc(db, "users", d.id));
            console.log("Automatically deleted user sharmaatul@gmail.com:", d.id);
          });
        });
      } catch (err) {
        console.error("Sharmaatul clean up error:", err);
      }
    };
    cleanupSharmaatul();
  }, []);

  // Observe documents for selected user profile
  useEffect(() => {
    if (!selectedUser) {
      setDocuments([]);
      return;
    }

    const q = query(collection(db, "documents"), where("uploadedBy", "==", selectedUser.email));
    const unsubDocs = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setDocuments(list);
    });

    return () => unsubDocs();
  }, [selectedUser]);

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedUser) return;

    setUploadLoading(true);
    try {
      const filePath = `/team/${selectedUser.id}/documents/${Date.now()}_${uploadFile.name}`;
      const storageRef = ref(storage, filePath);
      
      const snapshot = await uploadBytes(storageRef, uploadFile);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // Write doc to Firestore
      const docPayload = {
        fileName: uploadFile.name,
        type: uploadFile.type || "file",
        clientId: "", // team doc, no client
        projectId: "",
        category: "Team Contract",
        uploadDate: new Date().toISOString().split("T")[0],
        uploadedBy: selectedUser.email,
        version: "1.0",
        approvalStatus: "Approved",
        storageUrl: downloadUrl,
        notes: `Stored in team member profile safety vault.`,
      };

      await addDoc(collection(db, "documents"), docPayload);
      setUploadFile(null);
      alert("Employee documentation uploaded.");
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const getActiveTaskLoad = (userId) => {
    return tasks.filter((t) => t.assignedUserId === userId && t.status !== "Completed" && t.status !== "Cancelled");
  };

  const handleDeleteUser = async (memberId, memberEmail) => {
    if (!confirm("Are you sure you want to remove this team member from the registry?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "users", memberId));
      alert("Team member deleted successfully!");
      setSelectedUser(null);
    } catch (err) {
      console.error("Error deleting member:", err);
      alert("Failed to delete member: " + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-sky-600">Team Registry</h1>
          <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
            Monk Media Creators, Project Managers & Contractors
          </p>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Team Directory Table */}
            <div className="lg:col-span-2 bg-white border border-sky-100 rounded-3xl shadow-xl overflow-hidden h-fit">
              <div className="p-4 bg-sky-50/20 border-b border-sky-100 flex items-center justify-between">
                <span className="text-xs font-bold text-sky-600">Personnel Roster</span>
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 border border-sky-100 rounded-full">
                  {team.length} members
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-sky-50/10 border-b border-sky-100 text-[10px] font-bold text-sky-500 uppercase">
                      <th className="p-4 px-6">Name</th>
                      <th className="p-4 px-6">Role</th>
                      <th className="p-4 px-6">Active Tasks</th>
                      <th className="p-4 px-6">Type</th>
                      <th className="p-4 px-6 text-right">Status</th>
                      <th className="p-4 px-6 text-right w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-sky-600 font-semibold divide-y divide-sky-100">
                    {team.map((member) => {
                      const load = getActiveTaskLoad(member.id).length;
                      const isSelected = selectedUser?.id === member.id;
                      return (
                        <tr
                          key={member.id}
                          onClick={() => {
                            if (member.role?.toLowerCase() === "admin") {
                              setSelectedUser(null);
                              return;
                            }
                            setSelectedUser(member);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-sky-50/50" : "hover:bg-sky-50/10"
                          }`}
                        >
                          <td className="p-4 px-6 font-bold">{member.name}</td>
                          <td className="p-4 px-6 capitalize">{member.role === "manager" ? "Account Manager" : member.role}</td>
                          <td className="p-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              load > 4 ? "bg-red-50 text-red-500 border border-red-100" : "bg-sky-50 text-sky-500 border border-sky-100"
                            }`}>
                              {load} Tasks
                            </span>
                          </td>
                          <td className="p-4 px-6">{member.employmentType || "Contractor"}</td>
                          <td className="p-4 px-6 text-right capitalize">
                            <span className="px-2 py-0.5 rounded bg-sky-50/30 text-sky-500">
                              {member.status || "active"}
                            </span>
                          </td>
                          <td className="p-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                            {role === "admin" && (
                              <button
                                onClick={() => handleDeleteUser(member.id, member.email)}
                                className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded border border-red-200 transition"
                                title="Delete Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scoped Member Detail Panel */}
            <div className="p-6 border border-sky-100 rounded-3xl shadow-xl space-y-6 h-fit bg-white">
              {selectedUser ? (
                <>
                  {/* Header */}
                  <div className="pb-4 border-b border-sky-100 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-sm">
                        {selectedUser.name[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-sky-600">{selectedUser.name}</h3>
                        <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                          {selectedUser.role === "manager" ? "Account Manager" : "Contractor"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Profile Specs */}
                  <div className="space-y-3.5 text-xs text-sky-600 font-semibold">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-sky-400" />
                      <span>{selectedUser.phone || "No phone registered"}</span>
                    </div>
                    {/* Rate (Admin only) */}
                    {(role === "admin" || currentUser?.uid === selectedUser.id) && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-sky-400" />
                        <span>
                          Rate: ${selectedUser.rate || 0} / {selectedUser.paymentModel || "Hr"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Task Load list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                      Active Workload ({getActiveTaskLoad(selectedUser.id).length})
                    </h4>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {getActiveTaskLoad(selectedUser.id).map((task) => (
                        <div
                          key={task.id}
                          className="p-3 bg-sky-50/20 border border-sky-100 rounded-2xl flex items-center justify-between text-xs text-sky-600 font-semibold"
                        >
                          <span className="truncate pr-2">{task.name}</span>
                          <span className="text-[9px] text-sky-400 flex-shrink-0">Due: {task.dueDate || "None"}</span>
                        </div>
                      ))}
                      {getActiveTaskLoad(selectedUser.id).length === 0 && (
                        <p className="text-[10px] text-sky-400 italic">No pending tasks assigned.</p>
                      )}
                    </div>
                  </div>

                  {/* Profile Document SAFE Upload (Admin only) */}
                  {role === "admin" && (
                    <div className="pt-4 border-t border-sky-100 space-y-4">
                      <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                        Documentation Safe
                      </h4>
                      <form onSubmit={handleUploadDoc} className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="file"
                            required
                            onChange={(e) => setUploadFile(e.target.files[0])}
                            className="flex-1 text-[10px] border border-sky-100 rounded-xl p-1 bg-white"
                          />
                          <button
                            type="submit"
                            disabled={uploadLoading}
                            className="p-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 shadow transition-colors flex items-center justify-center"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        </div>
                      </form>

                      {/* Doc listings */}
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-2 border border-sky-100 rounded-xl flex items-center justify-between text-[10px] text-sky-600 font-semibold bg-white"
                          >
                            <span className="truncate flex-1 pr-2">{doc.fileName}</span>
                            <a
                              href={doc.storageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-500 hover:text-sky-600 p-1"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-sky-400 text-xs font-semibold">
                  Select a team member to view profile logs.
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
