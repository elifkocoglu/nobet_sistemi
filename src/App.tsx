import React from 'react';
import { Layout, theme, Tabs, Button, Space } from 'antd';
import { UserOutlined, SettingOutlined, CalendarOutlined, GlobalOutlined, AppstoreOutlined } from '@ant-design/icons';
import { AppProvider, useApp } from './context/AppContext';
import StaffManager from './components/StaffManager';
import RuleConfig from './components/RuleConfig';
import DepartmentConfig from './components/DepartmentConfig';
import Scheduler from './components/Scheduler';
import SetupWizard from './components/SetupWizard';
import './App.css';
import './i18n'; // Import i18n initialization
import { useTranslation } from 'react-i18next';

const { Header, Content, Footer } = Layout;

// Separate component to use Context
const AppContent: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isSetupComplete } = useApp();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const items = [
    {
      key: '1',
      label: t('app.staffManagement'),
      children: <StaffManager />,
      icon: <UserOutlined />,
    },
    {
      key: '2',
      label: t('app.ruleConfig'),
      children: <RuleConfig />,
      icon: <SettingOutlined />,
    },
    {
      key: '3',
      label: t('departments.title'),
      children: <DepartmentConfig />,
      icon: <AppstoreOutlined />,
    },
    {
      key: '4',
      label: t('app.schedule'),
      children: <Scheduler />,
      icon: <CalendarOutlined />,
    },
  ];

  if (!isSetupComplete) {
    return <SetupWizard />;
  }

  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div className="demo-logo" style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
          {t('app.title')}
        </div>
        <Space>
          <GlobalOutlined style={{ color: 'white' }} />
          <Button
            type={i18n.language === 'tr' ? 'primary' : 'default'}
            size="small"
            onClick={() => changeLanguage('tr')}
          >
            TR
          </Button>
          <Button
            type={i18n.language === 'en' ? 'primary' : 'default'}
            size="small"
            onClick={() => changeLanguage('en')}
          >
            EN
          </Button>
        </Space>
      </Header>
      <Content style={{ padding: '24px', flex: 1 }}>
        <div
          style={{
            background: colorBgContainer,
            minHeight: 280,
            padding: 24,
            borderRadius: borderRadiusLG,
            // height: '100%' // Removed to allow natural growth and avoid inner scrollbars
          }}
        >
          <Tabs defaultActiveKey="1" items={items} />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        {t('app.footer', { year: new Date().getFullYear() })}
      </Footer>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
