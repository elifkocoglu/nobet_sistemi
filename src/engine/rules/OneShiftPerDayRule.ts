import type { IRule, IRuleResult, IShift, IPerson } from '../types';

export class OneShiftPerDayRule implements IRule {
    id = 'one-shift-per-day';
    name = 'One Shift Per Day';
    description = 'A person can only be assigned to one shift per calendar day.';

    validate(shift: IShift, person: IPerson, assignedShifts: IShift[], _isRelaxed?: boolean): IRuleResult {
        // This rule is STRICT and should generally NOT be relaxed unless explicitly desired (which typically isn't for physical shifts).
        // However, if we wanted to allow double shifts in extreme cases, we could use isRelaxed.
        // For now, based on "Strict Conflict Prevention", we keep it strict even in relaxed mode, 
        // OR we can decide if "Relaxed" mode means "Allow double shifts".
        // The user request says: "Aynı Gün Tek Nöbet: Algoritma listeyi oluştururken... atamamalıdır."
        // And "Çakışma olmadan hazırlayabildiğim en uygun listeyi sunmamı ister misiniz?" implies conflict is bad.
        // Usually physical presence constraints are hard constraints. I will enforce it strictly.

        // Find if person has ANY other shift on the same date
        const conflictShift = assignedShifts.find(s =>
            s.assignedToId === person.id &&
            s.date === shift.date &&
            s.id !== shift.id // Don't conflict with self (for updates)
        );

        if (conflictShift) {
            return {
                isValid: false,
                reason: `${person.name} already has a shift on ${shift.date}.`
            };
        }

        return { isValid: true };
    }
}
