
import { ConstraintEngine } from './ConstraintEngine';
import { NoConsecutiveShiftRule } from './rules/NoConsecutiveRule';
import type { IShift, IPerson } from './types';

// Mock Data
const staff: IPerson[] = [
    { id: 'p1', name: 'Mustafa (Pref)', roles: ['Doctor'], skills: ['General'], availability: { unavailableDates: [] } },
    { id: 'p2', name: 'Kemal (Pref)', roles: ['Doctor'], skills: ['General'], availability: { unavailableDates: [] } },
    { id: 'p3', name: 'Hatice (Pref)', roles: ['Doctor'], skills: ['General'], availability: { unavailableDates: [] } },
    { id: 'p4', name: 'Other', roles: ['Doctor'], skills: ['General'], availability: { unavailableDates: [] } }
];

// 30 Days of shifts
const shifts: IShift[] = [];
for (let i = 1; i <= 30; i++) {
    shifts.push({
        id: `s${i}`,
        date: `2024-01-${i.toString().padStart(2, '0')}`,
        startTime: '08:00',
        endTime: '08:00',
        type: '24h',
        locationId: 'loc1',
        requiredSkills: ['General']
    });
}

// Rules: Only NoConsecutive (Standard)
const rules = [new NoConsecutiveShiftRule()];
const engine = new ConstraintEngine(rules);

// Config: p1, p2, p3 are Preferred. Strict Equality ON.
const equalityConfig = {
    applyStrictEquality: true,
    preferredPersonIds: ['p1', 'p2', 'p3'],
    ignoredPersonIds: []
};

console.log("Generating Schedule...");
try {
    const result = engine.generate([...shifts], staff, false, equalityConfig);

    // Count
    const counts: Record<string, number> = {};
    staff.forEach(p => counts[p.name] = 0);
    result.forEach(s => {
        if (s.assignedToId) {
            const p = staff.find(x => x.id === s.assignedToId);
            if (p) counts[p.name]++;
        }
    });

    console.log("Counts:", counts);

} catch (e) {
    console.error(e);
}
