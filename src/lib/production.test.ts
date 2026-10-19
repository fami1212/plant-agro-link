import { describe, expect, it } from 'vitest';
import { budgetTotals, yieldPerHectare } from './production';

describe('Production par parcelle', () => {
  it('calcule le rendement en kilogrammes par hectare', () => {
    expect(yieldPerHectare(1200, 2)).toBe(600);
  });
  it('ne calcule pas de rendement pour une surface nulle', () => {
    expect(yieldPerHectare(1200, 0)).toBeNull();
  });
  it('compare les dépenses réelles au budget de production', () => {
    expect(budgetTotals([{ planned_amount: 50000, actual_amount: 60000 }, { planned_amount: 30000, actual_amount: 10000 }]))
      .toEqual({ planned: 80000, actual: 70000, remaining: 10000 });
  });
});