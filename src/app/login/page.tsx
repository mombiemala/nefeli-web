"use client";

import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-800 border-t-neutral-300" />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
