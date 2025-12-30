import React, { useState, useEffect } from 'react';
import { Button, Card, DatePicker, Typography, Spin, notification, Modal, Input, List, Empty, Popconfirm, Drawer, Badge, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { ConstraintEngine } from '../engine/ConstraintEngine';
import type { IShift } from '../engine/types';
import dayjs from 'dayjs';
import ScheduleResults from './ScheduleResults';
import ScheduleTable from './ScheduleTable';
import { v4 as uuidv4 } from 'uuid';
import { SaveOutlined, UnorderedListOutlined, DeleteOutlined, EyeOutlined, InfoCircleOutlined } from '@ant-design/icons';
import * as holidays from '../utils/holidays';

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

    // Equality Config State
    const [equalityConfig, setEqualityConfig] = useState<import('../engine/types').IEqualityConfig>({
        applyStrictEquality: true,
        preferredPersonIds: [],
        ignoredPersonIds: []
    });

    // Timeout/Error Modal State
    const [isTimeoutModalOpen, setIsTimeoutModalOpen] = useState(false);

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
        // Reset modals
        setIsTimeoutModalOpen(false);

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
                                    const holidayCheck = holidays.isTurkishPublicHoliday(curr);
                                    const isHoliday = holidayCheck.isHoliday;

                                    // Filter Logic:
                                    // 1. Weekend Check for Day Shifts (Existing)
                                    if (dept.disableDayShiftsOnWeekends && isWeekend && req.type === 'day') return;

                                    // 2. Holiday Check for Day Shifts (New)
                                    // "Resmi tatillerde mesai yok"
                                    if (isHoliday && req.type === 'day') return;

                                    for (let i = 0; i < req.count; i++) {
                                        shiftsToFill.push({
                                            id: uuidv4(),
                                            date: dateStr,
                                            startTime: req.type === 'day' ? '08:00' : (req.type === 'night' ? '16:00' : '08:00'),
                                            endTime: req.type === 'day' ? '16:00' : (req.type === 'night' ? '08:00' : '08:00'),
                                            type: req.type as any,
                                            locationId: dept.id,
                                            requiredSkills: req.requiredSkills || [],
                                            // Optional: Add note about holiday if we want
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        // Fallback
                        // Default is 24h, so no day shift processing needed here usually.
                        // But if we had default day shifts, we would filter them too.
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

                const result = engine.generate(shiftsToFill, staff, relaxed, equalityConfig);
                setGeneratedSchedule(result);
                notification.success({
                    message: relaxed ? t('scheduler.optimumSuccess') : t('scheduler.success'),
                    description: relaxed ? t('scheduler.optimumDesc') : undefined
                });

            } catch (error: any) {
                console.error(error);
                if (!relaxed) {
                    const isTimeout = error.message === 'TIMEOUT';
                    const isStrictFailure = error.message.includes("Could not generate");

                    if (isTimeout || isStrictFailure) {
                        setIsTimeoutModalOpen(true);
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
                <div style={{ marginTop: 16 }}>
                    <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        <InfoCircleOutlined style={{ marginRight: 4 }} />
                        {t('scheduler.equalityConfig.holidayInfo', 'Resmi tatillerde otomatik olarak Mesai yazılmaz.')}
                    </Typography.Text>
                </div>
            </Card>

            {/* Equality Configuration */}
            <Card title={t('scheduler.equalityConfig.title')} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={equalityConfig.applyStrictEquality}
                                onChange={(e) => setEqualityConfig({ ...equalityConfig, applyStrictEquality: e.target.checked })}
                                style={{ marginRight: 8, width: 16, height: 16 }}
                            />
                            {t('scheduler.equalityConfig.title')}
                        </label>
                    </div>

                    {equalityConfig.applyStrictEquality && (
                        <div style={{ paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {/* Relax Equality Option */}
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="equalityRelax"
                                    checked={!equalityConfig.applyStrictEquality}
                                    onChange={() => setEqualityConfig({ ...equalityConfig, applyStrictEquality: false })} // Toggling this actually disables strict equality?
                                    // Actually, if "Equal Dist Constraint" is CHECKED, then "Strict Equality" is TRUE.
                                    // The user asked: "kısıt ekleyelim o kısıt aktif edilince 3 madde olsun: ... diğer kısıtları sağlamak için eşitliği boz"
                                    // So if this option is selected, `applyStrictEquality` should be FALSE?
                                    // But if the PARENT checkbox is "Enable Equality Constraint", then `applyStrictEquality` should be TRUE by default.
                                    // Let's adjust logic:
                                    // Master Switch: "Equal Distribution Active?"
                                    // If Active:
                                    // Option 1: "Strict Mode" (Default) vs "Relaxed Mode" (Allow inequality to solve others)
                                    // Option 2: More Shifts List
                                    // Option 3: Less Shifts List

                                    // Wait, the prompt says: "sistem diğer kısıtları karşılamak için nöbetleri eşit dağıtmasın maddesi olsun"
                                    // This means there is an option TO RELAX it.
                                    style={{ marginRight: 8 }}
                                />
                                {t('scheduler.equalityConfig.strict')}
                            </label>

                            {/* Re-read prompt carefully:
                                "bir tane eşit nöbet için kısıt ekleyelim o kısıt aktif edilince 3 madde olsun"
                                Item 1: "sistem diğer kısıtları karşılamak için nöbetleri eşit dağıtmasın maddesi olsun" -> This implies we CAN choose to disable equality for sake of valid schedule.
                                So maybe a Checkbox: "Allow inequality to satisfy other rules"?
                                
                                Item 2: "sistem kullanıcının seçtiği kişilere daha az nöbet versin"
                                Item 3: "sistem kullanıcının belirlediği kişilere daha fazla nöbet versin"
                             */}

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={!equalityConfig.applyStrictEquality}
                                    onChange={(e) => setEqualityConfig({ ...equalityConfig, applyStrictEquality: !e.target.checked })}
                                />
                                {t('scheduler.equalityConfig.strict')}
                            </div>


                            <div>
                                <Text strong>{t('scheduler.equalityConfig.ignored')}</Text>
                                <Select
                                    mode="multiple"
                                    style={{ width: '100%', marginTop: 4 }}
                                    placeholder={t('common.select')}
                                    value={equalityConfig.ignoredPersonIds}
                                    onChange={(vals) => setEqualityConfig({ ...equalityConfig, ignoredPersonIds: vals })}
                                >
                                    {staff.map(p => (
                                        <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <Text strong>{t('scheduler.equalityConfig.preferred')}</Text>
                                <Select
                                    mode="multiple"
                                    style={{ width: '100%', marginTop: 4 }}
                                    placeholder={t('common.select')}
                                    value={equalityConfig.preferredPersonIds}
                                    onChange={(vals) => setEqualityConfig({ ...equalityConfig, preferredPersonIds: vals })}
                                >
                                    {staff.map(p => (
                                        <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    )}
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

            {/* Timeout / Strict Rules Modal - Custom Footer for Button Order */}
            <Modal
                title={t('scheduler.timeoutOrStrict')}
                open={isTimeoutModalOpen}
                onCancel={() => setIsTimeoutModalOpen(false)}
                footer={[
                    // Custom order: Yes (Evet) first, then No (Hayır)
                    <Button key="yes" type="primary" onClick={() => runGeneration(true)}>
                        {t('common.yes')}
                    </Button>,
                    <Button key="no" onClick={() => setIsTimeoutModalOpen(false)}>
                        {t('common.no')}
                    </Button>
                ]}
            >
                <p>{t('scheduler.timeoutDesc')}</p>
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
