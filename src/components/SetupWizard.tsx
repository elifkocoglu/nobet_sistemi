import React, { useState } from 'react';
import { Button, Steps, Typography, Card, Result } from 'antd';
import { SmileOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import StaffManager from './StaffManager';
import { useApp } from '../context/AppContext';

const { Title, Paragraph } = Typography;

const SetupWizard: React.FC = () => {
    const { t } = useTranslation();
    const { currentStaff: staff, completeSetup } = useApp();
    const [currentStep, setCurrentStep] = useState(0);

    const next = () => setCurrentStep(currentStep + 1);
    const prev = () => setCurrentStep(currentStep - 1);

    const steps = [
        {
            title: t('wizard.welcome.title', 'Welcome'),
            content: (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <SmileOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 20 }} />
                    <Title level={3}>{t('wizard.welcome.headline', 'Welcome to Smart Scheduler')}</Title>
                    <Paragraph>{t('wizard.welcome.desc', 'Let\'s get you set up. First, we need to create your staff list.')}</Paragraph>
                </div>
            )
        },
        {
            title: t('wizard.staff.title', 'Add Staff'),
            content: (
                <div>
                    <Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 20 }}>
                        {t('wizard.staff.desc', 'Please add at least 3 staff members to proceed.')}
                    </Paragraph>
                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8 }}>
                        <StaffManager />
                    </div>
                </div>
            )
        },
        {
            title: t('wizard.finish.title', 'Finish'),
            content: (
                <Result
                    icon={<CheckCircleOutlined />}
                    title={t('wizard.finish.headline', 'All Set!')}
                    subTitle={t('wizard.finish.desc', 'You are ready to start creating schedules.')}
                />
            )
        }
    ];

    const isStaffValid = staff.length >= 3;

    return (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: 20 }}>
            <Card>
                <Steps
                    current={currentStep}
                    items={steps.map(s => ({ key: s.title, title: s.title }))}
                />
                <div style={{ marginTop: 24, minHeight: 300 }}>
                    {steps[currentStep].content}
                </div>
                <div style={{ marginTop: 24, textAlign: 'right' }}>
                    {currentStep > 0 && (
                        <Button style={{ margin: '0 8px' }} onClick={() => prev()}>
                            {t('common.back', 'Back')}
                        </Button>
                    )}
                    {currentStep < steps.length - 1 && (
                        <Button type="primary" onClick={() => next()} disabled={currentStep === 1 && !isStaffValid}>
                            {t('common.next', 'Next')}
                        </Button>
                    )}
                    {currentStep === steps.length - 1 && (
                        <Button type="primary" onClick={completeSetup}>
                            {t('common.finish', 'Go to Dashboard')}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default SetupWizard;
