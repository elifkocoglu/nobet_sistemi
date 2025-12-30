import type { IPerson, IShift, IRule, IRuleResult } from './types';

export class ConstraintEngine {
    private rules: IRule[] = [];

    constructor(rules: IRule[]) {
        this.rules = rules;
    }

    public addRule(rule: IRule): void {
        this.rules.push(rule);
    }

    public setRules(rules: IRule[]): void {
        this.rules = rules;
    }

    public validateAssignment(shift: IShift, person: IPerson, currentSchedule: IShift[], relaxConstraints: boolean = false): IRuleResult {
        // Run Pluggable Rules
        for (const rule of this.rules) {
            const result = rule.validate(shift, person, currentSchedule, relaxConstraints);
            if (!result.isValid) {
                return result; // Fail fast on first violation
            }
        }

        return { isValid: true };
    }

    public generate(
        shiftsToFill: IShift[],
        staff: IPerson[],
        relaxConstraints: boolean = false,
        equalityConfig?: import('./types').IEqualityConfig, // NEW
        _onProgress?: (count: number) => void
    ): IShift[] {
        // Simple Backtracking Algorithm
        const startTime = Date.now();
        const TIMEOUT_MS = 3000;

        const schedule: IShift[] = [];
        const result = this.backtrack(shiftsToFill, 0, schedule, staff, relaxConstraints, startTime, TIMEOUT_MS, equalityConfig);

        if (!result) {
            throw new Error("Could not generate a valid schedule. Constraints are too strict.");
        }

        return schedule;
    }

    private backtrack(
        shifts: IShift[],
        index: number,
        currentSchedule: IShift[],
        staff: IPerson[],
        relaxConstraints: boolean,
        startTime: number,
        timeoutMs: number,
        equalityConfig?: import('./types').IEqualityConfig
    ): boolean {
        // Check Timeout
        if (Date.now() - startTime > timeoutMs) {
            throw new Error("TIMEOUT");
        }

        // Base case: All shifts filled
        if (index === shifts.length) {
            return true;
        }

        const shift = shifts[index];
        const currentCounts = new Map<string, number>();
        currentSchedule.forEach(s => {
            if (s.assignedToId) currentCounts.set(s.assignedToId, (currentCounts.get(s.assignedToId) || 0) + 1);
        });

        // SORTING LOGIC START
        const shuffledStaff = [...staff].sort((a, b) => {
            // 1. Preferred People (Give them MORE shifts -> put them FIRST in the list if they have FEWER shifts so far? 
            // Actually, to give them MORE shifts, we want them to be picked even if they have EQUAL OR MORE shifts than others (up to a point).
            // But the basic backtracking greedily picks the first valid person.
            // If we sort by 'Least Shifts First' (Standard), we equalise.
            // If we want 'Preferred People' to get MORE, we should sort them earlier even if they have counts.
            // OR: If equality is disabled, we just sort differently.

            const isAPreferred = equalityConfig?.preferredPersonIds?.includes(a.id);
            const isBPreferred = equalityConfig?.preferredPersonIds?.includes(b.id);
            const isAIgnored = equalityConfig?.ignoredPersonIds?.includes(a.id);
            const isBIgnored = equalityConfig?.ignoredPersonIds?.includes(b.id);

            // Prioritize Preferred
            if (isAPreferred && !isBPreferred) return -1;
            if (!isAPreferred && isBPreferred) return 1;

            // Deprioritize Ignored
            if (isAIgnored && !isBIgnored) return 1;
            if (!isAIgnored && isBIgnored) return -1;

            // Standard Equality Logic
            // If Strict Equality is OFF, maybe just randomise? or still try to balance but loosely?
            // "Sistem diğer kısıtları karşılamak için nöbetleri eşit dağıtmasın" -> Don't sort by count?
            if (equalityConfig && !equalityConfig.applyStrictEquality) {
                return 0.5 - Math.random(); // Pure random if equality is disabled
            }

            // Default: Sort by count (Least shifts first)
            const countA = currentCounts.get(a.id) || 0;
            const countB = currentCounts.get(b.id) || 0;
            if (countA === countB) return 0.5 - Math.random();
            return countA - countB;
        });
        // SORTING LOGIC END

        for (const person of shuffledStaff) {
            // Validate
            const validation = this.validateAssignment(shift, person, currentSchedule, relaxConstraints);
            if (validation.isValid) {
                // Assign
                shift.assignedToId = person.id;
                currentSchedule.push(shift);

                // Recurse
                if (this.backtrack(shifts, index + 1, currentSchedule, staff, relaxConstraints, startTime, timeoutMs, equalityConfig)) {
                    return true;
                }

                // Backtrack
                shift.assignedToId = undefined;
                currentSchedule.pop();
            }
        }

        return false; // No valid person found for this shift
    }
}
