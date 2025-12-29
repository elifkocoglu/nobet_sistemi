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
        _onProgress?: (count: number) => void
    ): IShift[] {
        // Simple Backtracking Algorithm
        // Sort shifts by date/type/difficulty if needed to improve pruning
        // For now, linear

        const startTime = Date.now();
        const TIMEOUT_MS = 3000;

        const schedule: IShift[] = [];
        const result = this.backtrack(shiftsToFill, 0, schedule, staff, relaxConstraints, startTime, TIMEOUT_MS);

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
        timeoutMs: number
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
        // randomize staff order to get different results?
        const shuffledStaff = [...staff].sort(() => 0.5 - Math.random());

        for (const person of shuffledStaff) {
            // Validate
            const validation = this.validateAssignment(shift, person, currentSchedule, relaxConstraints);
            if (validation.isValid) {
                // Assign
                shift.assignedToId = person.id;
                currentSchedule.push(shift);

                // Recurse
                if (this.backtrack(shifts, index + 1, currentSchedule, staff, relaxConstraints, startTime, timeoutMs)) {
                    return true;
                }

                // Backtrack
                shift.assignedToId = undefined;
                currentSchedule.pop();
            } else {
                // console.log(`Failed to assign ${person.name} to ${shift.date}: ${validation.reason}`);
            }
        }

        return false; // No valid person found for this shift
    }
}
