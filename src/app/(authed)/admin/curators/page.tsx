"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Applicant = {
  user_id: string;
  display_name: string | null;
  curator_status: string;
  curator_bio: string | null;
  curator_specialties: string[];
  public_handle: string | null;
};

export default function AdminCuratorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      router.push("/app");
      return;
    }

    setIsAdmin(true);
    await loadApplicants();
    setLoading(false);
  }

  async function loadApplicants() {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, curator_status, curator_bio, curator_specialties, public_handle")
      .eq("curator_status", "applied")
      .order("user_id", { ascending: false });

    if (data) {
      setApplicants(data as Applicant[]);
    }
  }

  async function handleApprove(userId: string, tier: string = "contributor") {
    setProcessing(userId);
    const { error } = await supabase
      .from("profiles")
      .update({
        role: "curator",
        curator_status: "approved",
        curator_tier: tier,
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Error approving:", error);
    } else {
      await loadApplicants();
    }
    setProcessing(null);
  }

  async function handleReject(userId: string) {
    setProcessing(userId);
    const { error } = await supabase
      .from("profiles")
      .update({
        curator_status: "rejected",
      })
      .eq("user_id", userId);

    if (error) {
      console.error("Error rejecting:", error);
    } else {
      await loadApplicants();
    }
    setProcessing(null);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-50">Curator Applications</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Review and approve curator applications.
        </p>
      </div>

      {applicants.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
          <p className="text-sm text-neutral-400">No pending applications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applicants.map((applicant) => (
            <div
              key={applicant.user_id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-neutral-50 mb-2">
                  {applicant.display_name || "Anonymous"}
                </h3>
                {applicant.public_handle && (
                  <p className="text-sm text-neutral-400 mb-2">
                    Handle: @{applicant.public_handle}
                  </p>
                )}
                {applicant.curator_bio && (
                  <p className="text-sm text-neutral-300 mb-3">{applicant.curator_bio}</p>
                )}
                {applicant.curator_specialties && applicant.curator_specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {applicant.curator_specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="inline-block rounded px-2 py-0.5 text-xs font-medium text-neutral-300 bg-neutral-800/50"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(applicant.user_id, "contributor")}
                    disabled={processing === applicant.user_id}
                    className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {processing === applicant.user_id ? "Processing..." : "Approve (Contributor)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(applicant.user_id, "editor")}
                    disabled={processing === applicant.user_id}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    Approve (Editor)
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(applicant.user_id, "verified_stylist")}
                    disabled={processing === applicant.user_id}
                    className="flex-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                  >
                    Approve (Stylist)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(applicant.user_id, "verified_astrologer")}
                    disabled={processing === applicant.user_id}
                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Approve (Astrologer)
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => handleReject(applicant.user_id)}
                  disabled={processing === applicant.user_id}
                  className="flex-1 rounded-xl border border-red-700 bg-transparent px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950/20 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(applicant.user_id)}
                  disabled={processing === applicant.user_id}
                  className="rounded-xl border border-red-700 bg-transparent px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950/20 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

