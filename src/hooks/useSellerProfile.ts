import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SellerProfile {
  full_name: string;
  phone?: string;
  location?: string;
}

export function useSellerProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, address")
        .eq("user_id", userId)
        .maybeSingle();

      setProfile(data ? {
        full_name: data.full_name || "Vendeur",
        phone: data.phone || undefined,
        location: data.address || undefined,
      } : null);
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  return { profile, loading };
}
