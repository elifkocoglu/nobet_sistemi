import type { IRule, IRuleResult, IShift, IPerson } from '../types';
import dayjs from 'dayjs';

export class EveryOtherDayLimitRule implements IRule {
    id = 'every-other-day-limit';
    name = 'Every Other Day Shift Limit';
    description = 'Limits how many "every other day" (Gün Aşırı) shifts a person can have in a month.';

    private globalLimit: number;

    constructor(globalLimit: number = 5) {
        this.globalLimit = globalLimit;
    }

    validate(shift: IShift, person: IPerson, assignedShifts: IShift[]): IRuleResult {
        // "Every Other Day" (Gün Aşırı) means working on Day X, then Day X+2. (Gap of 1 day).
        // e.g. Mon work, Wed work.
        // We need to count how many times this pattern occurs for this person in the current period.

        // LIMIT CHECK:
        // We only care if adding THIS shift causes the count to exceed the limit.
        // Pattern A: ... Previous Shift was 2 days ago. This creates a "Gün Aşırı" instance.
        // Pattern B: ... Next Shift is 2 days later. This creates a "Gün Aşırı" instance.

        // However, `assignedShifts` usually only contains PAST assignments if we are generating sequentially.
        // But the constraint engine might be filling in random order?
        // Let's assume sequential or check all.

        const shiftDate = dayjs(shift.date);
        const personShifts = assignedShifts.filter(s => s.assignedToId === person.id);

        // Check if this assignment CREATES a new "Gün aşırı" situation.
        // Situation 1: There is a shift 2 days ago.
        const twoDaysAgo = shiftDate.subtract(2, 'day').format('YYYY-MM-DD');
        const hasShiftTwoDaysAgo = personShifts.some(s => s.date === twoDaysAgo);

        // Situation 2: There is a shift 2 days later. (If filling randomly)
        const twoDaysLater = shiftDate.add(2, 'day').format('YYYY-MM-DD');
        const hasShiftTwoDaysLater = personShifts.some(s => s.date === twoDaysLater);

        // If neither, this shift doesn't add to the count yet (in terms of forming a pair).
        if (!hasShiftTwoDaysAgo && !hasShiftTwoDaysLater) {
            return { isValid: true };
        }

        // Calculate TOTAL "Gün Aşırı" pairs this person ALREADY has + new ones.
        // Only count pairs where the earlier date is the anchor to avoid double counting?
        // A -> C (One pair). A -> C -> E (Two pairs: A-C, C-E).

        // Let's sort all shifts including current one.
        const allShifts = [...personShifts, { ...shift, assignedToId: person.id }];
        allShifts.sort((a, b) => a.date.localeCompare(b.date));

        let pairCount = 0;
        for (let i = 0; i < allShifts.length - 1; i++) {
            const current = dayjs(allShifts[i].date);
            const next = dayjs(allShifts[i + 1].date);
            if (next.diff(current, 'day') === 2) {
                pairCount++;
            }
        }

        const limit = person.customEveryOtherDayLimit !== undefined ? person.customEveryOtherDayLimit : this.globalLimit;

        if (pairCount > limit) {
            return {
                isValid: false,
                reason: `Every Other Day limit exceeded for ${person.name}. Limit: ${limit}, Count: ${pairCount}`
            };
        }

        return { isValid: true };
    }
}
