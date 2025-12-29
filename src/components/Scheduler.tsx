import React, { useState, useEffect } from 'react';
import { Button, Card, DatePicker, Typography, Spin, notification, Modal, Input, List, Empty, Popconfirm, Drawer, Badge } from 'antd';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { ConstraintEngine } from '../engine/ConstraintEngine';
import type { IShift } from '../engine/types';
import dayjs from 'dayjs';
import ScheduleResults from './ScheduleResults';
import ScheduleTable from './ScheduleTable';
import { v4 as uuidv4 } from 'uuid';
import { SaveOutlined, UnorderedListOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Title, Paragraph, Text } = Typography;

interface SavedSchedule {
    id: string;
    name: string;
    createdAt: string;
    schedule: IShift[];
    dateRange: [string, string]; // ISO strings
}

const Scheduler: React.FC = () => {
    const { t } = useTranslation();
    const { currentStaff: staff, departments, getActiveRules } = useApp();
    const [loading, setLoading] = useState(false);
    const [generatedSchedule, setGeneratedSchedule] = useState<IShift[] | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

    // Save Feature State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [scheduleName, setScheduleName] = useState('');
    const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
    const [isSavedListOpen, setIsSavedListOpen] = useState(false);

    // Load saved schedules on mount
    useEffect(() => {
        const saved = localStorage.getItem('saved_schedules');
        if (saved) {
            try {
                setSavedSchedules(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved schedules", e);
            }
        }
    }, []);

    const saveToLocalStorage = (schedules: SavedSchedule[]) => {
        localStorage.setItem('saved_schedules', JSON.stringify(schedules));
        setSavedSchedules(schedules);
    };

    const handleSaveSchedule = () => {
        if (!scheduleName.trim() || !generatedSchedule || !dateRange) return;

        const newSaved: SavedSchedule = {
            id: uuidv4(),
            name: scheduleName,
            createdAt: new Date().toISOString(),
            schedule: generatedSchedule,
            dateRange: [dateRange[0].toISOString(), dateRange[1].toISOString()]
        };

        const updated = [newSaved, ...savedSchedules];
        saveToLocalStorage(updated);
        setIsSaveModalOpen(false);
        setScheduleName('');
        notification.success({ message: t('common.success') });
    };

    const handleDeleteSaved = (id: string) => {
        const updated = savedSchedules.filter(s => s.id !== id);
        saveToLocalStorage(updated);
        notification.success({ message: t('common.deleted') });
    };

    const handleLoadSaved = (saved: SavedSchedule) => {
        setGeneratedSchedule(saved.schedule);
        setDateRange([dayjs(saved.dateRange[0]), dayjs(saved.dateRange[1])]);
        setIsSavedListOpen(false);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
                setGeneratedSchedule(result);
                notification.success({
                    message: relaxed ? t('scheduler.optimumSuccess') : t('scheduler.success'),
                    description: relaxed ? t('scheduler.optimumDesc') : undefined
                });

            } catch (error: any) {
                console.error(error);
                if (!relaxed) {
                    // Check if error is specifically TIMEOUT or general strict failure
                    const isTimeout = error.message === 'TIMEOUT' || error.message.includes("Could not generate");

                    if (isTimeout) {
                        Modal.confirm({
                            title: t('scheduler.timeoutOrStrict'),
                            content: t('scheduler.timeoutDesc'),
                            okText: t('common.yes'),
                            cancelText: t('common.no'),
                            onOk: () => runGeneration(true)
                        });
                    } else {
                        notification.error({
                            message: t('scheduler.error'),
                            description: error.message
                        });
                    }
                } else {
                    notification.error({
                        message: t('scheduler.failure'),
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={4}>{t('scheduler.title')}</Title>
                    <Paragraph>{t('scheduler.desc')}</Paragraph>
                </div>
                <Button
                    icon={<UnorderedListOutlined />}
                    onClick={() => setIsSavedListOpen(true)}
                >
                    {t('savedSchedules.title')} <Badge count={savedSchedules.length} offset={[10, -5]} color="blue" />
                </Button>
            </div>

            <Card style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <RangePicker
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as any)}
                        style={{ minWidth: 250 }}
                    />
                    <Button
                        type="primary"
                        size="large"
                        onClick={() => runGeneration(false)}
                        loading={loading}
                        disabled={!dateRange}
                    >
                        {loading ? t('scheduler.calculating') : t('scheduler.generate')}
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

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
                        <Button
                            type="primary"
                            size="large"
                            icon={<SaveOutlined />}
                            onClick={() => setIsSaveModalOpen(true)}
                            style={{ background: '#52c41a' }}
                        >
                            {t('common.save')}
                        </Button>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <ScheduleResults shifts={generatedSchedule} staff={staff} departments={departments} />
                    </div>
                </>
            )}

            {/* Save Modal */}
            <Modal
                title={t('savedSchedules.saveTitle')}
                open={isSaveModalOpen}
                onOk={handleSaveSchedule}
                onCancel={() => setIsSaveModalOpen(false)}
                okText={t('common.save')}
                cancelText={t('common.cancel')}
            >
                <p>{t('savedSchedules.saveDesc')}</p>
                <Input
                    placeholder={t('savedSchedules.namePlaceholder')}
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    onPressEnter={handleSaveSchedule}
                />
            </Modal>

            {/* Saved Schedules Drawer */}
            <Drawer
                title={t('savedSchedules.title')}
                placement="right"
                onClose={() => setIsSavedListOpen(false)}
                open={isSavedListOpen}
                width={400}
            >
                {savedSchedules.length === 0 ? (
                    <Empty description={t('savedSchedules.empty')} />
                ) : (
                    <List
                        dataSource={savedSchedules}
                        renderItem={(item) => (
                            <List.Item
                                actions={[
                                    <Button
                                        type="text"
                                        icon={<EyeOutlined />}
                                        onClick={() => handleLoadSaved(item)}
                                    >
                                        {t('savedSchedules.load')}
                                    </Button>,
                                    <Popconfirm
                                        title={t('savedSchedules.confirmDelete')}
                                        onConfirm={() => handleDeleteSaved(item.id)}
                                        okText={t('common.yes')}
                                        cancelText={t('common.no')}
                                    >
                                        <Button type="text" danger icon={<DeleteOutlined />} key="delete" />
                                    </Popconfirm>
                                ]}
                            >
                                <List.Item.Meta
                                    title={item.name}
                                    description={
                                        <div>
                                            <div>{dayjs(item.dateRange[0]).format('DD.MM.YYYY')} - {dayjs(item.dateRange[1]).format('DD.MM.YYYY')}</div>
                                            <Text type="secondary" style={{ fontSize: '0.8em' }}>
                                                {t('savedSchedules.date')}: {dayjs(item.createdAt).format('DD.MM.YYYY HH:mm')}
                                            </Text>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Drawer>
        </div>
    );
};

export default Scheduler;
