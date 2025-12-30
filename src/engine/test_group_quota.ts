
import { GroupQuotaRule } from './rules/GroupQuotaRule';
import type { IShift, IPerson } from './types';

console.log("Testing Group Quota Rule...");

// Mock Staff
const p1 = { id: 'p1', name: 'Ömer', roles: [], skills: [], availability: { unavailableDates: [] } } as IPerson;
const p2 = { id: 'p2', name: 'Hüseyin', roles: [], skills: [], availability: { unavailableDates: [] } } as IPerson;
const p3 = { id: 'p3', name: 'Other', roles: [], skills: [], availability: { unavailableDates: [] } } as IPerson;

// Group Config: P1 + P2 max 3 shifts combined.
const rule = new GroupQuotaRule([
    { id: 'g1', personIds: ['p1', 'p2'], maxShifts: 3 }
]);

const shifts: IShift[] = []; // Assigned shifts
// Assign 2 to P1, 1 to P2. Total 3.
shifts.push({ id: 's1', assignedToId: 'p1' } as IShift);
shifts.push({ id: 's2', assignedToId: 'p1' } as IShift);
shifts.push({ id: 's3', assignedToId: 'p2' } as IShift);

// Try to assign 4th shift to P1 -> Should Fail
const result1 = rule.validate({} as IShift, p1, shifts);
console.log(`Test 1 (P1, Total 3, Limit 3) -> Expect Fail: ${!result1.isValid} (${result1.reason})`);

// Try to assign 4th shift to P2 -> Should Fail
const result2 = rule.validate({} as IShift, p2, shifts);
console.log(`Test 2 (P2, Total 3, Limit 3) -> Expect Fail: ${!result2.isValid} (${result2.reason})`);

// Try to assign 4th shift to P3 (Not in group) -> Should Pass
const result3 = rule.validate({} as IShift, p3, shifts);
console.log(`Test 3 (P3, Not in group) -> Expect Pass: ${result3.isValid}`);

// Relaxed Check
const resultRelax = rule.validate({} as IShift, p1, shifts, true);
console.log(`Test 4 (Relaxed) -> Expect Pass: ${resultRelax.isValid}`);
