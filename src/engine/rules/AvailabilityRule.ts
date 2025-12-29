import type { IRule, IRuleResult, IShift, IPerson } from '../types';

export class AvailabilityRule implements IRule {
    id = 'availability';
    name = 'Person Availability';
    description = 'Checks if the person is marked as unavailable for the specific date.';

    validate(shift: IShift, person: IPerson): IRuleResult {
        if (person.availability.unavailableDates.includes(shift.date)) {
            return {
                isValid: false,
                reason: `${person.name} is marked as unavailable on ${shift.date}`
            };
        }
        return { isValid: true };
    }
}
