import React from "react";
import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Admin Login - Monk Media CRM",
  description: "Secure login portal for Monk Media Administrators.",
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <LoginForm portalRole="admin" portalName="Admin Portal" />
    </div>
  );
}
