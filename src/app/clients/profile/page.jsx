"use client";

import React, { Suspense } from "react";
import ClientProfile from "./ClientProfile";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    }>
      <ClientProfile />
    </Suspense>
  );
}
