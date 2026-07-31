"use client";

import React, { Suspense } from "react";
import Loader from "@/components/Loader";
import ClientProfile from "./ClientProfile";

export default function Page() {
  return (
    <Suspense fallback={<Loader fullPage />}>
      <ClientProfile />
    </Suspense>
  );
}
