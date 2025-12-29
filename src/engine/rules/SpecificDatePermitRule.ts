import type { IRule, IRuleResult, IShift, IPerson } from '../types';
import { parseISO, isWithinInterval } from 'date-fns';

export class SpecificDatePermitRule implements IRule {
    id = 'specific-date-permit';
    name = 'Specific Date Permits';
    description = 'Checks if the person has a specific permit for the shift date.';

    validate(shift: IShift, person: IPerson): IRuleResult {
        const shiftDate = parseISO(shift.date); // Check if date is valid ISO

        // If person has no permit ranges, they are available (unless other rules say otherwise)
        if (!person.permitRanges || person.permitRanges.length === 0) {
            return { isValid: true };
        }

        // Check if shift date falls into any of the permit ranges (which are effectively "off" days)
        // Wait, "Specific Date Permits" usually means "Allowed Dates" or "Forbidden Dates"?
        // User said: "allow users to select specific date ranges where that person will NOT be assigned."
        // So these range are "Exclusion Ranges" (Permit to be off).

        for (const range of person.permitRanges) {
            const start = parseISO(range.start);
            const end = parseISO(range.end);

            if (isWithinInterval(shiftDate, { start, end })) {
                return {
                    isValid: false,
                    reason: `${person.name} is on permitted leave during ${shift.date}`
                };
            }
        }

        return { isValid: true };
    }
}
