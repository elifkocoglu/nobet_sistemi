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

            // 1. QUOTA URGENCY (CRITICALITY RATIO + FILL RATE)
            if (target !== undefined && target > 0) { // Ensure target > 0 to avoid div by zero
                const remainingNeeded = target - count;
                if (remainingNeeded > 0) {
                    if (shift.type !== 'day') {
                        // A. Criticality = Need / Potential
                        const totalValid = validShiftCounts?.get(person.id) || 1;
                        const criticality = remainingNeeded / Math.max(1, totalValid);

                        // B. Fill Rate Inversion = (1 - (Current / Target))
                        // 0/4 = 1.0 (Highest Priority)
                        // 3/4 = 0.25 (Lower Priority)
                        const emptiness = 1 - (count / target);

                        // Combined Boost
                        // Criticality is dominant (Availability constraints).
                        // Emptiness helps smooth the path (Nobody stays at 0).

                        score += (criticality * 100000000);
                        score += (emptiness * 50000000);

                        // Flat boost ensures they still beat "No Quota/Met Quota" people.
                        score += 50000000;
                    } else {
                        score -= 50000;
                    }
                }
            }

            // 2. GLOBAL BALANCE (Leftover Handling)
            // If Quotas are met (or undefined), we want to pull low-count people up.
            // Büşra (10) vs Fatih (3).
            // This only effectively applies if they are not in the "Quota Urgency" bracket above.
            // (Or if Fairness Penalty isn't enough).
            // Score += (TargetAverage - Count) * 2000
            // but we don't know average easily.
            // Just use inverse count.
            score -= (count * 2000); // Linear penalty on top of quadratic, discourages leading the pack.

            // 3. PREFERENCE (Medium Priority)
            if (equalityConfig?.ignoredPersonIds?.includes(person.id)) {
                score -= 100000;
            } else if (equalityConfig?.preferredPersonIds?.includes(person.id)) {
                score += 2000;
            }

            // 4. DISTRIBUTION (Quadratic Fair Penalty)
            // Punish high counts severely to force equality.
            // Increased to 500 to stop hoarding (e.g. Büşra 11 shifts).
            // 11^2 * 500 = 60,500 penalty. (Score base 1000). Highly impactful.
            score -= (count * count * 1000);

            // 4.5 MAX LIMIT AVERSION (Soft Cap)
            if (person.maxShifts !== undefined && count >= person.maxShifts) {
                // Already AT Max (or above).
                // Penalize EXTREMELY (-100M) to avoid exceeding unless desperate.
                // This acts as a "Hard Constraint" that can be broken if no other option exists.
                score -= 100000000;
            } else if (person.maxShifts !== undefined && count >= person.maxShifts - 1) {
                // They are 1 shift away from Max.
                // Penalize heavily (-10k) so others get picked first.
                score -= 10000;
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
