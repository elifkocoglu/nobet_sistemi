import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { IPerson, IRule, IStaffProfile } from '../engine/types';
import { WeekendExclusionRule } from '../engine/rules/WeekendExclusionRule';
import { NoConsecutiveShiftRule } from '../engine/rules/NoConsecutiveRule';
import { SkillMatchRule } from '../engine/rules/SkillMatchRule';
import { SpecificDatePermitRule } from '../engine/rules/SpecificDatePermitRule';
import { ShiftTypeRule } from '../engine/rules/ShiftTypeRule';
import { EveryOtherDayLimitRule } from '../engine/rules/EveryOtherDayLimitRule';
import { GroupQuotaRule } from '../engine/rules/GroupQuotaRule';
import { MinMaxQuotaRule } from '../engine/rules/MinMaxQuotaRule';
import type { IDepartment } from '../engine/types';
import { OneShiftPerDayRule } from '../engine/rules/OneShiftPerDayRule';
import { ShiftTransitionRule } from '../engine/rules/ShiftTransitionRule';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase'; // Import Firebase DB
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

export interface RuleConfig {
    isActive: boolean;
    excludedPersonIds?: string[]; // Specifically for WeekendExclusionRule
    mesaiPersonIds?: string[]; // Specifically for ShiftTypeRule
    everyOtherDayLimit?: number; // Specifically for EveryOtherDayLimitRule
    groupQuotas?: { id: string; name: string; personIds: string[]; maxShifts: number }[]; // For GroupQuotaRule
}

export type AllRulesConfig = Record<string, RuleConfig>;

interface AppState {
    profiles: IStaffProfile[];
    activeProfileId: string | null;
    currentStaff: IPerson[]; // Derived from activeProfile
    departments: IDepartment[];
    rulesConfig: AllRulesConfig;
    isSetupComplete: boolean;
    userMode: 'guest' | 'user' | null;

    // Actions
    addProfile: (name: string) => void;
    deleteProfile: (id: string) => void;
    setActiveProfileId: (id: string) => void;

    addPerson: (person: IPerson) => void;
    removePerson: (id: string) => void;
    updateDepartments: (depts: IDepartment[]) => void;
    updatePerson: (person: IPerson) => void;
    updateRuleConfig: (ruleId: string, config: Partial<RuleConfig>) => void;
    getActiveRules: () => IRule[];
    completeSetup: () => void;
    setUserMode: (mode: 'guest' | 'user') => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

// Initial empty state until setup
const INITIAL_RULES_CONFIG: AllRulesConfig = {
    'availability': { isActive: true },
    'no-consecutive': { isActive: true },
    'skill-match': { isActive: true },
    'weekend-exclusion': { isActive: false, excludedPersonIds: [] },
    'specific-date-permit': { isActive: false },
    'shift-type': { isActive: false, mesaiPersonIds: [] },
    'every-other-day-limit': { isActive: false, everyOtherDayLimit: 5 },
    'group-quota': { isActive: false, groupQuotas: [] }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // State
    const [profiles, setProfiles] = useState<IStaffProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [departments, setDepartments] = useState<IDepartment[]>([]);
    const [rulesConfig, setRulesConfig] = useState<AllRulesConfig>(INITIAL_RULES_CONFIG);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [userMode, setUserMode] = useState<'guest' | 'user' | null>(null);

    // Derived State
    const currentStaff = profiles.find(p => p.id === activeProfileId)?.staff || [];

    // --- Firebase Synchronization ---

    // 1. Sync User Mode & Active Profile ID (Local Storage for Active selection is okay, but global data should be firestore)
    // Actually, Active Profile is a local User preference usually. But profiles themselves are global.
    // Let's keep `activeProfileId` in localStorage so different users can view different lists?
    // Or users want to see the SAME screen.
    // Requirement: "linke sahip diğer tüm kullanıcıların ekranı... otomatik güncellenmelidir."
    // This implies GLOBAL state.
    // However, if one user switches list, should EVERYONE switch?
    // Usually no, but let's assume we sync DATA, but `activeProfileId` might optionally be synced or local.
    // Let's keep `activeProfileId` LOCAL for navigation, but DATA global.

    useEffect(() => {
        // Load local preferences
        const storedMode = localStorage.getItem('userMode');
        const storedActiveId = localStorage.getItem('activeProfileId');

        if (storedMode === 'user') setUserMode('user');
        if (storedActiveId) setActiveProfileId(storedActiveId);
    }, []);

    // Save Active Profile ID locally
    useEffect(() => {
        if (activeProfileId) localStorage.setItem('activeProfileId', activeProfileId);
    }, [activeProfileId]);


    // 2. Sync Profiles (Realtime)
    useEffect(() => {
        // Always sync profiles if DB is available
        const unsubscribe = onSnapshot(collection(db, 'profiles'), (snapshot) => {
            const loadedProfiles: IStaffProfile[] = [];
            snapshot.forEach((doc) => {
                loadedProfiles.push(doc.data() as IStaffProfile);
            });
            setProfiles(loadedProfiles);
        }, (error) => {
            console.error("Profile sync error:", error);
            // Optionally notify user connectivity issue
        });
        return () => unsubscribe();
    }, []); // Removed userMode dependency entirely

    // Auto-select profile if none selected
    useEffect(() => {
        if (profiles.length > 0 && !activeProfileId) {
            setActiveProfileId(profiles[0].id);
        }
    }, [profiles, activeProfileId]);


    // 3. Sync Settings (Rules, Depts, Setup) (Realtime)
    useEffect(() => {
        // Always sync settings
        // Departments
        const unsubDepts = onSnapshot(doc(db, 'settings', 'departments'), (doc) => {
            if (doc.exists()) {
                setDepartments(doc.data().list || []);
            }
        });

        // Rules
        const unsubRules = onSnapshot(doc(db, 'settings', 'rules'), (doc) => {
            if (doc.exists()) {
                setRulesConfig(doc.data().config || INITIAL_RULES_CONFIG);
            }
        });

        // Setup Status
        const unsubSetup = onSnapshot(doc(db, 'settings', 'app_state'), (doc) => {
            if (doc.exists()) {
                setIsSetupComplete(doc.data().isSetupComplete || false);
            }
        });

        return () => {
            unsubDepts();
            unsubRules();
            unsubSetup();
        };
    }, []);


    // --- Actions (Write to Firebase) ---


    // --- Helper for Firestore Sanitization ---
    const sanitizeForFirestore = (obj: any): any => {
        return JSON.parse(JSON.stringify(obj));
    };

    // Profile Actions
    const addProfile = async (name: string) => {
        const newProfile: IStaffProfile = {
            id: uuidv4(),
            name,
            staff: []
        };

        // Optimistic State Update
        setProfiles(prev => [...prev, newProfile]);
        setActiveProfileId(newProfile.id);

        // Write to Firestore
        try {
            await setDoc(doc(db, 'profiles', newProfile.id), sanitizeForFirestore(newProfile));
        } catch (error: any) {
            console.error("Error adding profile:", error);
            // Revert on error
            setProfiles(prev => prev.filter(p => p.id !== newProfile.id));
            alert(`Error creating list: ${error.message || error}`);
        }
    };

    const deleteProfile = async (id: string) => {
        const prevProfiles = profiles;
        // Optimistic
        setProfiles(prev => prev.filter(p => p.id !== id));
        if (activeProfileId === id) setActiveProfileId(null);

        try {
            await deleteDoc(doc(db, 'profiles', id));
        } catch (error: any) {
            console.error("Error deleting profile:", error);
            setProfiles(prevProfiles); // Revert
            alert(`Error deleting list: ${error.message || error}`);
        }
    };

    // Staff Actions
    const addPerson = async (person: IPerson) => {
        if (!activeProfileId) return;
        const profile = profiles.find(p => p.id === activeProfileId);
        if (!profile) return;

        const previousStaff = profile.staff;
        const updatedProfile = { ...profile, staff: [...profile.staff, person] };

        // Optimistic Update
        setProfiles(prev => prev.map(p => p.id === activeProfileId ? updatedProfile : p));

        try {
            await setDoc(doc(db, 'profiles', profile.id), sanitizeForFirestore(updatedProfile));
        } catch (error: any) {
            console.error("Error adding person:", error);
            // Revert
            const revertedProfile = { ...profile, staff: previousStaff };
            setProfiles(prev => prev.map(p => p.id === activeProfileId ? revertedProfile : p));
            alert(`Error adding person: ${error.message || error}`);
        }
    };

    const removePerson = async (id: string) => {
        if (!activeProfileId) return;
        const profile = profiles.find(p => p.id === activeProfileId);
        if (!profile) return;

        const previousStaff = profile.staff;
        const updatedProfile = { ...profile, staff: profile.staff.filter(s => s.id !== id) };
        // Optimistic Update
        setProfiles(prev => prev.map(p => p.id === activeProfileId ? updatedProfile : p));

        try {
            await setDoc(doc(db, 'profiles', profile.id), sanitizeForFirestore(updatedProfile));
        } catch (error: any) {
            console.error("Error removing person:", error);
            // Revert
            const revertedProfile = { ...profile, staff: previousStaff };
            setProfiles(prev => prev.map(p => p.id === activeProfileId ? revertedProfile : p));
            alert(`Error removing person: ${error.message || error}`);
        }
    };

    const updatePerson = async (updatedPerson: IPerson) => {
        if (!activeProfileId) return;
        const profile = profiles.find(p => p.id === activeProfileId);
        if (!profile) return;

        const previousStaff = profile.staff;
        const updatedProfile = { ...profile, staff: profile.staff.map(s => s.id === updatedPerson.id ? updatedPerson : s) };
        // Optimistic Update
        setProfiles(prev => prev.map(p => p.id === activeProfileId ? updatedProfile : p));

        try {
            await setDoc(doc(db, 'profiles', profile.id), sanitizeForFirestore(updatedProfile));
        } catch (error: any) {
            console.error("Error updating person:", error);
            // Revert
            const revertedProfile = { ...profile, staff: previousStaff };
            setProfiles(prev => prev.map(p => p.id === activeProfileId ? revertedProfile : p));
            alert(`Error updating person: ${error.message || error}`);
        }
    };

    const updateDepartments = async (newDepartments: IDepartment[]) => {
        const prevDepartments = departments;
        // Optimistic update
        setDepartments(newDepartments);
        try {
            await setDoc(doc(db, 'settings', 'departments'), { list: newDepartments });
        } catch (error) {
            console.error("Error updating departments:", error);
            setDepartments(prevDepartments); // Revert
            alert("Error updating departments.");
        }
    };

    const updateRuleConfig = async (ruleId: string, config: Partial<RuleConfig>) => {
        const newConfig = {
            ...rulesConfig,
            [ruleId]: { ...rulesConfig[ruleId], ...config }
        };
        // Optimistic
        setRulesConfig(newConfig);
        await setDoc(doc(db, 'settings', 'rules'), { config: newConfig });
    };

    const completeSetup = async () => {
        // Optimistic
        setIsSetupComplete(true);
        if (!userMode) {
            setUserMode('user');
            localStorage.setItem('userMode', 'user');
        }

        await setDoc(doc(db, 'settings', 'app_state'), { isSetupComplete: true });

        // Ensure at least one profile exists if none
        if (profiles.length === 0) {
            addProfile('Genel Liste');
        }
    };

    const getActiveRules = (): IRule[] => {
        const activeRules: IRule[] = [];

        // 1. No Consecutive Shifts (Highest Priority - Fail Fast)
        if (rulesConfig['no-consecutive']?.isActive) activeRules.push(new NoConsecutiveShiftRule());

        // 2. Skill Match (Fundamental Feasibility)
        if (rulesConfig['skill-match']?.isActive) activeRules.push(new SkillMatchRule());

        // 3. Special Date Permits / Exclusions (Özel İzinler)
        if (rulesConfig['specific-date-permit']?.isActive) {
            activeRules.push(new SpecificDatePermitRule());
        }
        if (rulesConfig['weekend-exclusion']?.isActive) {
            const excludedIds = rulesConfig['weekend-exclusion'].excludedPersonIds || [];
            activeRules.push(new WeekendExclusionRule(excludedIds));
        }

        // 4. Min/Max Quotas (Personal)
        // Note: Sort priority for this is also handled in ConstraintEngine
        activeRules.push(new MinMaxQuotaRule());

        // 5. Group Quota
        if (rulesConfig['group-quota']?.isActive) {
            const quotas = rulesConfig['group-quota'].groupQuotas || [];
            activeRules.push(new GroupQuotaRule(quotas));
        }

        // 6. Every Other Day Limit
        if (rulesConfig['every-other-day-limit']?.isActive) {
            const limit = rulesConfig['every-other-day-limit'].everyOtherDayLimit || 5;
            activeRules.push(new EveryOtherDayLimitRule(limit));
        }

        // Other Rules (Base constraints)
        activeRules.push(new OneShiftPerDayRule());

        // Shift Type Rules
        if (rulesConfig['shift-type']?.isActive) {
            const mesaiIds = rulesConfig['shift-type'].mesaiPersonIds || [];
            activeRules.push(new ShiftTypeRule(mesaiIds));
        }
        activeRules.push(new ShiftTransitionRule());

        // REMOVED: AvailabilityRule (as requested, no endpoint)
        // if (rulesConfig['availability']?.isActive) activeRules.push(new AvailabilityRule());

        return activeRules;
    };

    return (
        <AppContext.Provider value={{
            profiles, activeProfileId, currentStaff, departments, rulesConfig, isSetupComplete, userMode,
            addProfile, deleteProfile, setActiveProfileId,
            addPerson, removePerson, updatePerson, updateDepartments, updateRuleConfig, getActiveRules, completeSetup, setUserMode
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
