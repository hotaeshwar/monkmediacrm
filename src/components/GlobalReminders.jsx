"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Bell, X, Clock, Trash2, Volume2, AlertCircle, Sparkles } from "lucide-react";

// Normalizes YYYY-MM-DD and DD-MM-YYYY formats to YYYY-MM-DD string format
const normalizeToYmd = (dateStr) => {
  if (!dateStr) return "";
  const cleaned = String(dateStr).trim();
  if (cleaned.indexOf("-") === 4) {
    return cleaned; // Already YYYY-MM-DD
  }
  if (cleaned.indexOf("-") === 2) {
    const parts = cleaned.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert DD-MM-YYYY to YYYY-MM-DD
  }
  if (cleaned.indexOf("/") === 4) {
    return cleaned.replace(/\//g, "-"); // Convert YYYY/MM/DD to YYYY-MM-DD
  }
  if (cleaned.indexOf("/") === 2) {
    const parts = cleaned.split("/");
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert DD/MM/YYYY to YYYY-MM-DD
  }
  return cleaned;
};

// Memoized global AudioContext to bypass browser autoplay blocks on subsequent calls
let globalAudioCtx = null;
const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!globalAudioCtx) {
    globalAudioCtx = new AudioCtxClass();
  }
  return globalAudioCtx;
};

export default function GlobalReminders() {
  const { currentUser, role, clientId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dismissedTaskAlarms, setDismissedTaskAlarms] = useState([]);
  
  const [invoices, setInvoices] = useState([]);
  const [dismissedInvoiceAlarms, setDismissedInvoiceAlarms] = useState([]);

  // Clear dismissed alarms on mount (page refresh) so reminders come properly
  useEffect(() => {
    setDismissedTaskAlarms([]);
    setDismissedInvoiceAlarms([]);
    try {
      localStorage.removeItem("dismissed_task_alarms");
      localStorage.removeItem("dismissed_invoice_alarms");
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Web Audio Context Autoplay Policy Unlock
  useEffect(() => {
    const resumeAudio = () => {
      try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === "suspended") {
          ctx.resume();
        }
      } catch (e) {
        console.warn("Audio Context unlock error:", e);
      }
    };
    window.addEventListener("click", resumeAudio, { once: true });
    window.addEventListener("touchstart", resumeAudio, { once: true });
    return () => {
      window.removeEventListener("click", resumeAudio);
      window.removeEventListener("touchstart", resumeAudio);
    };
  }, []);

  // Fetch tasks for active user
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "tasks"),
      where("assignedUserId", "==", currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setTasks(list);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch invoices for admin/manager/client
  useEffect(() => {
    if (!currentUser || !role) return;

    let q;
    if (role === "admin" || role === "manager") {
      q = collection(db, "invoices");
    } else if (role === "client" && clientId) {
      q = query(collection(db, "invoices"), where("clientId", "==", clientId));
    } else {
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setInvoices(list);
    });
    return () => unsubscribe();
  }, [currentUser, role, clientId]);

  // Filter for active overdue/due today tasks using timezone-safe local date string
  const getOverdueTasks = () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return tasks.filter((t) => {
      const isPending = t.status !== "Completed" && t.status !== "Cancelled";
      if (!isPending || !t.dueDate) return false;
      const taskDueDateYmd = normalizeToYmd(t.dueDate);
      return taskDueDateYmd && taskDueDateYmd <= todayStr;
    });
  };

  // Filter for overdue invoices using timezone-safe local date string
  const getOverdueInvoices = () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return invoices.filter((inv) => {
      const status = inv.status || "Due";
      const isUnpaid = status !== "Received" && status !== "Paid";
      if (!isUnpaid || !inv.dueDate) return false;
      const invDueDateYmd = normalizeToYmd(inv.dueDate);
      return invDueDateYmd && invDueDateYmd < todayStr;
    });
  };

  const overdueTasks = getOverdueTasks();
  const activeOverdueAlarms = overdueTasks.filter((t) => !dismissedTaskAlarms.includes(t.id));

  const overdueInvoices = getOverdueInvoices();
  const activeOverdueInvoiceAlarms = overdueInvoices.filter((inv) => !dismissedInvoiceAlarms.includes(inv.id));

  const totalOverdueCount = activeOverdueAlarms.length + activeOverdueInvoiceAlarms.length;

  // Monitor trigger times (Automatic Task & Invoice Alarms)
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeAlarm) return;

      if (activeOverdueAlarms.length > 0) {
        const pendingTask = activeOverdueAlarms[0];
        setActiveAlarm({
          id: `task-alarm-${pendingTask.id}`,
          isTask: true,
          taskId: pendingTask.id,
          title: `Automatic Alarm: Pending Task Overdue!`,
          triggerTime: pendingTask.dueDate,
          notes: `Task "${pendingTask.name}" has an active pendency state (Not Completed or Cancelled) and its deadline of ${pendingTask.dueDate} is reached or passed.`
        });
      } else if (activeOverdueInvoiceAlarms.length > 0) {
        const pendingInvoice = activeOverdueInvoiceAlarms[0];
        setActiveAlarm({
          id: `invoice-alarm-${pendingInvoice.id}`,
          isInvoice: true,
          invoiceId: pendingInvoice.id,
          title: `Collection Alarm: Invoice Overdue!`,
          triggerTime: pendingInvoice.dueDate,
          notes: `Invoice #${pendingInvoice.invoiceNumber} for client "${pendingInvoice.clientName || 'General'}" has an outstanding balance of $${Number(pendingInvoice.balance).toLocaleString()} and exceeded its due date of ${pendingInvoice.dueDate}.`
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOverdueAlarms, activeOverdueInvoiceAlarms, activeAlarm]);

  // Web Audio Alarm Chime Loop wrapped in safety handlers
  useEffect(() => {
    let chimeInterval = null;
    if (activeAlarm) {
      try {
        playChimeTune();
        chimeInterval = setInterval(() => {
          try {
            playChimeTune();
          } catch (e) {
            console.warn("Chime loop playback failed:", e);
          }
        }, 2500);
      } catch (err) {
        console.warn("Chime start playback failed:", err);
      }
    }
    return () => {
      if (chimeInterval) {
        clearInterval(chimeInterval);
      }
    };
  }, [activeAlarm]);

  const playChimeTune = () => {
    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const playTone = (time, pitch, dur) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(pitch, time);
        
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.25, time + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur - 0.02);
        
        osc.start(time);
        osc.stop(time + dur);
      };

      const now = audioCtx.currentTime;
      playTone(now, 659.25, 0.2); // E5
      playTone(now + 0.15, 783.99, 0.2); // G5
      playTone(now + 0.3, 1046.5, 0.45); // C6
    } catch (err) {
      console.warn("Web Audio API not initialized:", err);
    }
  };

  const handleDismissTask = (taskId) => {
    const nextDismissed = [...dismissedTaskAlarms, taskId];
    setDismissedTaskAlarms(nextDismissed);
    localStorage.setItem("dismissed_task_alarms", JSON.stringify(nextDismissed));
    if (activeAlarm && activeAlarm.taskId === taskId) {
      setActiveAlarm(null);
    }
  };

  const handleDismissInvoice = (invoiceId) => {
    const nextDismissed = [...dismissedInvoiceAlarms, invoiceId];
    setDismissedInvoiceAlarms(nextDismissed);
    localStorage.setItem("dismissed_invoice_alarms", JSON.stringify(nextDismissed));
    if (activeAlarm && activeAlarm.invoiceId === invoiceId) {
      setActiveAlarm(null);
    }
  };

  const handleClearDismissed = () => {
    setDismissedTaskAlarms([]);
    setDismissedInvoiceAlarms([]);
    localStorage.removeItem("dismissed_task_alarms");
    localStorage.removeItem("dismissed_invoice_alarms");
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Floating Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-6 z-[999] p-3.5 bg-gradient-to-r from-sky-400 to-[#348eab] text-white rounded-full shadow-2xl hover:scale-105 transition-all duration-300 group"
        title="Active CRM Pendencies"
      >
        <div className="relative">
          <Bell className="w-5 h-5 group-hover:animate-bounce" />
          {totalOverdueCount > 0 && (
            <span className="absolute -top-3.5 -right-3.5 flex flex-col items-center justify-center rounded-2xl bg-red-500 text-[8px] font-black text-white px-2 py-1 ring-2 ring-white shadow-lg animate-pulse whitespace-nowrap leading-none min-w-[28px]">
              <div>{totalOverdueCount}</div>
              <div className="text-[6px] font-medium scale-90 mt-0.5 opacity-90">
                {activeOverdueAlarms.length}T / {activeOverdueInvoiceAlarms.length}I
              </div>
            </span>
          )}
        </div>
      </button>

      {/* Slide-out reminders panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end bg-sky-950/20 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white h-screen shadow-2xl p-6 flex flex-col justify-between border-l border-sky-100 animate-slide-in">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-sky-50 mb-5">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-sky-600">Pending CRM Alerts</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-sky-400 hover:bg-sky-50 rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Overdue Alerts Pool */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] uppercase tracking-widest font-black text-sky-400">
                      Overdue Work Items ({overdueTasks.length})
                    </h4>
                    {(dismissedTaskAlarms.length > 0 || dismissedInvoiceAlarms.length > 0) && (
                      <button
                        onClick={handleClearDismissed}
                        className="text-[9px] text-sky-500 hover:text-sky-600 font-bold transition"
                      >
                        Reset Silenced
                      </button>
                    )}
                  </div>

                  {overdueTasks.length === 0 ? (
                    <div className="text-center py-10 bg-sky-50/20 border border-sky-100/50 rounded-2xl p-4">
                      <Sparkles className="w-6 h-6 text-sky-400 mx-auto mb-2" />
                      <p className="text-xs text-sky-500 font-bold">All caught up!</p>
                      <p className="text-[10px] text-sky-400 mt-1">No active pending tasks past their deadline.</p>
                    </div>
                  ) : (
                    overdueTasks.map((t) => {
                      const isSilenced = dismissedTaskAlarms.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          className={`p-3.5 border rounded-2xl transition-all shadow-xs space-y-2 ${
                            isSilenced 
                              ? "bg-slate-50 border-slate-200 opacity-60" 
                              : "bg-red-50/30 border-red-100"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-xs font-bold text-sky-600 leading-snug">{t.name}</p>
                            <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-100 text-red-600 font-black uppercase">
                              Overdue
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] text-sky-400 font-bold">
                            <span>Deadline: {t.dueDate}</span>
                            <button
                              onClick={() => handleDismissTask(t.id)}
                              disabled={isSilenced}
                              className={`px-2 py-0.5 rounded border transition-colors ${
                                isSilenced
                                  ? "bg-slate-100 text-slate-400 border-slate-200"
                                  : "bg-white border-red-200 text-red-500 hover:bg-red-50"
                              }`}
                            >
                              {isSilenced ? "Silenced" : "Silence Alarm"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Overdue Invoices / Retainers Section */}
                {(role === "admin" || role === "manager" || role === "client") && (
                  <div className="pt-4 border-t border-sky-100/50 space-y-3">
                    <h4 className="text-[10px] uppercase tracking-widest font-black text-sky-400">
                      Overdue Invoices / Retainers ({overdueInvoices.length})
                    </h4>
                    {overdueInvoices.length === 0 ? (
                      <div className="text-center py-10 bg-sky-50/20 border border-sky-100/50 rounded-2xl p-4">
                        <Sparkles className="w-6 h-6 text-sky-400 mx-auto mb-2" />
                        <p className="text-xs text-sky-500 font-bold">All payments collected!</p>
                        <p className="text-[10px] text-sky-400 mt-1">No outstanding invoices past their due date.</p>
                      </div>
                    ) : (
                      overdueInvoices.map((inv) => {
                        const isSilenced = dismissedInvoiceAlarms.includes(inv.id);
                        return (
                          <div
                            key={inv.id}
                            className={`p-3.5 border rounded-2xl transition-all shadow-xs space-y-2 ${
                              isSilenced 
                                ? "bg-slate-50 border-slate-200 opacity-60" 
                                : "bg-red-50/30 border-red-100"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-sky-600 leading-snug">
                                  Invoice #{inv.invoiceNumber}
                                </p>
                                <p className="text-[10px] text-sky-500 font-bold">
                                  {inv.clientName}
                                </p>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-100 text-red-600 font-black uppercase">
                                Overdue (${Number(inv.balance || 0).toLocaleString()})
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-sky-400 font-bold">
                              <span>Due Date: {inv.dueDate}</span>
                              <button
                                onClick={() => handleDismissInvoice(inv.id)}
                                disabled={isSilenced}
                                className={`px-2 py-0.5 rounded border transition-colors ${
                                  isSilenced
                                    ? "bg-slate-100 text-slate-400 border-slate-200"
                                    : "bg-white border-red-200 text-red-500 hover:bg-red-50"
                                }`}
                              >
                                {isSilenced ? "Silenced" : "Silence Alarm"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t border-sky-50 text-center">
              <span className="text-[9px] text-sky-400 font-medium">Automatic CRM Alarm Dispatcher</span>
            </div>
          </div>
        </div>
      )}

      {/* Alarm ringing popup detail view */}
      {activeAlarm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-sky-950/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-sky-100 rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 animate-scale-up">
            
            {/* Bell animation */}
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-100 relative">
              <span className="absolute inset-0 rounded-full bg-red-400/30 animate-ping"></span>
              <Bell className="w-8 h-8 animate-bounce" />
            </div>

            {/* Title / Detail View */}
            <div className="space-y-1">
              <span className="text-[9px] bg-red-100 text-red-600 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Event Alert Ringing
              </span>
              <h2 className="text-xl font-black text-sky-600 pt-2">{activeAlarm.title}</h2>
              <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Deadline was {activeAlarm.triggerTime}
              </p>
            </div>

            {activeAlarm.notes && (
              <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100 text-xs text-sky-600 text-left font-medium leading-relaxed max-h-[150px] overflow-y-auto">
                <h4 className="text-[9px] uppercase tracking-widest font-black text-sky-500 mb-1">Details / Notes</h4>
                {activeAlarm.notes}
              </div>
            )}

            {/* Cancel/Dismiss Controls */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  if (activeAlarm.isTask) {
                    handleDismissTask(activeAlarm.taskId);
                  } else if (activeAlarm.isInvoice) {
                    handleDismissInvoice(activeAlarm.invoiceId);
                  }
                }}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-xs font-bold transition shadow-md flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" /> Silence & Dismiss Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
