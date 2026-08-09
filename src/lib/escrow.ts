/** Logique escrow pure (testable) partagée par la timeline et l'admin. */

export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export interface Milestone {
  id: string;
  order_index: number;
  status: MilestoneStatus;
  amount_percent: number;
  validator_role: string;
}

/** Pourcentage des fonds effectivement débloqués. */
export function releasedPercent(milestones: Milestone[]): number {
  const total = milestones.reduce((s, m) => s + (m.amount_percent || 0), 0);
  if (!total) return 0;
  const done = milestones
    .filter((m) => m.status === "COMPLETED")
    .reduce((s, m) => s + (m.amount_percent || 0), 0);
  return Math.round((100 * done) / total);
}

/** Prochaine étape actionnable (la première non terminée dans l'ordre). */
export function nextMilestone(milestones: Milestone[]): Milestone | null {
  return (
    [...milestones]
      .sort((a, b) => a.order_index - b.order_index)
      .find((m) => m.status !== "COMPLETED" && m.status !== "SKIPPED") ?? null
  );
}

export type EscrowRole = "buyer" | "seller" | "admin";

/** Une étape n'est validable que si elle est la prochaine ET que le rôle correspond. */
export function canValidate(
  milestones: Milestone[],
  milestoneId: string,
  role: EscrowRole,
  opts: { online?: boolean; disputed?: boolean } = {},
): boolean {
  if (opts.online === false) return false;
  if (opts.disputed) return false;
  const next = nextMilestone(milestones);
  if (!next || next.id !== milestoneId) return false;
  if (role === "admin") return true;
  return next.validator_role === role;
}
