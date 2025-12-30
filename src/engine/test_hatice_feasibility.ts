
import { ConstraintEngine } from './ConstraintEngine';
import type { IShift, IPerson } from './types';
import { AvailabilityRule } from './rules/AvailabilityRule';
import { NoConsecutiveShiftRule } from './rules/NoConsecutiveRule';
import { OneShiftPerDayRule } from './rules/OneShiftPerDayRule';
import { ShiftTransitionRule } from './rules/ShiftTransitionRule';

console.log("Starting Hatice Feasibility Test...");

// 1. Setup Person with strict unavailability (from screenshot)
const hatice: IPerson = {
    id: 'hatice',
    name: 'Hatice',
    roles: ['Technician'],
    skills: ['Tomography'], // Screenshot shows Tomography
    availability: {
        unavailableDates: [] // Will fill below
    },
    exactShifts: 7
};

// Available: Jan 2-6 (5 days), Jan 8-11 (4 days). Jan 12+ is off. Jan 1 is off. Jan 7 is off.
// Let's populate unavailable dates for the WHOLE month to be precise.
const unavailableDates = [];

// Unavailable: Jan 1
unavailableDates.push('2026-01-01');
// Unavailable: Jan 7
unavailableDates.push('2026-01-07');
// Unavailable: Jan 12 to 31
for (let i = 12; i <= 31; i++) {
    unavailableDates.push(`2026-01-${i.toString().padStart(2, '0')}`);
}
hatice.availability.unavailableDates = unavailableDates;

// 2. Setup Shifts (Month of Jan 2026)
const shifts: IShift[] = [];
// Assuming Standard "24h" Nobet or "Day" Mesai. 
// User mentioned "24h" (Nobet) logic implies rest days.
// Let's simulate typical daily 24h slots.
for (let i = 1; i <= 31; i++) {
    const date = `2026-01-${i.toString().padStart(2, '0')}`;
    shifts.push({
        id: `s${i}`,
        date: date,
        startTime: '08:00',
        endTime: '08:00',
        type: '24h',
        locationId: 'loc1',
        requiredSkills: ['Tomography']
    });
}

// 3. Setup Rules
// Availability is stricter than preferences.
// NoConsecutive is standard.
// ShiftTransition (Nobet->Mesai) matters if mixed, here we test max Nobet potential.
const rules = [
    new AvailabilityRule(),
    new NoConsecutiveShiftRule(),
    new OneShiftPerDayRule()
];

const engine = new ConstraintEngine(rules);

// 4. Try to assign ONLY to Hatice (ignore others) to find MAX theoretical shifts.
// We do this by seeing how many valid assignments exist if we greedily pick her.
let validCount = 0;
const assignedShifts: IShift[] = [];

console.log(`Unavailabilities: ${unavailableDates.length} days.`);
console.log(`Available Days: ${31 - unavailableDates.length} days.`);

// Iterate through available days and check validation
const schedule: IShift[] = [];
// Try to fill aggressively
// Simple Greedy: Try Day 1, Day 2, Day 3...
for (const shift of shifts) {
    // Check validation against PAST assignments
    const res = engine.validateAssignment(shift, hatice, schedule);
    if (res.isValid) {
        // Assign
        const assigned = { ...shift, assignedToId: hatice.id };
        schedule.push(assigned);
        validCount++;
        console.log(`Assigned: ${shift.date}`);
    } else {
        // console.log(`Skipped ${shift.date}: ${res.reason}`);
    }
}

console.log(`\nMax Possible Shifts for Hatice with NoConsecutive rule: ${validCount}`);
console.log(`Required Exact: ${hatice.exactShifts}`);

if (validCount < (hatice.exactShifts || 0)) {
    console.log("CONCLUSION: IMPOSSIBLE to reach exact quota.");
} else {
    console.log("CONCLUSION: POSSIBLE to reach exact quota (in isolation).");
}
