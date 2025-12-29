export type Skill = 'X-Ray' | 'Tomography' | 'MRI' | 'Ultrasound' | 'General';

export type Role = 'Technician' | 'Nurse' | 'Doctor';

export interface IAvailability {
  unavailableDates: string[]; // ISO Date strings YYYY-MM-DD
}

export interface IShiftRequest {
  type: '24h' | 'day' | 'night';
  count: number;
  requiredSkills: Skill[];
}

export interface IDepartment {
  id: string;
  name: string;
  shifts: IShiftRequest[];
  disableDayShiftsOnWeekends?: boolean;
}

export interface IPerson {
  id: string;
  name: string;
  roles: Role[];
  skills: Skill[];
  availability: IAvailability;
  permitRanges?: { start: string; end: string }[]; // ISO strings
  preferredShiftType?: '24h' | 'mesai'; // Default to '24h' if undefined
  customEveryOtherDayLimit?: number; // Override global limit
  // Quotas
  minShifts?: number;
  maxShifts?: number;
  exactShifts?: number;
}

export interface IStaffProfile {
  id: string;
  name: string;
  staff: IPerson[];
}

export interface IShift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  locationId: string;
  requiredSkills?: Skill[]; // Changed from singular requiredSkill to support multiple
  assignedToId?: string;
  type: '24h' | 'day' | 'night';
}

export interface ILocation {
  id: string;
  name: string;
  requiredSkills: Skill[];
}

export interface IRuleResult {
  isValid: boolean;
  reason?: string;
}

export interface IRule {
  id: string;
  name: string;
  description: string;
  validate(shift: IShift, person: IPerson, assignedShifts: IShift[], isRelaxed?: boolean): IRuleResult;
}

export interface ISchedule {
  shifts: IShift[];
}
