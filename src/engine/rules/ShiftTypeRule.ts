import type { IRule, IRuleResult, IShift, IPerson } from '../types';

export class ShiftTypeRule implements IRule {
    id = 'shift-type';
    name = 'Shift Type Preference';
    description = 'Enforces shift type preferences (Mesai vs 24h).';

    private mesaiPersonIds: Set<string>;

    constructor(mesaiPersonIds: string[] = []) {
        this.mesaiPersonIds = new Set(mesaiPersonIds);
    }

    validate(shift: IShift, person: IPerson): IRuleResult {
        // If person is in the "Mesai" list
        if (this.mesaiPersonIds.has(person.id)) {
            // Cannot work Night or 24h shifts
            if (shift.type === 'night' || shift.type === '24h') {
                return {
                    isValid: false,
                    reason: `${person.name} is a Mesai worker and cannot work ${shift.type} shifts.`
                };
            }
        }
        return { isValid: true };
    }
}
