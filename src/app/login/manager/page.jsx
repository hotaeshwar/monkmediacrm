import React from "react";
import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Manager Login - Monk Media CRM",
  description: "Secure login portal for Monk Media Account Managers.",
};

export default function ManagerLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <LoginForm portalRole="manager" portalName="Account Manager Portal" />
    </div>
  );
}
