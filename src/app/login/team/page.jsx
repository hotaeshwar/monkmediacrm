import React from "react";
import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Team Login - Monk Media CRM",
  description: "Secure login portal for Monk Media Team Members and Contractors.",
};

export default function TeamLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <LoginForm portalRole="team" portalName="Team Portal" />
    </div>
  );
}
