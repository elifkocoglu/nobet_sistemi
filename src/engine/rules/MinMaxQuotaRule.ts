import type { IRule, IRuleResult, IShift, IPerson } from '../types';

export class MinMaxQuotaRule implements IRule {
    id = 'min-max-quota';
    name = 'Min/Max Shift Quotas';
    description = 'Enforces minimum, maximum, and exact shift counts per person.';

    validate(_shift: IShift, person: IPerson, assignedShifts: IShift[], _isRelaxed?: boolean): IRuleResult {
        // Count existing shifts for this person
        // Count existing shifts for this person
        // NOTE: Quotas apply to "Nöbet" (24h/Night). "Mesai" (Day) shifts should typically NOT count towards quota.
        // User feedback implies they set Min 4 Nöbet, but person had 2 Mesai + 2 Nobet used up quota.
        // Let's filter for NON-DAY shifts.
        const personShifts = assignedShifts.filter(s => s.assignedToId === person.id && s.type !== 'day');
        const currentCount = personShifts.length;

        // If Relaxed Mode is ON:
        // We SKIP strict max/exact checks here during GENERATION to ensure completion.
        // Ideally, we would want a "Soft Score", but for now, "Best Effort" = "Complete the schedule even if quotas broken".
        // However, manual validation shouldn't be relaxed unless specified.
        // If Relaxed Mode is ON:
        // We typically SKIP validation to allow completion.
        // BUT, "Max Shifts" is usually a hard constraint (Budgetary/Fairness).
        // If Hüseyin says Max 6, giving him 10 is a HUGE violation.
        // Let's enforcing MAX strictly even in relaxed mode.
        // Only skip MIN/EXACT checks in relaxed mode?
        // Actually, let's just NOT return valid=true immediately.
        // Let's proceed to checks, but maybe allow soft violations?
        // NO, User wants Max to be respected. Let's make it HARD.

        // if (isRelaxed) { return { isValid: true }; } // REMOVE THIS to enforce strictness

        // However, we might want to relax "Min" or "Fullness" constraints, but MAX determines "Can I take more?".
        // So we proceed to check MAX below.


        // Note: usage of this rule during "generation" vs "manual edit" differs.
        // During generation, we typically check MAX. 
        // MIN and EXACT are harder to enforce greedily, usually checked after or with lookahead.
        // However, for manual validation (the Swap requirement), we check if the RESULTING count is valid.

        // Validation logic for adding ONE MORE shift (current attempt):
        const potentialCount = currentCount + 1;

        if (person.maxShifts !== undefined && person.maxShifts !== null && potentialCount > person.maxShifts) {
            return {
                isValid: false,
                reason: `${person.name} exceeds max quota of ${person.maxShifts}.`
            };
        }

        if (person.exactShifts !== undefined && person.exactShifts !== null && potentialCount > person.exactShifts) {
            return {
                isValid: false,
                reason: `${person.name} exceeds exact quota of ${person.exactShifts}.`
            };
        }

        return { isValid: true };
    }
}
