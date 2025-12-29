import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Space, Popconfirm, Card, Typography, Checkbox, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';
import type { IDepartment } from '../engine/types';

const { Title } = Typography;
const { Option } = Select;

const DepartmentConfig: React.FC = () => {
    const { t } = useTranslation();
    const { departments, updateDepartments } = useApp();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<IDepartment | null>(null);
    const [form] = Form.useForm();

    const handleAdd = () => {
        setEditingDepartment(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: IDepartment) => {
        setEditingDepartment(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = (id: string) => {
        updateDepartments(departments.filter(d => d.id !== id));
    };

    const handleOk = () => {
        form.validateFields().then(values => {
            // Ensure shifts is an array
            const formattedValues = {
                ...values,
                shifts: values.shifts || []
            };

            if (editingDepartment) {
                const updated = departments.map(d => d.id === editingDepartment.id ? { ...d, ...formattedValues } : d);
                updateDepartments(updated);
            } else {
                updateDepartments([...departments, { id: uuidv4(), ...formattedValues }]);
            }
            setIsModalVisible(false);
        });
    };

    const columns = [
        {
            title: t('departments.name'),
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => text
        },
        {
            title: t('departments.shifts'),
            dataIndex: 'shifts',
            key: 'shifts',
            render: (shifts: any[]) => (
                <Space direction="vertical">
                    {shifts && shifts.map((s, i) => (
                        <div key={i}>
                            <Tag color={s.type === '24h' ? 'blue' : 'orange'}>{s.type}</Tag>
                            x {s.count}
                        </div>
                    ))}
                </Space>
            )
        },
        {
            title: t('common.actions'),
            key: 'actions',
            render: (_: any, record: IDepartment) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title={t('departments.confirmDelete')} onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24, minHeight: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4}>{t('departments.title')}</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    {t('departments.add')}
                </Button>
            </div>

            <Card>
                <Table
                    dataSource={departments}
                    columns={columns}
                    rowKey="id"
                />
            </Card>

            <Modal
                title={editingDepartment ? t('departments.add') : t('departments.add')}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
                width={700}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label={t('departments.name')} rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="disableDayShiftsOnWeekends" valuePropName="checked">
                        <Checkbox>{t('departments.weekendToggle')}</Checkbox>
                    </Form.Item>

                    <Form.List name="shifts">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'type']}
                                            rules={[{ required: true, message: 'Missing type' }]}
                                        >
                                            <Select style={{ width: 120 }} placeholder={t('departments.shiftType')}>
                                                <Option value="24h">24h</Option>
                                                <Option value="day">Day (08-16)</Option>
                                                <Option value="night">Night</Option>
                                            </Select>
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'count']}
                                            rules={[{ required: true, message: 'Missing count' }]}
                                        >
                                            <InputNumber min={1} placeholder={t('departments.count')} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'requiredSkills']}
                                        >
                                            <Select mode="multiple" style={{ width: 200 }} placeholder={t('departments.skills')}>
                                                <Option value="X-Ray">X-Ray</Option>
                                                <Option value="Tomography">Tomography</Option>
                                                <Option value="MRI">MRI</Option>
                                                <Option value="Ultrasound">Ultrasound</Option>
                                                <Option value="General">General</Option>
                                            </Select>
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        {t('departments.addShift')}
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </div>
    );
};

export default DepartmentConfig;
