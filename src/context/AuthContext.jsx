"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

const AuthContext = createContext({
  currentUser: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = () => {};

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        
        // Listen to Firestore profile document updates in real-time
        unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
            setLoading(false);
          } else {
            console.warn("No Firestore profile document was found for this user. Provisioning one...");
            
            let defaultRole = "admin";
            if (typeof window !== "undefined") {
              const path = window.location.pathname;
              if (path.includes("/login/manager")) defaultRole = "manager";
              else if (path.includes("/login/team")) defaultRole = "team";
            }

            const defaultName = user.email.split("@")[0]
              .replace(/[^a-zA-Z]/g, " ")
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            const newProfile = {
              name: defaultName || "User",
              email: user.email,
              role: defaultRole,
              phone: "",
              employmentType: "Full-Time",
              paymentModel: defaultRole === "admin" ? "Salary" : "Hourly",
              rate: 0,
              assignedClients: [],
              assignedProjects: [],
              status: "active",
              createdAt: new Date().toISOString()
            };

            try {
              await setDoc(userDocRef, newProfile);
              setRole(defaultRole);
            } catch (err) {
              console.error("Failed to auto-provision profile:", err);
              setRole(null);
            }
            setLoading(false);
          }
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setRole(null);
          setLoading(false);
        });
      } else {
        setCurrentUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      unsubProfile();
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Signout failed:", error);
    } finally {
      setCurrentUser(null);
      setRole(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
