import type { IRule, IRuleResult, IShift, IPerson } from '../types';

export class GroupQuotaRule implements IRule {
    id = 'group-quota';
    name = 'Group Quota';
    description = 'Limits total shifts for a defined group of people.';

    private groups: { id: string; personIds: string[]; maxShifts: number }[];

    constructor(groups: { id: string; personIds: string[]; maxShifts: number }[] = []) {
        this.groups = groups;
    }

    validate(_shift: IShift, person: IPerson, assignedShifts: IShift[], isRelaxed?: boolean): IRuleResult {
        // Group Quota should act as a hard limit unless specifically designed otherwise.
        // Relaxing it completely (return true) causes massive overflows (21 vs 12).
        // If we want to relax, we could allow +1 or +2, but for now let's enforce it strictly
        // or effectively disable relaxation for this rule.

        // Remove: if (isRelaxed) return { isValid: true };


        // Find which group(s) this person belongs to
        const personsGroups = this.groups.filter(g => g.personIds.includes(person.id));

        if (personsGroups.length === 0) {
            return { isValid: true };
        }

        for (const group of personsGroups) {
            // Calculate total shifts for ALL members of this group
            let currentGroupShifts = 0;

            // Check past assignments
            assignedShifts.forEach(s => {
                if (s.assignedToId && group.personIds.includes(s.assignedToId)) {
                    currentGroupShifts++;
                }
            });

            // Check if adding this shift would exceed limit
            if (currentGroupShifts >= group.maxShifts) {
                return {
                    isValid: false,
                    reason: `Group quota exceeded for ${group.id}. Limit: ${group.maxShifts}`
                };
            }
        }

        return { isValid: true };
    }
}
