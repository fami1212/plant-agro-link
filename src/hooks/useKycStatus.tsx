import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type KycStatus = "pending" | "submitted" | "approved" | "rejected";

export interface KycRecord {
  id: string;
  status: KycStatus;
  admin_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

/**
 * Returns the current user's KYC record and whether they may perform
 * restricted actions (create listings, invest, order, publish reviews...).
 * Admins are always considered approved.
 */
export function useKycStatus() {
  const { user, hasRole } = useAuth();
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setKyc(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("kyc_verifications")
      .select("id, status, admin_notes, submitted_at, reviewed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setKyc((data as KycRecord) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`kyc-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kyc_verifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const isApproved = hasRole("admin") || kyc?.status === "approved";

  return { kyc, loading, isApproved, refresh };
}
