"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Bell, X, Clock, Trash2, Volume2, AlertCircle, Sparkles } from "lucide-react";

export default function GlobalReminders() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dismissedTaskAlarms, setDismissedTaskAlarms] = useState([]);

  // Load dismissed alarms on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dismissed_task_alarms");
      if (stored) {
        setDismissedTaskAlarms(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
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

  // Filter for active overdue/due today tasks
  const getOverdueTasks = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    return tasks.filter((t) => {
      const isPending = t.status !== "Completed" && t.status !== "Cancelled";
      const hasPassedDeadline = t.dueDate && t.dueDate <= todayStr;
      return isPending && hasPassedDeadline;
    });
  };

  const overdueTasks = getOverdueTasks();
  const activeOverdueAlarms = overdueTasks.filter((t) => !dismissedTaskAlarms.includes(t.id));

  // Monitor trigger times (Automatic Task Pendencies only)
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
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOverdueAlarms, activeAlarm]);

  // Web Audio Alarm Chime Loop
  useEffect(() => {
    let chimeInterval = null;
    if (activeAlarm) {
      playChimeTune();
      chimeInterval = setInterval(() => {
        playChimeTune();
      }, 2500);
    }
    return () => {
      if (chimeInterval) {
        clearInterval(chimeInterval);
      }
    };
  }, [activeAlarm]);

  const playChimeTune = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

  const handleClearDismissed = () => {
    setDismissedTaskAlarms([]);
    localStorage.removeItem("dismissed_task_alarms");
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
          {activeOverdueAlarms.length > 0 && (
            <span className="absolute -top-2.5 -right-2.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
              {activeOverdueAlarms.length}
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
                  <h3 className="font-bold text-sky-600">Pending Tasks Alerts</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-sky-400 hover:bg-sky-50 rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Overdue Alerts Pool */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] uppercase tracking-widest font-black text-sky-400">
                    Overdue Work Items ({overdueTasks.length})
                  </h4>
                  {dismissedTaskAlarms.length > 0 && (
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
                onClick={() => handleDismissTask(activeAlarm.taskId)}
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
