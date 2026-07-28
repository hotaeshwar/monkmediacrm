"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function LoginForm({ portalRole, portalName }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch role from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      let userData;

      if (!userDoc.exists()) {
        const defaultName = email.split("@")[0]
          .replace(/[^a-zA-Z]/g, " ")
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        userData = {
          name: defaultName || "User",
          email: email,
          role: portalRole,
          phone: "",
          employmentType: "Full-Time",
          paymentModel: portalRole === "admin" ? "Salary" : "Hourly",
          rate: 0,
          assignedClients: [],
          assignedProjects: [],
          status: "active",
          createdAt: new Date().toISOString()
        };

        await setDoc(userDocRef, userData);
      } else {
        userData = userDoc.data();
      }

      const userRole = userData.role; // 'admin', 'manager', or 'team'

      // 3. Confirm role matches portal
      if (userRole !== portalRole) {
        await signOut(auth);
        setError(`Access Denied: Wrong portal for this account.`);
        setLoading(false);
        return;
      }

      // 4. Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      let errMsg = "Invalid email or password.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        errMsg = "Invalid email or password.";
      } else if (err.code === "auth/too-many-requests") {
        errMsg = "Too many login attempts. Please try again later.";
      } else {
        errMsg = err.message || errMsg;
      }
      setError(errMsg);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-8 bg-white border border-sky-100/80 rounded-[32px] shadow-2xl flex flex-col transition-all duration-300 hover:shadow-sky-100/50">
      <div className="text-center mb-8 flex flex-col items-center justify-center">
        <img src="/logonew.png" alt="Monk Media Logo" className="w-48 h-auto mb-2 object-contain" />
        <p className="text-[10px] text-sky-500 font-black tracking-[0.15em] uppercase">
          {portalName}
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 bg-red-50/50 border border-red-100/55 text-red-500 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-sky-500/80 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@monkmedia.com"
              autoComplete="username"
              className="w-full pl-10 pr-4 py-3 bg-white border border-sky-100/80 focus:border-sky-300 focus:ring-4 focus:ring-sky-50 rounded-2xl text-xs text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-sky-500/80 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-sky-400" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full pl-10 pr-10 py-3 bg-white border border-sky-100/80 focus:border-sky-300 focus:ring-4 focus:ring-sky-50 rounded-2xl text-xs text-sky-600 placeholder-sky-300 outline-none transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 p-0.5 text-sky-400 hover:text-sky-500 rounded-md z-10"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-sky-50 text-center">
        <p className="text-[11px] text-sky-400">
          Trouble logging in? Contact the system administrator.
        </p>
      </div>
    </div>
  );
}
