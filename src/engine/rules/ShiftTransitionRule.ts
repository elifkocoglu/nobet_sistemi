import type { IRule, IRuleResult, IShift, IPerson } from '../types';
import { parseISO, subDays, isSameDay } from 'date-fns';

export class ShiftTransitionRule implements IRule {
    id = 'shift-transition';
    name = 'Shift Transition Rule';
    description = 'Mesai (Day) -> Nobet (24h) OK. Nobet (24h) -> Mesai (Day) INVALID.';

    validate(shift: IShift, person: IPerson, assignedShifts: IShift[]): IRuleResult {
        // Logic:
        // We need to check the previous day's shift for this person.
        // If current shift is 'day' (Mesai) and prev day was '24h' (Nobet) -> FAIL
        // If current shift is '24h' (Nobet) and prev day was 'day' (Mesai) -> PASS (Standard)
        // Also check:
        // If current shift is '24h' and prev day was '24h' -> FAIL (Consecutive 24h usually bad, but separate rule handles that)

        // This rule specifically handles: "Nobet (24h) -> Mesai (Day) INVALID"

        // Current shift type must be 'day' (Mesai) to potentialy violate "Nobet -> Mesai"
        if (shift.type !== 'day') {
            return { isValid: true };
        }

        const shiftDate = parseISO(shift.date);
        const dayBefore = subDays(shiftDate, 1);

        const personShifts = assignedShifts.filter(s => s.assignedToId === person.id);
        const shiftBefore = personShifts.find(s => isSameDay(parseISO(s.date), dayBefore));

        if (shiftBefore && shiftBefore.type === '24h') {
            return {
                isValid: false,
                reason: `${person.name} cannot work Mesai (Day) immediately after a Nobet (24h) shift.`
            };
        }

        return { isValid: true };
    }
}
