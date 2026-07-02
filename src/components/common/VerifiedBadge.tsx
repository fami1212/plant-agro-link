import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  verified: boolean;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

/**
 * Green check badge shown next to a user's name once their KYC has been
 * approved by an admin. Use everywhere a user is displayed (profile,
 * listings, offers, conversations) so buyers/investors know who is trusted.
 */
export function VerifiedBadge({ verified, className, showLabel = false, size = "sm" }: VerifiedBadgeProps) {
  if (!verified) return null;
  const s = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <span
      title="Compte vérifié"
      className={cn(
        "inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium",
        className,
      )}
    >
      <BadgeCheck className={s} />
      {showLabel && <span className="text-xs">Vérifié</span>}
    </span>
  );
}