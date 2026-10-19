export function yieldPerHectare(quantityKg: number, hectares: number): number | null {
  return hectares > 0 ? quantityKg / hectares : null;
}

export function budgetTotals(rows: { planned_amount: number; actual_amount: number }[]) {
  const planned = rows.reduce((sum, row) => sum + Number(row.planned_amount), 0);
  const actual = rows.reduce((sum, row) => sum + Number(row.actual_amount), 0);
  return { planned, actual, remaining: planned - actual };
}