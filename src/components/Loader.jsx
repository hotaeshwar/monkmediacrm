"use client";

import React from "react";

export default function Loader({ fullPage = false, message = "Loading data..." }) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center">
        <div className="relative flex flex-col items-center justify-center p-8">
          {/* Animated Glowing Ring Wrapper */}
          <div className="relative w-20 h-20">
            {/* Outer Slow Glow Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-sky-100 opacity-60 animate-ping"></div>
            {/* Main Spin Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin"></div>
            {/* Inner Counter-spinning ring */}
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-sky-200 border-b-sky-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
            {/* Center Monk Media Core Dot */}
            <div className="absolute inset-6 bg-gradient-to-tr from-sky-400 to-sky-600 rounded-full shadow-md animate-pulse"></div>
          </div>
          <span className="mt-6 text-xs font-bold text-sky-600 tracking-widest uppercase animate-pulse">
            {message}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 w-full">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-sky-50/50 opacity-40 animate-ping"></div>
        <div className="absolute inset-0 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-sky-200 border-b-sky-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
      </div>
      {message && (
        <span className="mt-4 text-[10px] font-bold text-sky-400 tracking-wider uppercase animate-pulse">
          {message}
        </span>
      )}
    </div>
  );
}
