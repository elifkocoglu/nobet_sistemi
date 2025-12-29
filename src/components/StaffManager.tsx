import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Typography, Popconfirm, DatePicker, InputNumber, message } from 'antd';
import { DeleteOutlined, UserAddOutlined, PlusOutlined, MinusCircleOutlined, EditOutlined } from '@ant-design/icons';
import { useApp } from '../context/AppContext';
import type { IPerson, Role, Skill } from '../engine/types';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const StaffManager: React.FC = () => {
    const { t } = useTranslation();
    const {
        currentStaff: staff,
        addPerson,
        removePerson,
        updatePerson,
        profiles,
        activeProfileId,
        setActiveProfileId,
        addProfile,
        deleteProfile
    } = useApp();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form] = Form.useForm();

    const handleCreateProfile = () => {
        if (newProfileName.trim()) {
            addProfile(newProfileName.trim());
            setNewProfileName('');
            setIsProfileModalVisible(false);
            message.success(t('common.success', 'Success'));
        }
    };

    const handleDeleteProfile = (id: string) => {
        deleteProfile(id);
        message.success(t('common.deleted', 'Deleted'));
    };

    const openAddModal = () => {
        setEditingId(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const openEditModal = (record: IPerson) => {
        setEditingId(record.id);
        const permitRanges = record.permitRanges?.map(r => [dayjs(r.start), dayjs(r.end)]) || [];
        form.setFieldsValue({
            ...record,
            permitRanges
        });
        setIsModalVisible(true);
    };

    const handleFinish = (values: any) => {
        // Handle RangePicker values (Array of Arrays)
        const rawRanges = values.permitRanges || [];
        const permitRanges = rawRanges.map((range: any) => {
            if (!range || !range[0] || !range[1]) return null;
            return {
                start: range[0]?.toISOString(),
                end: range[1]?.toISOString()
            };
        }).filter(Boolean);

        const personData: IPerson = {
            id: editingId || uuidv4(),
            name: values.name,
            roles: values.roles,
            skills: values.skills,
            availability: { unavailableDates: [] }, // Keep existing? For MVP we overwrite or just init empty if new.
            // If editing, we shouldn't wipe availability if we had a separate UI for it. 
            // Since availability is not in this form, let's try to preserve it if editing.
            permitRanges: permitRanges,
            preferredShiftType: values.preferredShiftType || '24h', // Default
            customEveryOtherDayLimit: values.customEveryOtherDayLimit,
            minShifts: values.minShifts,
            maxShifts: values.maxShifts,
            exactShifts: values.exactShifts
        };

        if (editingId) {
            // Preserve availability if existing used logic not shown here
            const existing = staff.find(p => p.id === editingId);
            if (existing) {
                personData.availability = existing.availability;
            }
            updatePerson(personData);
        } else {
            addPerson(personData);
        }

        setIsModalVisible(false);
        form.resetFields();
    };

    const columns = [
        {
            title: t('staff.name'),
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: t('staff.roles'),
            dataIndex: 'roles',
            key: 'roles',
            render: (roles: Role[]) => (
                <>
                    {roles.map(role => {
                        let color = 'blue';
                        if (role === 'Doctor') color = 'volcano';
                        if (role === 'Nurse') color = 'green';
                        return (
                            <Tag color={color} key={role}>
                                {t(`staff.rolesList.${role}`)}
                            </Tag>
                        );
                    })}
                </>
            ),
        },
        {
            title: t('staff.skills'),
            dataIndex: 'skills',
            key: 'skills',
            render: (skills: Skill[]) => (
                <>
                    {skills.map(skill => (
                        <Tag color="purple" key={skill}>
                            {skill}
                        </Tag>
                    ))}
                </>
            ),
        },
        {
            title: t('staff.permits'),
            dataIndex: 'permitRanges',
            key: 'permitRanges',
            render: (ranges: { start: string; end: string }[] | undefined) => (
                <>
                    {ranges && ranges.map((range, idx) => (
                        <Tag key={idx} color="orange">
                            {dayjs(range.start).format('DD/MM')} - {dayjs(range.end).format('DD/MM')}
                        </Tag>
                    ))}
                </>
            )
        },
        {
            title: t('rules.everyOtherDayLimit.title'),
            dataIndex: 'customEveryOtherDayLimit',
            key: 'customEveryOtherDayLimit',
            render: (val: number | undefined) => val ? val : <span style={{ color: '#ccc' }}>Global</span>
        },
        {
            title: t('common.actions'),
            key: 'action',
            render: (_: any, record: IPerson) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
                    <Popconfirm
                        title={t('staff.confirmDelete')}
                        onConfirm={() => removePerson(record.id)}
                        okText={t('common.yes')}
                        cancelText={t('common.no')}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const roleOptions: Role[] = ['Doctor', 'Nurse', 'Technician'];
    const predefinedSkills: Skill[] = ['X-Ray', 'Tomography', 'MRI', 'Ultrasound', 'General'];

    return (
        <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>

            {/* Profile Selector */}
            <div style={{ marginBottom: 24, padding: 16, border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                        <Typography.Text strong>{t('staff.selectProfile', 'Staff List:')}</Typography.Text>
                        <Select
                            style={{ width: 200 }}
                            value={activeProfileId}
                            onChange={setActiveProfileId}
                            placeholder={t('staff.selectProfilePlaceholder', 'Select a list...')}
                            options={profiles.map(p => ({ label: p.name, value: p.id }))}
                        />
                        <Button icon={<PlusOutlined />} onClick={() => setIsProfileModalVisible(true)}>
                            {t('staff.newProfile', 'New List')}
                        </Button>
                    </Space>
                    {activeProfileId && (
                        <Popconfirm
                            title={t('staff.deleteProfileConfirm', 'Delete this entire list?')}
                            onConfirm={() => handleDeleteProfile(activeProfileId)}
                            okText={t('common.yes')}
                            cancelText={t('common.no')}
                        >
                            <Button danger type="text" icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>{t('staff.title')}</Title>
                <Button type="primary" icon={<UserAddOutlined />} onClick={openAddModal} disabled={!activeProfileId}>
                    {t('staff.addStaff')}
                </Button>
            </div>

            <Table dataSource={staff} columns={columns} rowKey="id" pagination={false} locale={{ emptyText: !activeProfileId ? 'Please select or create a staff list.' : 'No staff found.' }} />

            <Modal
                title={t('staff.newProfile')}
                open={isProfileModalVisible}
                onCancel={() => setIsProfileModalVisible(false)}
                onOk={handleCreateProfile}
            >
                <Input
                    placeholder="List Name (e.g., Emergency Team)"
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                />
            </Modal>

            <Modal
                title={editingId ? t('staff.editStaff') : t('staff.addStaff')}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                    <Form.Item name="name" label={t('staff.name')} rules={[{ required: true, message: 'Please enter name' }]}>
                        <Input placeholder={t('staff.placeholders.name')} />
                    </Form.Item>

                    <Form.Item name="roles" label={t('staff.roles')} rules={[{ required: true, message: 'Please select at least one role' }]}>
                        <Select
                            mode="multiple"
                            placeholder={t('staff.placeholders.roles')}
                            onSelect={() => {
                                // Auto-close dropdown after selection as requested
                                if (document.activeElement instanceof HTMLElement) {
                                    document.activeElement.blur();
                                }
                            }}
                        >
                            {roleOptions.map(role => (
                                <Option key={role} value={role}>{t(`staff.rolesList.${role}`)}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="skills" label={t('staff.skills')} rules={[{ required: true, message: 'Please add skills' }]}>
                        <Select
                            mode="tags"
                            style={{ width: '100%' }}
                            placeholder={t('staff.placeholders.skills')}
                            tokenSeparators={[',']}
                            onSelect={() => {
                                // Hack to close dropdown after select if desired, but for multiple tags it's usually better to keep open.
                                // User requested: "ensure the dropdown closes immediately after a skill is selected."
                                // We can use a ref or document.activeElement.blur()
                                if (document.activeElement instanceof HTMLElement) {
                                    document.activeElement.blur();
                                }
                            }}
                        >
                            {predefinedSkills.map(skill => (
                                <Option key={skill} value={skill}>{skill}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <div style={{ marginBottom: 8 }}>{t('staff.permits')}</div>
                    <Form.List name="permitRanges">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name]} // The array contains Moment/Dayjs ranges directly? No, Form.List works on objects usually?
                                        // Actually with RangePicker it returns [start, end].
                                        // So if `permitRanges` is `[[s,e], [s,e]]`.
                                        // Let's check how AntD handles array of ranges.
                                        // We probably need to map these to objects if we want complex structure,
                                        // but for simple list of ranges, just `name={[name]}` works if the list is `values.permitRanges`.
                                        // However, `handleAdd` parses these.
                                        >
                                            <RangePicker style={{ width: 250 }} />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        {t('common.add')}
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>

                    <Form.Item label={t('staff.quotas', 'Quotas / Limits')} style={{ marginBottom: 0 }}>
                        <Space style={{ display: 'flex', width: '100%' }} align="baseline">
                            <Form.Item name="minShifts" label={t('staff.minShifts', 'Min Shifts')}>
                                <InputNumber min={0} placeholder="Min" />
                            </Form.Item>
                            <Form.Item name="maxShifts" label={t('staff.maxShifts', 'Max Shifts')}>
                                <InputNumber min={0} placeholder="Max" />
                            </Form.Item>
                            <Form.Item name="exactShifts" label={t('staff.exactShifts', 'Exact Shifts')}>
                                <InputNumber min={0} placeholder="Exact" />
                            </Form.Item>
                        </Space>
                    </Form.Item>

                    <Form.Item name="customEveryOtherDayLimit" label={t('rules.everyOtherDayLimit.title')}>
                        <InputNumber min={1} max={15} style={{ width: '100%' }} placeholder="Optional Override" />
                    </Form.Item>

                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => setIsModalVisible(false)}>{t('common.cancel')}</Button>
                            <Button type="primary" htmlType="submit">{t('common.add')}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default StaffManager;
