import React from 'react';
import {
  Banner,
  Form,
  Row,
  Col,
  Button,
  Checkbox,
  CheckboxGroup,
  Tooltip,
} from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

/**
 * Tab 3：通知推送配置（全部预留 disabled）
 */
const SecurityNotification = () => {
  const { t } = useTranslation();

  return (
    <div>
      <Banner
        type='warning'
        description={t('通知推送功能正在开发中，以下配置界面已预留，功能将在后续版本中启用。')}
        style={{ marginBottom: 20 }}
      />

      <Form labelPosition='left' labelWidth={120}>
        <Form.Section text={t('飞书 Webhook')}>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Input
                field='feishu_webhook_url'
                label={t('Webhook URL')}
                placeholder='https://open.feishu.cn/open-apis/bot/v2/hook/xxx'
                disabled
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Switch
                field='feishu_enabled'
                label={t('启用飞书推送')}
                disabled
              />
            </Col>
            <Col xs={24} md={8}>
              <Tooltip content={t('功能即将推出')}>
                <Button disabled>{t('发送测试消息')}</Button>
              </Tooltip>
            </Col>
          </Row>
        </Form.Section>

        <Form.Section text={t('邮箱通知')}>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Input
                field='notify_email_address'
                label={t('收件邮箱')}
                placeholder='admin@company.com'
                disabled
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Switch
                field='email_enabled'
                label={t('启用邮箱通知')}
                disabled
              />
            </Col>
            <Col xs={24} md={8}>
              <Tooltip content={t('功能即将推出')}>
                <Button disabled>{t('发送测试邮件')}</Button>
              </Tooltip>
            </Col>
          </Row>
        </Form.Section>

        <Form.Section text={t('触发事件')}>
          <CheckboxGroup disabled direction='vertical' defaultValue={[]}>
            <Checkbox value='dangerous_keyword'>
              {t('检测到危险关键词时推送')}
            </Checkbox>
            <Checkbox value='user_banned'>
              {t('用户被系统自动禁用时推送')}
            </Checkbox>
            <Checkbox value='sensitive_word'>
              {t('检测到敏感词时推送告警')}
            </Checkbox>
          </CheckboxGroup>
        </Form.Section>
      </Form>
    </div>
  );
};

export default SecurityNotification;
