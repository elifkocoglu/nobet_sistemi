import type { IRule, IRuleResult, IShift, IPerson } from '../types';
import { parseISO, subDays, addDays, isSameDay } from 'date-fns';

export class NoConsecutiveShiftRule implements IRule {
    id = 'no-consecutive';
    name = 'No Consecutive Shifts';
    description = 'A person cannot be assigned to two days in a row.';

    validate(shift: IShift, person: IPerson, assignedShifts: IShift[]): IRuleResult {
        const shiftDate = parseISO(shift.date);
        const dayBefore = subDays(shiftDate, 1);
        const dayAfter = addDays(shiftDate, 1);

        const personShifts = assignedShifts.filter(s => s.assignedToId === person.id);

        const hasShiftBefore = personShifts.some(s => isSameDay(parseISO(s.date), dayBefore));
        const hasShiftAfter = personShifts.some(s => isSameDay(parseISO(s.date), dayAfter));

        if (hasShiftBefore || hasShiftAfter) {
            return {
                isValid: false,
                reason: `${person.name} has a consecutive shift on the day before or after ${shift.date}`
            };
        }

        return { isValid: true };
    }
}
