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

        // PRE-CALCULATE VALIDITY COUNTS (Critical for Ratio Scoring)
        // We need to know: How many shifts *could* Aysun possibly take?
        // This allows us to calculate "Scarcity": (Need 4 / Valid 5) = 0.8 Criticality
        const validShiftCounts = new Map<string, number>();
        staff.forEach(p => {
            let validCount = 0;
            shiftsToFill.forEach(s => {
                // Check static rules only (Skill, Weekend, etc. but NOT dynamic ones like Consecutive)
                // Actually, checking all constraints is safer.
                // We simulate "Is this person valid for this shift IF it was the only shift?"
                const res = this.validateAssignment(s, p, [], true); // Relaxed? No?
                // Let's use strict validation but with empty schedule.
                // NOTE: Use relaxed=true to skip quota checks (circular dependency), 
                // but strict for Skills/Availability.
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
            // (Assumes `currentCounts` is total, we need specific counts)
            // Re-calculating counts inside loop is expensive (O(N*M)).
            // Better to pre-calculate map of { id: { total: x, nobet: y } }.

            // Optimization: Since we already computed `currentCounts` (Total), we can't trust it for Quota.
            // Let's just do a quick filter here for the person.
            // Actually, let's optimize the pre-calculation outside.
            // But for now, let's rely on `currentCounts` being inaccurate and fix it?
            // No, easier to just check currentSchedule for this person.
            let nobetCount = 0;
            currentSchedule.forEach(s => {
                if (s.assignedToId === person.id && s.type !== 'day') nobetCount++;
            });

            const count = nobetCount; // Use Nöbet count for Quota logic
            // const totalCount = currentCounts.get(person.id) || 0; // Unused for now

            const target = person.exactShifts !== undefined ? person.exactShifts : person.minShifts;

            // 1. QUOTA URGENCY (CRITICALITY RATIO)
            // Replaces "Flat Boost" with "Smart Boost".
            if (target !== undefined) {
                const remainingNeeded = target - count;
                if (remainingNeeded > 0) {
                    if (shift.type !== 'day') {
                        // Criticality = Need / Potential
                        // Potential = Total Valid - Allocated? 
                        // Approx: Total Valid (static).
                        const totalValid = validShiftCounts?.get(person.id) || 1;
                        // Ratio: If Need 4, Potential 5 -> 0.8.
                        // If Need 5, Potential 20 -> 0.25.
                        const criticality = remainingNeeded / Math.max(1, totalValid);

                        // Boost Factor: 100 Million * Criticality.
                        // Aysun (0.8) -> 80M.
                        // Ferhat (0.25) -> 25M.
                        score += (criticality * 100000000);

                        // Flat boost ensures they still beat "No Quota" people.
                        score += 50000000;
                    } else {
                        // Mesai Check: Still avoid wasting availability
                        score -= 50000;
                    }
                }
            }

            // 2. PREFERENCE (Medium Priority)
            if (equalityConfig?.ignoredPersonIds?.includes(person.id)) {
                score -= 100000;
            } else if (equalityConfig?.preferredPersonIds?.includes(person.id)) {
                score += 2000;
            }

            // 3. DISTRIBUTION (Quadratic Fair Penalty)
            // Punish high counts severely to force equality.
            // Use TOTAL count here (including Mesai) for overall workload fairness?
            // Or just Nöbet fairness? Usually Nöbet fairness is what matters.
            // Let's use Nöbet Count for fairness to ensure Nöbet equality.
            score -= (count * count * 100);

            // 3.5 MAX LIMIT AVERSION (Soft Cap)
            // If someone is close to their MAX (e.g. 1 away), we should try to avoid them if possible,
            // to leave room for emergency fills or manual adjustments later.
            if (person.maxShifts !== undefined && count >= person.maxShifts - 1) {
                // They are 1 shift away from Max.
                // Penalize them heavily so Büşra/Şenol (who have room) get picked instead.
                score -= 10000000; // HUGE penalty to force rotation (Unless quota urgency overrides)
                // But Quota Urgency is +50-100M. So Quota wins.
                // If Quota met (remaining <= 0), this penalty prevents exceeding Max. perfect.
            }

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

            // 5. NOISE
            // Keep it small to let Ratio decide.
            if (score < 1000000) {
                score += Math.floor(Math.random() * 50);
            }

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
