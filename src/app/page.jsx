import React from "react";
import Link from "next/link";
import { Lock, Sparkles, UserCheck, ShieldCheck, Users } from "lucide-react";

export const metadata = {
  title: "Monk Media CRM - Workspace Access",
  description: "Access portals for Monk Media CRM platform.",
};

export default function EntryPage() {
  const portals = [
    {
      name: "Administrator Portal",
      desc: "Full management access, user creation, agency billing and dashboard tools.",
      href: "/login/admin",
      color: "bg-sky-500",
      icon: ShieldCheck,
    },
    {
      name: "Account Manager Portal",
      desc: "Scoped manager access to oversee clients, projects, tasks, and client billing details.",
      href: "/login/manager",
      color: "bg-sky-400",
      icon: UserCheck,
    },
    {
      name: "Team Member Portal",
      desc: "Scoped contractor/employee access to view assigned client projects, tasks, and calendar events.",
      href: "/login/team",
      color: "bg-sky-300",
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 sm:p-12">
      <div className="w-full max-w-3xl text-center space-y-6">
        
        {/* Branding */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-sky-50 text-sky-500 mb-2 border border-sky-100 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold text-sky-600 tracking-tight sm:text-5xl">
            Monk Media CRM
          </h1>
          <p className="text-sky-400 text-sm max-w-md mx-auto">
            Secure, role-based CRM access for Monk Media marketing, production, and accounting teams.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          {portals.map((portal) => (
            <Link
              key={portal.name}
              href={portal.href}
              className="p-6 bg-white border border-sky-100 hover:border-sky-300 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group"
            >
              <div className={`w-12 h-12 rounded-2xl ${portal.color} text-white flex items-center justify-center mb-4 shadow group-hover:scale-110 transition-all duration-300`}>
                <portal.icon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-sky-600 mb-2">{portal.name}</h3>
              <p className="text-xs text-sky-400 leading-relaxed flex-1">{portal.desc}</p>
              <span className="mt-4 text-xs font-semibold text-sky-500 group-hover:text-sky-600 underline underline-offset-4 decoration-sky-300">
                Enter Portal →
              </span>
            </Link>
          ))}
        </div>

        {/* Setup Link */}
        <div className="pt-8 border-t border-sky-50 flex flex-col items-center gap-2">
          <p className="text-xs text-sky-400">First time setting up the CRM workspace?</p>
          <Link
            href="/setup"
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-2xl border border-sky-100 text-xs font-bold transition-all duration-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Initialize Admin System
          </Link>
        </div>

      </div>
    </div>
  );
}
