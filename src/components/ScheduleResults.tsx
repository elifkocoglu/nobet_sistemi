import React from 'react';
import { Calendar, Badge, Card, Button } from 'antd';
import type { Dayjs } from 'dayjs';
import type { IShift, IPerson, IDepartment } from '../engine/types';
import { DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';


interface ScheduleResultsProps {
    shifts: IShift[];
    staff: IPerson[];
    departments: IDepartment[];
}

const ScheduleResults: React.FC<ScheduleResultsProps> = ({ shifts, staff, departments }) => {
    const { t } = useTranslation();

    const getListData = (value: Dayjs) => {
        const dateStr = value.format('YYYY-MM-DD');
        return shifts.filter(s => s.date === dateStr);
    };

    const dateCellRender = (value: Dayjs) => {
        const listData = getListData(value);
        return (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {listData.map(item => {
                    const person = staff.find(p => p.id === item.assignedToId);
                    const dept = departments.find(d => d.id === item.locationId);
                    const deptName = dept ? dept.name : (item.locationId === 'default' ? 'General' : item.locationId);

                    let badgeStatus: 'success' | 'processing' | 'warning' | 'default' = 'success';
                    if (item.type === 'day') badgeStatus = 'processing';
                    if (item.type === 'night') badgeStatus = 'warning';
                    if (item.type === '24h') badgeStatus = 'default'; // Use default (grey) if error is not in type def, or maybe strict check failure

                    return (
                        <li key={item.id} style={{ marginBottom: 4 }}>
                            <Badge
                                status={badgeStatus}
                                text={
                                    <span style={{ fontSize: '0.8rem' }}>
                                        <b>{person ? person.name : 'Unassigned'}</b>
                                        <br />
                                        <span style={{ color: '#666', fontSize: '0.75rem' }}>
                                            {deptName} ({item.type})
                                        </span>
                                    </span>
                                }
                            />
                        </li>
                    );
                })}
            </ul>
        );
    };

    // Very simple CSV export
    const handleExport = () => {
        const headers = ['Date', 'Department', 'Shift Type', 'Assigned Staff', 'Role'];
        const rows = shifts.map(s => {
            const person = staff.find(p => p.id === s.assignedToId);
            const dept = departments.find(d => d.id === s.locationId);
            const deptName = dept ? dept.name : (s.locationId === 'default' ? 'General' : s.locationId);

            return [
                s.date,
                deptName,
                s.type,
                person?.name || 'Unassigned',
                person?.roles.join(', ') || ''
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "schedule_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Card title={t('schedule.resultsTitle', 'Schedule Results')} extra={
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                {t('common.export', 'Export to Excel')}
            </Button>
        }>
            <Calendar dateCellRender={dateCellRender} />
        </Card>
    );
};

export default ScheduleResults;
