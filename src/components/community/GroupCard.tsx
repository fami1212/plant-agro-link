import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description?: string | null;
    group_type: string;
    member_count: number;
    is_public: boolean;
  };
  isMember?: boolean;
  onJoin?: (groupId: string) => void;
  onLeave?: (groupId: string) => void;
  onOpen?: (groupId: string) => void;
}

export function GroupCard({ group, isMember, onJoin, onLeave, onOpen }: GroupCardProps) {
  const { t } = useLanguage();

  const typeLabels: Record<string, string> = {
    cooperative: t("community.groupType.cooperative"),
    region: t("community.groupType.region"),
    culture: t("community.groupType.culture"),
  };

  return (
    <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{group.name}</p>
          <p className="text-xs text-muted-foreground">{typeLabels[group.group_type] || group.group_type} · {group.member_count} {t("community.members")}</p>
        </div>
      </div>
      {group.description && <p className="text-xs text-muted-foreground line-clamp-2">{group.description}</p>}
      <div className="flex gap-2">
        {isMember ? (
          <>
            <Button size="sm" className="flex-1 rounded-xl text-xs" onClick={() => onOpen?.(group.id)}>{t("community.open")}</Button>
            <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => onLeave?.(group.id)}>{t("community.leave")}</Button>
          </>
        ) : (
          <Button size="sm" className="flex-1 rounded-xl text-xs" onClick={() => onJoin?.(group.id)}>{t("community.join")}</Button>
        )}
      </div>
    </div>
  );
}
