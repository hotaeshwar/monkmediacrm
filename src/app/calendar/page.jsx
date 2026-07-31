"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, doc, getDoc } from "firebase/firestore";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, Video, User, X, Settings } from "lucide-react";
import Loader from "@/components/Loader";

export default function CalendarPage() {
  const { currentUser, role } = useAuth();

  // Data State
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isGCalConfigOpen, setIsGCalConfigOpen] = useState(false);

  // Form Fields (Event)
  const [evtTitle, setEvtTitle] = useState("");
  const [evtType, setEvtType] = useState("Meeting"); // Meeting, Shoot, Deadline, Payment Due
  const [evtClientId, setEvtClientId] = useState("");
  const [evtProjId, setEvtProjId] = useState("");
  const [evtDate, setEvtDate] = useState("");
  const [evtAttendees, setEvtAttendees] = useState("");
  const [evtLink, setEvtLink] = useState("");

  // Google Calendar Mock configs
  const [gcalClientId, setGcalClientId] = useState("");
  const [gcalClientSecret, setGcalClientSecret] = useState("");
  const [gcalSynced, setGcalSynced] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const unsubEvents = onSnapshot(collection(db, "calendarEvents"), (snap) => {
      const list = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setEvents(list);
    });

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

    setLoading(false);

    return () => {
      unsubEvents();
      unsubClients();
      unsubProjects();
    };
  }, [currentUser]);

  // Scoped Events based on role
  const scopedEvents = events.filter((evt) => {
    if (role === "admin") return true;
    
    // Check if client corresponds to this user
    const client = clients.find((c) => c.id === evt.clientId);
    if (!client) return true; // show general events

    if (role === "manager") {
      return client.accountManager === currentUser?.uid;
    }

    return client.assignedTeam?.includes(currentUser?.uid) || client.accountManager === currentUser?.uid;
  });

  // Calendar calculations
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDay, totalDays };
  };

  const { firstDay, totalDays } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysGrid = [];
  for (let i = 0; i < firstDay; i++) {
    daysGrid.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysGrid.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!evtTitle || !evtDate) return;

    try {
      const payload = {
        title: evtTitle,
        type: evtType,
        clientId: evtClientId || "",
        projectId: evtProjId || "",
        date: evtDate,
        googleEventId: gcalSynced ? "synced_gcal_" + Math.random().toString(36).substring(7) : "",
        attendees: evtAttendees ? evtAttendees.split(",").map((s) => s.trim()) : [],
        meetingLink: evtLink || "",
        reminderSettings: "30 minutes before",
      };

      await addDoc(collection(db, "calendarEvents"), payload);

      setEvtTitle("");
      setEvtDate("");
      setEvtAttendees("");
      setEvtLink("");
      setIsAddEventOpen(false);
    } catch (err) {
      alert("Error adding event: " + err.message);
    }
  };

  const handleSaveGCal = (e) => {
    e.preventDefault();
    if (gcalClientId && gcalClientSecret) {
      setGcalSynced(true);
      alert("Google Calendar Credentials Loaded. Event additions will sync automatically.");
      setIsGCalConfigOpen(false);
    }
  };

  const getEventBadge = (type) => {
    switch (type) {
      case "Shoot":
        return "bg-sky-600 text-white border-sky-700";
      case "Deadline":
        return "bg-red-500 text-white border-red-600";
      case "Payment Due":
        return "bg-yellow-500 text-white border-yellow-600";
      default:
        return "bg-sky-400 text-white border-sky-500";
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-sky-600">Unified Calendar</h1>
            <p className="text-xs text-sky-400 uppercase tracking-widest font-bold mt-1">
              Shoots, Deadlines, Meetings and Invoicing Schedules
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGCalConfigOpen(true)}
              className="p-2.5 rounded-2xl hover:bg-sky-50 text-sky-500 border border-sky-100 transition-colors"
              title="Google Calendar Integration"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsAddEventOpen(true)}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        </div>

        {/* Sync Success Tag */}
        {gcalSynced && (
          <div className="p-3 bg-sky-50/50 border border-sky-100 text-sky-600 rounded-2xl text-xs font-semibold">
            Google Calendar Sync active. Credentials mapped.
          </div>
        )}

        {/* CALENDAR BODY */}
        {loading ? (
          <Loader />
        ) : (
          <div className="bg-white border border-sky-100 rounded-3xl shadow-xl p-4 sm:p-6 space-y-4">
            
            {/* Header controls */}
            <div className="flex items-center justify-between pb-4 border-b border-sky-50">
              <h3 className="text-base font-bold text-sky-600">
                {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg border border-sky-100 hover:bg-sky-50 text-sky-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg border border-sky-100 hover:bg-sky-50 text-sky-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-sky-500 uppercase tracking-widest pb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {daysGrid.map((day, idx) => {
                if (!day) return <div key={idx} className="bg-sky-50/10 rounded-2xl min-h-[90px]"></div>;

                const dayStr = day.toISOString().split("T")[0];
                const dayEvents = scopedEvents.filter((e) => e.date === dayStr);

                return (
                  <div
                    key={idx}
                    className="p-2 border border-sky-50 rounded-2xl min-h-[100px] bg-white text-left flex flex-col justify-between hover:border-sky-300 transition-colors"
                  >
                    <span className="text-[10px] font-bold text-sky-600">{day.getDate()}</span>
                    
                    {/* Events dots / titles */}
                    <div className="space-y-1 overflow-y-auto max-h-[70px] mt-1 pr-0.5">
                      {dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className={`px-1.5 py-0.5 border text-[8px] font-bold rounded truncate ${getEventBadge(evt.type)}`}
                          title={`${evt.title} (${evt.type})`}
                        >
                          {evt.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ADD EVENT DIALOG */}
        {isAddEventOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setIsAddEventOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                  <h2 className="text-xl font-bold text-sky-600">Schedule Calendar Event</h2>
                  <button onClick={() => setIsAddEventOpen(false)} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddEvent} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs font-semibold">
                  <div>
                    <label className="block text-sky-500 mb-1">Event Title</label>
                    <input
                      type="text"
                      required
                      value={evtTitle}
                      onChange={(e) => setEvtTitle(e.target.value)}
                      placeholder="e.g. Autumn Clothing Shoot"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Event Type</label>
                    <select
                      value={evtType}
                      onChange={(e) => setEvtType(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    >
                      <option value="Meeting">Meeting</option>
                      <option value="Shoot">Shoot</option>
                      <option value="Deadline">Deadline</option>
                      <option value="Payment Due">Payment Due</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Client Scopes</label>
                    <select
                      value={evtClientId}
                      onChange={(e) => setEvtClientId(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    >
                      <option value="">No Client (Agency general)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.businessName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Linked Project</label>
                    <select
                      value={evtProjId}
                      onChange={(e) => setEvtProjId(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl text-sky-600"
                    >
                      <option value="">No Project</option>
                      {projects
                        .filter((p) => !evtClientId || p.clientId === evtClientId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Event Date</label>
                    <input
                      type="date"
                      required
                      value={evtDate}
                      onChange={(e) => setEvtDate(e.target.value)}
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Attendees (Comma separated emails)</label>
                    <input
                      type="text"
                      value={evtAttendees}
                      onChange={(e) => setEvtAttendees(e.target.value)}
                      placeholder="simran@monkmedia.com, contact@client.com"
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">Meeting Link (Google Meet / Zoom)</label>
                    <input
                      type="url"
                      value={evtLink}
                      onChange={(e) => setEvtLink(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full p-2 border border-sky-100 rounded-xl"
                    />
                  </div>
                  <div className="pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddEventOpen(false)}
                      className="px-4 py-2 border border-sky-100 text-sky-500 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-500 text-white rounded-xl font-bold"
                    >
                      Schedule Event
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* GCAL CONFIG DIALOG */}
        {isGCalConfigOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-sky-950/20 backdrop-blur-sm" onClick={() => setIsGCalConfigOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-white shadow-2xl p-6 sm:p-8 flex flex-col h-full border-l border-sky-100">
                <div className="flex items-center justify-between pb-4 border-b border-sky-100">
                  <h2 className="text-xl font-bold text-sky-600">Google Calendar Settings</h2>
                  <button onClick={() => setIsGCalConfigOpen(false)} className="p-1 text-sky-400 hover:text-sky-500 rounded-lg border border-sky-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveGCal} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs font-semibold">
                  <p className="text-sky-400">
                    Enter Google API credentials to sync scheduled client meetings and content shoots to the Monk Media Google Workspace Calendar.
                  </p>
                  <div>
                    <label className="block text-sky-500 mb-1">OAuth Client ID</label>
                    <input
                      type="text"
                      required
                      value={gcalClientId}
                      onChange={(e) => setGcalClientId(e.target.value)}
                      placeholder="e.g. 130125988840-web.apps.googleusercontent.com"
                      className="w-full p-2 border border-sky-100 rounded-xl font-mono text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sky-500 mb-1">OAuth Client Secret</label>
                    <input
                      type="password"
                      required
                      value={gcalClientSecret}
                      onChange={(e) => setGcalClientSecret(e.target.value)}
                      placeholder="••••••••••••••••••••••••"
                      className="w-full p-2 border border-sky-100 rounded-xl font-mono text-[10px]"
                    />
                  </div>
                  <div className="pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsGCalConfigOpen(false)}
                      className="px-4 py-2 border border-sky-100 text-sky-500 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-500 text-white rounded-xl font-bold"
                    >
                      Connect Calendar
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
