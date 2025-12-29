import type { IRule, IRuleResult, IShift, IPerson } from '../types';
import { parseISO, isWeekend } from 'date-fns';

export class WeekendExclusionRule implements IRule {
    id = 'weekend-exclusion';
    name = 'Weekend Exclusion';
    description = 'Specific staff are exempt from weekend shifts.';

    private excludedPersonIds: Set<string>;

    constructor(excludedPersonIds: string[]) {
        this.excludedPersonIds = new Set(excludedPersonIds);
    }

    validate(shift: IShift, person: IPerson): IRuleResult {
        const shiftDate = parseISO(shift.date);

        if (isWeekend(shiftDate)) {
            if (this.excludedPersonIds.has(person.id)) {
                return {
                    isValid: false,
                    reason: `${person.name} is exempt from weekend shifts.`
                };
            }
        }

        return { isValid: true };
    }
}
