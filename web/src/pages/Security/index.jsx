import React, { useEffect, useState } from 'react';
import { Layout, TabPane, Tabs } from '@douyinfe/semi-ui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Bell, FileText } from 'lucide-react';

import DangerousKeywords from './components/DangerousKeywords';
import SecurityNotification from './components/SecurityNotification';
import SecurityAuditLog from './components/SecurityAuditLog';

const Security = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [tabActiveKey, setTabActiveKey] = useState('keywords');

  const panes = [
    {
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ShieldAlert size={18} />
          {t('危险关键词')}
        </span>
      ),
      content: <DangerousKeywords />,
      itemKey: 'keywords',
    },
    {
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Bell size={18} />
          {t('通知配置')}
        </span>
      ),
      content: <SecurityNotification />,
      itemKey: 'notification',
    },
    {
      tab: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <FileText size={18} />
          {t('安全审计日志')}
        </span>
      ),
      content: <SecurityAuditLog />,
      itemKey: 'audit',
    },
  ];

  const onChangeTab = (key) => {
    setTabActiveKey(key);
    navigate(`?tab=${key}`);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setTabActiveKey(tab);
    }
  }, [location.search]);

  return (
    <div className='mt-[60px] px-2'>
      <Layout>
        <Layout.Content>
          <Tabs
            type='card'
            collapsible
            activeKey={tabActiveKey}
            onChange={(key) => onChangeTab(key)}
          >
            {panes.map((pane) => (
              <TabPane itemKey={pane.itemKey} tab={pane.tab} key={pane.itemKey}>
                {tabActiveKey === pane.itemKey && pane.content}
              </TabPane>
            ))}
          </Tabs>
        </Layout.Content>
      </Layout>
    </div>
  );
};

export default Security;
