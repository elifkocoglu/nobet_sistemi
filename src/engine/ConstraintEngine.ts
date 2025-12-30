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

        // SORTING LOGIC: Advanced Spacing & Fairness Heuristic
        // 1. Spacing: Prioritize people who haven't worked in a while.
        // 2. Fairness: Quadratic penalty for high shift counts.
        // 3. Quota: Dynamic urgency.

        const scoredStaff = staff.map(person => {
            let score = 10000; // High Base Score

            const count = currentCounts.get(person.id) || 0;
            const target = person.exactShifts !== undefined ? person.exactShifts : person.minShifts;

            // 1. QUOTA URGENCY (Highest Priority)
            if (target !== undefined) {
                const remainingNeeded = target - count;
                if (remainingNeeded > 0) {
                    // Urgency: Boost heavily if they need shifts.
                    score += 50000;
                    score += remainingNeeded * 5000;
                }
            }

            // 2. PREFERENCE (Medium Priority)
            if (equalityConfig?.ignoredPersonIds?.includes(person.id)) {
                score -= 100000; // Do not pick unless absolutely necessary
            } else if (equalityConfig?.preferredPersonIds?.includes(person.id)) {
                score += 2000;
            }

            // 3. DISTRIBUTION (Quadratic Fair Penalty)
            // Punish high counts severely to force equality.
            score -= (count * count * 100);

            // 4. SPACING (Gap Bonus)
            // Ideally we want to pick people who haven't worked in x days.
            // Since we generate sequentially, we can look backwards in the schedule.
            let shiftsAgo = 20; // Default buffer
            for (let i = currentSchedule.length - 1; i >= 0; i--) {
                if (currentSchedule[i].assignedToId === person.id) {
                    shiftsAgo = currentSchedule.length - i;
                    break;
                }
            }
            // Boost if they haven't worked recently.
            score += Math.min(shiftsAgo, 20) * 100;

            // 5. RANDOM NOISE (Break Determinism)
            score += Math.floor(Math.random() * 200);

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
