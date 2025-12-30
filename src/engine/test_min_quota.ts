
import { ConstraintEngine } from './ConstraintEngine';
import type { IShift, IPerson } from './types';

// Mock Data
const staff: IPerson[] = [
    { id: 'p1', name: 'Person With Min 10', roles: ['Doctor'], skills: ['General'], availability: { unavailableDates: [] }, minShifts: 10 },
    { id: 'p2', name: 'Person No Min', roles: ['Doctor'], skills: ['General'], availability: { unavailableDates: [] } }
];

// 12 Shifts to assign
const shifts: IShift[] = [];
for (let i = 1; i <= 12; i++) {
    shifts.push({ id: `s${i}`, date: `2024-01-${i}`, startTime: '08:00', endTime: '16:00', type: 'day', locationId: 'loc1', requiredSkills: ['General'] });
}

// Case: Engine should give p1 10 shifts before balancing to p2 (or at least prioritize p1 until 10)
// Standard equality would split 6-6.
// Min Quota should push p1 towards 10.
// Let's see if p1 gets more than p2.

console.log("Testing Min Quota Prioritization...");
const engine = new ConstraintEngine([]); // No blocking rules

try {
    const result = engine.generate([...shifts], staff);

    const count1 = result.filter(s => s.assignedToId === 'p1').length;
    const count2 = result.filter(s => s.assignedToId === 'p2').length;

    console.log(`P1 (Min 10): ${count1}`);
    console.log(`P2 (No Min): ${count2}`);

    if (count1 >= 10) {
        console.log("PASS: Person with Min 10 reached quota or close to it (prioritized).");
    } else {
        console.log("FAIL: Person with Min 10 did not get prioritized enough?");
    }

} catch (e) {
    console.error(e);
}
