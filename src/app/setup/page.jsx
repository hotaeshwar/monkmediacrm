"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert, Sparkles, UserCheck } from "lucide-react";

export default function SetupPage() {
  const [setupAvailable, setSetupAvailable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/setup");
        const data = await res.json();
        setSetupAvailable(data.setupAvailable);
      } catch (err) {
        console.error("Error checking setup availability:", err);
        setSetupAvailable(false);
      } finally {
        setLoading(false);
      }
    }
    checkSetup();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create Admin account");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && setupAvailable === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="flex flex-col items-center gap-2 text-sky-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          <span className="text-sm font-semibold">Checking system state...</span>
        </div>
      </div>
    );
  }

  if (setupAvailable === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md p-8 border border-sky-100 rounded-3xl shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 mb-3 border border-sky-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-sky-600">Setup Locked</h2>
          <p className="text-sm text-sky-400 mt-2">
            An administrator account already exists. For security reasons, the initial bootstrap setup is disabled.
          </p>
          <button
            onClick={() => router.push("/login/admin")}
            className="w-full mt-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-sm font-semibold transition-all duration-200 shadow-md"
          >
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-md p-8 border border-sky-100 rounded-3xl shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 mb-3 border border-sky-100">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-sky-600">Setup Complete!</h2>
          <p className="text-sm text-sky-400 mt-2">
            The first Admin account was created successfully. You can now log in to access the administrator dashboard.
          </p>
          <button
            onClick={() => router.push("/login/admin")}
            className="w-full mt-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-sm font-semibold transition-all duration-200 shadow-md"
          >
            Log In as Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md p-8 border border-sky-100 rounded-3xl shadow-xl flex flex-col bg-white">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-50 text-sky-500 mb-3 border border-sky-100">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-sky-600">Monk CRM Setup</h2>
          <p className="text-xs text-sky-400 mt-1 uppercase tracking-widest font-bold">
            Create First Admin Account
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50/50 border border-red-100 text-red-500 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
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
              placeholder="admin@monkmedia.com"
              className="w-full px-4 py-3 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-sky-500 mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
                minLength={6}
                className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100 focus:border-sky-300 focus:ring-1 focus:ring-sky-300 rounded-2xl text-sm text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? "Creating..." : "Initialize Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
