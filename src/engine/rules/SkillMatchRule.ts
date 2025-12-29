import type { IRule, IRuleResult, IShift, IPerson } from '../types';

export class SkillMatchRule implements IRule {
    id = 'skill-match';
    name = 'Skill Requirement Match';
    description = 'Ensures the person has the required skill for the shift location.';

    validate(shift: IShift, person: IPerson): IRuleResult {
        if (shift.requiredSkills && shift.requiredSkills.length > 0) {
            // OR Logic: Person must have AT LEAST ONE of the required skills
            const hasAnySkill = shift.requiredSkills.some(skill => person.skills.includes(skill));

            if (!hasAnySkill) {
                return {
                    isValid: false,
                    reason: `${person.name} does not have any of the required skills: ${shift.requiredSkills.join(', ')}`
                };
            }
        }
        return { isValid: true };
    }
}
