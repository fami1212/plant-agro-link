import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SellerRatingProps {
  sellerId: string;
  showCount?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function SellerRating({
  sellerId,
  showCount = true,
  size = "sm",
  className,
}: SellerRatingProps) {
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    fetchRating();
  }, [sellerId]);

  const fetchRating = async () => {
    const { data, error } = await supabase
      .from("marketplace_reviews")
      .select("rating")
      .eq("target_type", "seller")
      .eq("target_id", sellerId);

    if (!error && data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setAvgRating(Math.round(avg * 10) / 10);
      setReviewCount(data.length);
    }
  };

  if (avgRating === null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Nouveau vendeur
      </span>
    );
  }

  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Star className={cn(iconSize, "fill-yellow-400 text-yellow-400")} />
      <span className={cn(textSize, "font-medium")}>{avgRating}</span>
      {showCount && (
        <span className={cn(textSize, "text-muted-foreground")}>
          ({reviewCount})
        </span>
      )}
    </div>
  );
}
