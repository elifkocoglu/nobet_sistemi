import React, { useState } from 'react';
import { Table, Badge, message, Space, Typography, Switch } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { IShift, IPerson, IDepartment } from '../engine/types';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { ConstraintEngine } from '../engine/ConstraintEngine';
import dayjs from 'dayjs';

const { Title } = Typography;

interface ScheduleTableProps {
    shifts: IShift[];
    staff: IPerson[];
    departments: IDepartment[];
    onUpdateShifts: (newShifts: IShift[]) => void;
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({ shifts, staff, departments, onUpdateShifts }) => {
    const { t } = useTranslation();
    const { getActiveRules } = useApp(); // Get full rules
    const [isEditMode, setIsEditMode] = useState(false);
    const [swapSource, setSwapSource] = useState<{ shiftId: string; personId: string; name: string } | null>(null);
    const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
    const [conflictShiftIds, setConflictShiftIds] = useState<Set<string>>(new Set());

    // Color Mapping
    const getDeptColor = (deptName: string) => {
        const lower = deptName.toLowerCase();
        if (lower.includes('tomography') || lower.includes('tomografi')) return '#ff9800'; // Orange
        if (lower.includes('x-ray') || lower.includes('rontgen') || lower.includes('röntgen')) return '#2196f3'; // Blue
        if (lower.includes('mesai')) return '#e91e63'; // Pink
        return '#9e9e9e'; // Default Grey
    };

    // Pivot Data: Rows = Dates, Cols = Departments
    // Collect all unique dates from shifts
    const uniqueDates = Array.from(new Set(shifts.map(s => s.date))).sort();

    const handleShiftClick = (shift: IShift) => {
        if (!isEditMode) return;

        const assignedPerson = staff.find(p => p.id === shift.assignedToId);

        if (swapSource) {
            if (swapSource.shiftId === shift.id) {
                // Deselect logic
                setSwapSource(null);
                setSelectedShiftId(null);
                return;
            }

            // Execute Swap (Proposed)
            const sourcePersonId = swapSource.personId;
            const targetPersonId = shift.assignedToId;

            // Update shifts in memory to test validity
            const newShifts = shifts.map(s => {
                if (s.id === swapSource.shiftId) {
                    return { ...s, assignedToId: targetPersonId }; // Can be undefined
                }
                if (s.id === shift.id) {
                    return { ...s, assignedToId: sourcePersonId };
                }
                return s;
            });

            // Validate using ConstraintEngine logic (Full Validation)
            // We need to validate the TWO affected/changed shifts.
            const rules = getActiveRules();
            const engine = new ConstraintEngine(rules);
            const newConflicts = new Set(conflictShiftIds);
            let hasConflict = false;

            // 1. Validate Source Person in Target Shift (shift.id)
            const sourcePerson = staff.find(p => p.id === sourcePersonId);
            if (sourcePerson) {
                const updatedTargetShift = newShifts.find(s => s.id === shift.id)!;
                const res = engine.validateAssignment(updatedTargetShift, sourcePerson, newShifts); // Strict check
                if (!res.isValid) {
                    message.warning(`${sourcePerson.name}: ${res.reason}`);
                    newConflicts.add(shift.id);
                    hasConflict = true;
                } else {
                    newConflicts.delete(shift.id);
                }
            }

            // 2. Validate Target Person in Source Shift (swapSource.shiftId)
            if (targetPersonId) {
                const targetPerson = staff.find(p => p.id === targetPersonId);
                if (targetPerson) {
                    const updatedSourceShift = newShifts.find(s => s.id === swapSource.shiftId)!;
                    const res = engine.validateAssignment(updatedSourceShift, targetPerson, newShifts);
                    if (!res.isValid) {
                        message.warning(`${targetPerson.name}: ${res.reason}`);
                        newConflicts.add(swapSource.shiftId);
                        hasConflict = true;
                    } else {
                        newConflicts.delete(swapSource.shiftId);
                    }
                }
            }

            setConflictShiftIds(newConflicts);
            onUpdateShifts(newShifts);
            setSwapSource(null);
            setSelectedShiftId(null);
            if (!hasConflict) {
                message.success(t('scheduler.swapped', 'Swapped!'));
            }
        } else {
            // Select First
            if (assignedPerson) {
                setSwapSource({ shiftId: shift.id, personId: assignedPerson.id, name: assignedPerson.name });
                setSelectedShiftId(shift.id);
                message.info(t('scheduler.selectTarget', `Selected ${assignedPerson.name}. Click another shift to swap.`));
            } else {
                message.warning(t('scheduler.cannotSwapFromEmpty', 'Cannot swap from an empty slot.'));
            }
        }
    };

    // Columns definition
    const columns: any[] = [
        {
            title: t('common.date'),
            dataIndex: 'date',
            key: 'date',
            fixed: 'left',
            width: 120,
            render: (text: string) => dayjs(text).format('DD.MM.YYYY dddd')
        }
    ];

    // Dynamic columns for departments
    departments.forEach(dept => {
        columns.push({
            title: (
                <span>
                    <Badge color={getDeptColor(dept.name)} /> {dept.name}
                </span>
            ),
            dataIndex: dept.id, // This will now hold the shift ID for that department on that date
            key: dept.id,
            render: (shiftId: string) => {
                const shift = shifts.find(s => s.id === shiftId);
                if (!shift) return '-';

                const assignedPerson = staff.find(p => p.id === shift.assignedToId);
                const isSelected = selectedShiftId === shift.id;
                const isConflict = conflictShiftIds.has(shift.id);

                let borderStyle = '1px solid #f0f0f0';
                if (isConflict) borderStyle = '2px solid red'; // Red Frame
                else if (isSelected) borderStyle = '2px solid #1890ff';

                return (
                    <div
                        onClick={() => handleShiftClick(shift)}
                        style={{
                            cursor: isEditMode ? 'pointer' : 'default',
                            border: borderStyle,
                            padding: '4px 8px',
                            background: '#fff', // White background
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minHeight: '32px'
                        }}
                    >
                        {assignedPerson ? (
                            <>
                                <div style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: getDeptColor(dept.name),
                                    flexShrink: 0
                                }} />
                                <span style={{ fontWeight: 500 }}>{assignedPerson.name}</span>
                            </>
                        ) : (
                            <span style={{ color: '#ccc', fontSize: '12px' }}>{t('common.unassigned')}</span>
                        )}
                    </div>
                );
            }
        });
    });

    // Prepare data for the table
    const data = uniqueDates.map(date => {
        const row: { [key: string]: string | number } = {
            key: date,
            date: date,
        };
        departments.forEach(dept => {
            const shiftForDept = shifts.find(s => s.date === date && s.locationId === dept.id);
            row[dept.id] = shiftForDept ? shiftForDept.id : ''; // Store shift ID in the department column
        });
        return row;
    });

    return (
        <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <Title level={5} style={{ margin: 0 }}>{t('scheduler.scheduleTable')}</Title>
                    {/* Legend */}
                    <div style={{ marginLeft: 24, display: 'flex', gap: 16 }}>
                        <span style={{ fontSize: 12 }}><Badge color="#ff9800" text="Tomography" /></span>
                        <span style={{ fontSize: 12 }}><Badge color="#2196f3" text="X-Ray" /></span>
                        <span style={{ fontSize: 12 }}><Badge color="#e91e63" text="Mesai" /></span>
                    </div>
                </Space>
                <Space>
                    <span style={{ marginRight: 8 }}>{isEditMode ? 'Editing Enabled' : 'View Only'}</span>
                    <Switch
                        checkedChildren={<EditOutlined />}
                        unCheckedChildren={<EditOutlined />}
                        checked={isEditMode}
                        onChange={(checked) => {
                            setIsEditMode(checked);
                            setSwapSource(null);
                            setSelectedShiftId(null);
                            setConflictShiftIds(new Set()); // Clear conflicts on mode toggle
                        }}
                    />
                </Space>
            </div>

            <Table
                dataSource={data}
                columns={columns}
                pagination={false}
                scroll={{ x: true, y: 600 }}
                rowKey="key"
                bordered
                size="middle"
            />
        </div>
    );
};

export default ScheduleTable;
