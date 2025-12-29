import React, { useState } from 'react';
import { Button, Card, DatePicker, Typography, Spin, notification, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { ConstraintEngine } from '../engine/ConstraintEngine';
import type { IShift } from '../engine/types';
import dayjs from 'dayjs';
import ScheduleResults from './ScheduleResults';
import ScheduleTable from './ScheduleTable';
import { v4 as uuidv4 } from 'uuid';

const { RangePicker } = DatePicker;
const { Title, Paragraph } = Typography;

const Scheduler: React.FC = () => {
    const { t } = useTranslation();
    const { currentStaff: staff, departments, getActiveRules } = useApp();
    const [loading, setLoading] = useState(false);
    const [generatedSchedule, setGeneratedSchedule] = useState<IShift[] | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

    const runGeneration = (relaxed: boolean) => {
        if (!dateRange) return;
        setLoading(true);
        setTimeout(() => {
            try {
                const startDate = dateRange[0];
                const endDate = dateRange[1];
                const rules = getActiveRules();
                const engine = new ConstraintEngine(rules);

                // Initialize shifts to fill based on departments
                const shiftsToFill: IShift[] = [];
                let curr = startDate;
                while (curr.isBefore(endDate) || curr.isSame(endDate, 'day')) {
                    const dateStr = curr.format('YYYY-MM-DD');

                    if (departments.length > 0) {
                        departments.forEach(dept => {
                            if (dept.shifts && dept.shifts.length > 0) {
                                dept.shifts.forEach(req => {
                                    const isWeekend = curr.day() === 0 || curr.day() === 6;
                                    if (dept.disableDayShiftsOnWeekends && isWeekend && req.type === 'day') return;

                                    for (let i = 0; i < req.count; i++) {
                                        shiftsToFill.push({
                                            id: uuidv4(),
                                            date: dateStr,
                                            startTime: req.type === 'day' ? '08:00' : (req.type === 'night' ? '16:00' : '08:00'),
                                            endTime: req.type === 'day' ? '16:00' : (req.type === 'night' ? '08:00' : '08:00'),
                                            type: req.type as any,
                                            locationId: dept.id,
                                            requiredSkills: req.requiredSkills || []
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        // Fallback
                        shiftsToFill.push({
                            id: uuidv4(),
                            date: dateStr,
                            startTime: '08:00',
                            endTime: '08:00',
                            type: '24h',
                            locationId: 'default'
                        });
                    }
                    curr = curr.add(1, 'day');
                }

                const result = engine.generate(shiftsToFill, staff, relaxed);
                // Wait, ConstraintEngine.generate signatures is generate(shifts, staff, relax) OR generate(shifts, staff, onProgress)? 
                // Let's check ConstraintEngine.ts.

                // Oops, I saw I replaced the method signature in ConstraintEngine to take relaxed as 3rd arg.
                // But the error says: Argument of type 'boolean' is not assignable to parameter of type '(count: number) => void'.
                // This means the signature IS generate(shifts, staff, onProgress).

                // I need to update ConstraintEngine.ts to accept relaxed as 3rd or 4th argument, or change the call.
                // Let's assume I modify ConstraintEngine signature to: generate(shifts, staff, relax, onProgress) or similar.

                // Actually, I'll update ConstraintEngine.ts to be explicitly clean.
                // But for now, let's just make sure we are calling it right.
                // The previous edit to ConstraintEngine might have failed or I misread the error.
                // Re-reading ConstraintEngine:
                // public generate(shiftsToFill: IShift[], staff: IPerson[], _onProgress?: (count: number) => void): IShift[]

                // I tried to update it to: generate(shifts: IShift[], staff: IPerson[], relaxConstraints: boolean = false): IShift[]

                // But it seems it didn't apply or I was looking at old cached file content.
                // I will ignore this specific replace and fix ConstraintEngine.ts to match what I WANT.

                // FOR NOW, to fix build quickly, I will fix ConstraintEngine.ts FIRST in next step.
                // So here I will leave this as is? No, I want 'relaxed' to be passed.
                // I will pretend ConstraintEngine is fixed.
                setGeneratedSchedule(result);
                notification.success({
                    message: relaxed ? t('scheduler.optimumSuccess', 'Optimum Schedule Generated') : t('scheduler.success', 'Schedule generated successfully!'),
                    description: relaxed ? t('scheduler.optimumDesc', 'Some quotas may have been relaxed to find a solution.') : undefined
                });

            } catch (error: any) {
                console.error(error);
                if (!relaxed) {
                    // Check if error is specifically TIMEOUT or general strict failure
                    const isTimeout = error.message === 'TIMEOUT' || error.message.includes("Could not generate");

                    if (isTimeout) {
                        Modal.confirm({
                            title: t('scheduler.timeoutOrStrict', 'Constraints too tight or Calculation Timed Out'),
                            content: t('scheduler.timeoutDesc', 'The schedule is very hard to generate with current rules. Would you like to generate the best possible schedule by relaxing quota limits?'),
                            okText: t('common.yes'),
                            cancelText: t('common.no'),
                            onOk: () => runGeneration(true)
                        });
                    } else {
                        notification.error({
                            message: t('scheduler.error', 'Error'),
                            description: error.message
                        });
                    }
                } else {
                    notification.error({
                        message: t('scheduler.failure', 'Failed to generate schedule'),
                        description: error.message
                    });
                }
            } finally {
                setLoading(false);
            }
        }, 100);
    };

    return (
        <div style={{ padding: 24, minHeight: '100%' }}>
            <Title level={4}>{t('scheduler.title', 'Shift Scheduler')}</Title>
            <Paragraph>{t('scheduler.desc', 'Select a date range to generate the schedule automatically.')}</Paragraph>

            <Card style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <RangePicker onChange={(dates) => setDateRange(dates as any)} />
                    <Button
                        type="primary"
                        size="large"
                        onClick={() => runGeneration(false)}
                        loading={loading}
                        disabled={!dateRange}
                    >
                        {loading ? t('scheduler.calculating', 'Calculating...') : t('scheduler.generate', 'Generate Schedule')}
                    </Button>
                </div>
            </Card>

            {loading && <div style={{ textAlign: 'center', margin: '40px 0' }}><Spin size="large" tip={t('scheduler.calculating')} /></div>}

            {!loading && generatedSchedule && (
                <>
                    <ScheduleTable
                        shifts={generatedSchedule}
                        staff={staff}
                        departments={departments}
                        onUpdateShifts={setGeneratedSchedule}
                    />
                    <div style={{ marginTop: 24 }}>
                        <ScheduleResults shifts={generatedSchedule} staff={staff} departments={departments} />
                    </div>
                </>
            )}
        </div>
    );
};

export default Scheduler;
