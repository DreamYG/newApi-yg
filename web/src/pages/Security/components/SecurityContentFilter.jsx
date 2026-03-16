import React, { useEffect, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Col,
  Form,
  Row,
  Spin,
  Tag,
  Toast,
  Card,
} from '@douyinfe/semi-ui';
import { ShieldAlert, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../../../helpers/api';
import { isRoot } from '../../../helpers';

/**
 * Tab 2：内容过滤词管理
 * 顶部展示"屏蔽词 vs 危险关键词"对比说明，
 * 下方内嵌屏蔽词管理功能（复用 SettingsSensitiveWords 的逻辑）。
 */
const SecurityContentFilter = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const canEdit = isRoot();
  const [inputs, setInputs] = useState({
    CheckSensitiveEnabled: false,
    CheckSensitiveOnPromptEnabled: false,
    StopOnSensitiveEnabled: false,
    SensitiveWords: '',
  });
  const refForm = useRef();

  useEffect(() => {
    if (!canEdit) return;
    const fetchOptions = async () => {
      setLoading(true);
      try {
        const res = await API.get('/api/option/');
        if (res.data.success) {
          const data = res.data.data || {};
          setInputs({
            CheckSensitiveEnabled: data.CheckSensitiveEnabled === 'true',
            CheckSensitiveOnPromptEnabled: data.CheckSensitiveOnPromptEnabled === 'true',
            StopOnSensitiveEnabled: data.StopOnSensitiveEnabled === 'true',
            SensitiveWords: data.SensitiveWords || '',
          });
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };
    fetchOptions();
  }, [canEdit]);

  const onSubmit = async () => {
    const formValues = refForm.current.getValues();
    setLoading(true);
    try {
      const res = await API.put('/api/option/', {
        CheckSensitiveEnabled: String(formValues.CheckSensitiveEnabled),
        CheckSensitiveOnPromptEnabled: String(formValues.CheckSensitiveOnPromptEnabled),
        StopOnSensitiveEnabled: String(formValues.StopOnSensitiveEnabled),
        SensitiveWords: formValues.SensitiveWords || '',
      });
      if (res.data.success) {
        Toast.success(t('保存成功'));
      } else {
        Toast.error(res.data.message || t('保存失败'));
      }
    } catch {
      Toast.error(t('保存失败'));
    }
    setLoading(false);
  };

  return (
    <div>
      {/* 对比说明 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} md={12}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={16} />
                {t('屏蔽词（敏感词）')}
              </span>
            }
            style={{ height: '100%' }}
          >
            <p>{t('触发后果')}：<Tag color='orange'>{t('拦截本次请求')}</Tag></p>
            <p>{t('通知管理员')}：<Tag color='grey'>{t('不通知')}</Tag></p>
            <p>{t('适用场景')}：{t('防止不当内容或违规用语发送给模型')}</p>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={16} />
                {t('危险关键词')}
              </span>
            }
            style={{ height: '100%' }}
          >
            <p>{t('触发后果')}：<Tag color='red'>{t('禁用用户 + 拦截请求')}</Tag></p>
            <p>{t('通知管理员')}：<Tag color='green'>{t('即时推送通知')}</Tag></p>
            <p>{t('适用场景')}：{t('防止公司机密、敏感数据泄露到外部模型')}</p>
          </Card>
        </Col>
      </Row>

      <Banner
        type='info'
        description={t('如需触发后自动禁用用户，请在「危险关键词」标签页中配置。以下屏蔽词仅拦截请求，不会禁用用户。')}
        style={{ marginBottom: 16 }}
      />

      {/* 内嵌屏蔽词管理（需要 root 权限） */}
      {!canEdit ? (
        <Banner
          type='warning'
          description={t('屏蔽词设置需要超级管理员权限，请联系超级管理员进行配置。')}
        />
      ) : (
        <Spin spinning={loading}>
          <Form
            values={inputs}
            getFormApi={(formAPI) => (refForm.current = formAPI)}
            style={{ marginBottom: 15 }}
          >
            <Form.Section text={t('屏蔽词过滤设置')}>
              <Row gutter={16}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Switch
                    field='CheckSensitiveEnabled'
                    label={t('启用屏蔽词过滤')}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Switch
                    field='CheckSensitiveOnPromptEnabled'
                    label={t('启用 Prompt 检查')}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Switch
                    field='StopOnSensitiveEnabled'
                    label={t('检测到后立即停止（否则替换为 **###**）')}
                  />
                </Col>
              </Row>
              <Row>
                <Col xs={24} sm={16} md={12}>
                  <Form.TextArea
                    label={t('屏蔽词列表（每行一个）')}
                    field='SensitiveWords'
                    autosize={{ minRows: 6, maxRows: 16 }}
                    placeholder={t('每行输入一个屏蔽词')}
                  />
                </Col>
              </Row>
              <Row>
                <Button size='default' theme='solid' onClick={onSubmit}>
                  {t('保存屏蔽词过滤设置')}
                </Button>
              </Row>
            </Form.Section>
          </Form>
        </Spin>
      )}
    </div>
  );
};

export default SecurityContentFilter;
