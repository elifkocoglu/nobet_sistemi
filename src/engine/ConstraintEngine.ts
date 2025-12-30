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

        // SORTING LOGIC: Score-Based Heuristic
        // Instead of rigid nested checks, we assign a "Fitness Score" to each person.
        // Higher score = Assigned first.
        // Random noise is added to prevent deterministic loops.

        const scoredStaff = staff.map(person => {
            let score = 1000; // Base Score

            const count = currentCounts.get(person.id) || 0;
            const target = person.exactShifts !== undefined ? person.exactShifts : person.minShifts;

            // 1. Critical Priority: Below Target Quota
            if (target !== undefined && count < target) {
                score += 5000;
                // Add extra weight for "Urgency" (distance to target)
                score += (target - count) * 100;
            }

            // 2. Preference (Soft Priority)
            // Only boost if not ignored
            const isIgnored = equalityConfig?.ignoredPersonIds?.includes(person.id);
            if (isIgnored) {
                score -= 2000; // Heavy penalty
            } else {
                const isPreferred = equalityConfig?.preferredPersonIds?.includes(person.id);
                if (isPreferred) {
                    // Capped Preference Logic:
                    // If they are WAY ahead of others (e.g. +3 shifts), stop boosting.
                    // This is handled partly by the 'Count Penalty' below, but let's be explicit.
                    // Actually, let's just add a flat boost and let the Count Penalty balance it naturally?
                    // "Preferred" means "I want them to work more".
                    score += 500;
                }
            }

            // 3. Equality / Distribution (Negative Feedback)
            // The more you have, the lower your score.
            // Penalty factor: 50 points per shift.
            score -= (count * 50);

            // 4. Random Noise (Breaking Deadlocks)
            // Add slight randomness (+/- 25) so two people with identical stats swap places occasionally.
            // This is CRITICAL for backtracking to find different paths on retries.
            score += Math.floor(Math.random() * 50);

            return { person, score };
        });

        // Sort by Score Descending
        scoredStaff.sort((a, b) => b.score - a.score);

        const shuffledStaff = scoredStaff.map(s => s.person);


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
