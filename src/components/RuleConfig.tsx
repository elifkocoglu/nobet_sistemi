import React from 'react';
import { Card, Switch, Select, Typography, Alert, InputNumber, Form, Input, Button, Space } from 'antd';
import { useApp } from '../context/AppContext';
import { CheckOutlined, CloseOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { IPerson } from '../engine/types';

const { Text, Title } = Typography;
const { Option } = Select;

const RuleConfig: React.FC = () => {
    const { t } = useTranslation();
    const {
        rulesConfig,
        updateRuleConfig,
        currentStaff: staff
    } = useApp();

    const ruleDefinitions = [
        { id: 'availability', title: t('rules.availability.title'), description: t('rules.availability.desc') },
        { id: 'no-consecutive', title: t('rules.noConsecutive.title'), description: t('rules.noConsecutive.desc') },
        { id: 'skill-match', title: t('rules.skillMatch.title'), description: t('rules.skillMatch.desc') },
        { id: 'weekend-exclusion', title: t('rules.weekendExclusion.title'), description: t('rules.weekendExclusion.desc') },
        { id: 'specific-date-permit', title: t('rules.specificDatePermit.title'), description: t('rules.specificDatePermit.desc') },
        { id: 'shift-type', title: t('rules.shiftTypePreference.title'), description: t('rules.shiftTypePreference.desc') },
        { id: 'every-other-day-limit', title: t('rules.everyOtherDayLimit.title'), description: t('rules.everyOtherDayLimit.desc') },
        { id: 'group-quota', title: t('rules.groupQuota.title'), description: t('rules.groupQuota.desc') },
    ];

    const handleToggle = (id: string, checked: boolean) => {
        updateRuleConfig(id, { isActive: checked });
    };

    const handleWeekendExclusionChange = (values: string[]) => {
        updateRuleConfig('weekend-exclusion', { excludedPersonIds: values });
    };

    const handleShiftTypeChange = (values: string[]) => {
        updateRuleConfig('shift-type', { mesaiPersonIds: values });
    };

    const handleGlobalLimitChange = (value: number | null) => {
        if (value !== null) {
            updateRuleConfig('every-other-day-limit', { everyOtherDayLimit: value });
        }
    };

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100%' }}>
            <Title level={4} style={{ marginBottom: 24 }}>{t('rules.title')}</Title>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {ruleDefinitions.map(rule => (
                    <Card
                        key={rule.id}
                        title={rule.title}
                        extra={
                            <Switch
                                checkedChildren={<CheckOutlined />}
                                unCheckedChildren={<CloseOutlined />}
                                checked={rulesConfig[rule.id]?.isActive}
                                onChange={(checked) => handleToggle(rule.id, checked)}
                            />
                        }
                        hoverable
                    >
                        <p style={{ minHeight: '40px', color: '#666' }}>{rule.description}</p>

                        {/* Special UI for Weekend Exclusion */}
                        {rule.id === 'weekend-exclusion' && rulesConfig['weekend-exclusion']?.isActive && (
                            <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('rules.weekendExclusion.selectStaff')}</Text>
                                <Select
                                    mode="multiple"
                                    style={{ width: '100%' }}
                                    placeholder={t('common.select')}
                                    value={rulesConfig['weekend-exclusion'].excludedPersonIds}
                                    onChange={handleWeekendExclusionChange}
                                >
                                    {staff.map((person: IPerson) => (
                                        <Option key={person.id} value={person.id}>{person.name}</Option>
                                    ))}
                                </Select>
                            </div>
                        )}

                        {/* Special UI for Shift Type (Mesai) */}
                        {rule.id === 'shift-type' && rulesConfig['shift-type']?.isActive && (
                            <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('rules.shiftTypePreference.selectMesai')}</Text>
                                <Select
                                    mode="multiple"
                                    style={{ width: '100%' }}
                                    placeholder={t('common.select')}
                                    value={rulesConfig['shift-type'].mesaiPersonIds}
                                    onChange={handleShiftTypeChange}
                                >
                                    {staff.map((person: IPerson) => (
                                        <Option key={person.id} value={person.id}>{person.name}</Option>
                                    ))}
                                </Select>
                                <Alert
                                    message={t('rules.shiftTypePreference.mesaiInfo')}
                                    type="info"
                                    showIcon
                                    style={{ marginTop: 12 }}
                                />
                            </div>
                        )}

                        {/* Special UI for Every Other Day Limit */}
                        {rule.id === 'every-other-day-limit' && rulesConfig['every-other-day-limit']?.isActive && (
                            <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
                                <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('rules.everyOtherDayLimit.globalLimit')}</Text>
                                <InputNumber
                                    min={1}
                                    max={10}
                                    value={rulesConfig['every-other-day-limit'].everyOtherDayLimit || 5}
                                    onChange={handleGlobalLimitChange}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        )}
                        {/* Special UI for Group Quota */}
                        {rule.id === 'group-quota' && rulesConfig['group-quota']?.isActive && (
                            <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
                                <Form
                                    layout="vertical"
                                    initialValues={{ groupQuotas: rulesConfig['group-quota'].groupQuotas || [] }}
                                    onValuesChange={(_, allValues) => {
                                        updateRuleConfig('group-quota', { groupQuotas: allValues.groupQuotas });
                                    }}
                                >
                                    <Form.List name="groupQuotas">
                                        {(fields, { add, remove }) => (
                                            <>
                                                {fields.map(({ key, name, ...restField }) => (
                                                    <Card key={key} size="small" style={{ marginBottom: 12, border: '1px solid #d9d9d9' }}>
                                                        <Space align="baseline" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'id']}
                                                                label={t('rules.groupQuota.groupName')}
                                                                rules={[{ required: true }]}
                                                            >
                                                                <Input style={{ width: 140 }} />
                                                            </Form.Item>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'maxShifts']}
                                                                label={t('rules.groupQuota.maxShifts')}
                                                                rules={[{ required: true }]}
                                                            >
                                                                <InputNumber min={1} style={{ width: 80 }} />
                                                            </Form.Item>
                                                            <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red' }} />
                                                        </Space>

                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'personIds']}
                                                            label={t('rules.groupQuota.selectFiles')}
                                                            rules={[{ required: true }]}
                                                        >
                                                            <Select mode="multiple" style={{ width: '100%' }}>
                                                                {staff.map((p: IPerson) => (
                                                                    <Option key={p.id} value={p.id}>{p.name}</Option>
                                                                ))}
                                                            </Select>
                                                        </Form.Item>
                                                    </Card>
                                                ))}
                                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                                    {t('rules.groupQuota.addGroup')}
                                                </Button>
                                            </>
                                        )}
                                    </Form.List>
                                </Form>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default RuleConfig;
