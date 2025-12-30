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
        const TIMEOUT_MS = 15000; // Increased to 15s for complex constraints

        // SORT SHIFTS: Date First, then Priority (Nöbet > Mesai)
        // CRITICAL FIX: We generally want Nöbet filled first, BUT strict separation (All Nöbet then All Mesai)
        // causes "Backtracking Hell" (~10^50 steps) if a late Mesai conflicts with an early Nöbet via Transition Rule.
        // We MUST sort primarily by DATE to keep dependency distance short.
        shiftsToFill.sort((a, b) => {
            // 1. Date Ascending
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateA - dateB;

            // 2. Priority: Nöbet (24h) First within the same day
            // logic: fill the hard jar (24h) first, then pour sand (mesai) around it.
            const aIsNobet = a.type !== 'day';
            const bIsNobet = b.type !== 'day';
            if (aIsNobet && !bIsNobet) return -1;
            if (!aIsNobet && bIsNobet) return 1;

            return 0;
        });

        // PRE-CALCULATE VALIDITY COUNTS (Critical for Ratio Scoring)
        // We need to know: How many *Nöbet* shifts *could* Aysun possibly take?
        const validShiftCounts = new Map<string, number>();
        staff.forEach(p => {
            let validCount = 0;
            shiftsToFill.forEach(s => {
                // ONLY COUNT NÖBET OPPORTUNITIES FOR SCARCITY
                // Mesai availability shouldn't dilute Nöbet urgency.
                if (s.type === 'day') return;

                const res = this.validateAssignment(s, p, [], true);
                if (res.isValid) validCount++;
            });
            validShiftCounts.set(p.id, validCount);
        });

        const schedule: IShift[] = [];
        const result = this.backtrack(shiftsToFill, 0, schedule, staff, relaxConstraints, startTime, TIMEOUT_MS, equalityConfig, validShiftCounts);

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
        equalityConfig?: import('./types').IEqualityConfig,
        validShiftCounts?: Map<string, number>
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

        // SORTING LOGIC: Criticality Ratio & Fairness
        const scoredStaff = staff.map(person => {
            let score = 1000; // Base Score

            // Count only NON-DAY shifts for Quota Purposes

            // Calculate Nöbet Count
            let nobetCount = 0;
            currentSchedule.forEach(s => {
                if (s.assignedToId === person.id && s.type !== 'day') nobetCount++;
            });

            const count = nobetCount;
            const target = person.exactShifts !== undefined ? person.exactShifts : person.minShifts;
            const max = person.maxShifts;

            // 1. COMPLETION RATIO (The most important factor for Balance)
            // Goal: Prioritize those who are furthest from their target (percentage-wise).
            // Aysun (Target 4, Has 0) -> 0% -> Priority HIGH
            // Fatih (Target 10, Has 2) -> 20% -> Priority MEDIUM
            // Büşra (Target 10, Has 9) -> 90% -> Priority LOW

            let completionRatio = 0;
            if (target && target > 0) {
                completionRatio = count / target;
            } else if (max && max > 0) {
                // If no min/exact, use max as a soft target reference
                completionRatio = count / max;
            } else {
                // No limits? Assume target is average (~7)
                completionRatio = count / 7;
            }

            // Score Formula: (1 - Ratio) * 1,000,000
            // 0% -> 1,000,000
            // 50% -> 500,000
            // 100% -> 0
            if (completionRatio < 1) {
                score += (1 - completionRatio) * 1000000;
            } else {
                // Already met target. Drop priority significantly.
                score -= completionRatio * 100000;
            }

            // 2. SCARCITY BOOST (Criticality)
            // If this shift is one of the FEW valid ones for this person, boost them.
            if (shift.type !== 'day') {
                const totalValid = validShiftCounts?.get(person.id) || 1;
                const remainingNeeded = (target || 0) - count;

                if (remainingNeeded > 0) {
                    // Criticality = Need / Potential
                    // If Need 4, Potential 4 -> 1.0 (Critical!) -> Boost +500,000
                    const criticality = remainingNeeded / Math.max(1, totalValid);
                    score += criticality * 500000;
                }
            } else {
                // Mesai penalty
                score -= 10000;
            }

            // 3. PREFERENCE
            if (equalityConfig?.ignoredPersonIds?.includes(person.id)) score -= 200000;
            if (equalityConfig?.preferredPersonIds?.includes(person.id)) score += 5000;

            // 4. MAX LIMIT HARD CAP AVOIDANCE
            if (max !== undefined) {
                if (count >= max) score -= 100000000; // Hard Stop (-100M)
                else if (count >= max - 1) score -= 50000; // Warning
            }

            // 5. SPACING (Gap Bonus)
            let shiftsAgo = 30;
            for (let i = currentSchedule.length - 1; i >= 0; i--) {
                if (currentSchedule[i].assignedToId === person.id) {
                    shiftsAgo = currentSchedule.length - i;
                    break;
                }
            }
            score += Math.min(shiftsAgo, 30) * 1000; // Max +30,000

            // 6. NOISE (Randomness for equal scores)
            score += Math.floor(Math.random() * 500);

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
                if (this.backtrack(shifts, index + 1, currentSchedule, staff, relaxConstraints, startTime, timeoutMs, equalityConfig, validShiftCounts)) {
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
