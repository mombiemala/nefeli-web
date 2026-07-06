"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Spinner } from "@/components/ui/primitives";

function Inner() {
  const params = useSearchParams();
  const prompt = params.get("prompt") ?? undefined;
  return <ChatInterface initialPrompt={prompt} />;
}

export function ChatClient() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner /></div>}>
      <Inner />
    </Suspense>
  );
}
