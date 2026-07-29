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
        <div className="space-y-2 flex flex-col items-center">
          <div className="mb-4 transform scale-110 hover:scale-115 transition duration-300">
            <img src="/logonew.png" alt="Monk Media Logo" className="h-36 w-auto object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold text-sky-600 tracking-tight sm:text-5xl">
            Monk Media CRM
          </h1>
          <p className="text-sky-400 text-sm max-w-md mx-auto">
            Secure, role-based CRM access for Monk Media marketing, production, and accounting teams.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
          {portals.map((portal) => {
            let glowGradient = "from-sky-400/20 to-indigo-500/20 group-hover:from-sky-500/40 group-hover:to-indigo-600/40";
            if (portal.name.includes("Administrator")) {
              glowGradient = "from-blue-400/25 to-indigo-500/25 group-hover:from-blue-500/45 group-hover:to-indigo-600/45";
            } else if (portal.name.includes("Account Manager")) {
              glowGradient = "from-sky-400/25 to-cyan-400/25 group-hover:from-sky-500/45 group-hover:to-cyan-500/45";
            } else if (portal.name.includes("Team Member")) {
              glowGradient = "from-sky-300/25 to-emerald-400/25 group-hover:from-sky-400/45 group-hover:to-emerald-500/45";
            }

            return (
              <div key={portal.name} className="relative group flex flex-col">
                {/* Backside Glow Layer */}
                <div className={`absolute -inset-0.5 bg-gradient-to-br ${glowGradient} rounded-[32px] blur-xl opacity-60 group-hover:opacity-100 transition-all duration-500 group-hover:duration-200`} />
                
                {/* Portal Link Card */}
                <Link
                  href={portal.href}
                  className="relative p-6 bg-white border border-sky-100/80 hover:border-sky-300 rounded-[32px] shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center group flex-1"
                >
                  <div className={`w-12 h-12 rounded-2xl ${portal.color} text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-all duration-300`}>
                    <portal.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-sky-600 mb-2">{portal.name}</h3>
                  <p className="text-xs text-sky-400 leading-relaxed flex-1">{portal.desc}</p>
                  <span className="mt-4 text-xs font-semibold text-sky-500 group-hover:text-sky-600 underline underline-offset-4 decoration-sky-300">
                    Enter Portal →
                  </span>
                </Link>
              </div>
            );
          })}
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
