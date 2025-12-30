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
        // We SKIP strict max checks to ensure completion.
        // The Scoring Engine creates a "Soft Cap" via massive penalties, 
        // so we can safely return Valid here to allow fallback.
        if (_isRelaxed) {
            return { isValid: true };
        }


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
