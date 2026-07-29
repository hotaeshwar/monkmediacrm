import React from "react";
import LoginForm from "@/components/LoginForm";

export const metadata = {
  title: "Client Login - Monk Media CRM",
  description: "Secure login portal for Monk Media Clients.",
};

export default function ClientLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <LoginForm portalRole="client" portalName="Client Portal" />
    </div>
  );
}
