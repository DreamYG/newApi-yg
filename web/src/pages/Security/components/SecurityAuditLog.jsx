import React, { useEffect, useState, useCallback } from 'react';
import {
  Tag,
  Space,
  Input,
  Select,
  DatePicker,
  Empty,
  Spin,
  Toast,
  Tooltip,
  Button,
  Popconfirm,
} from '@douyinfe/semi-ui';
import {
  IllustrationNoResult,
} from '@douyinfe/semi-illustrations';
import { Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../../../helpers/api';
import CardTable from '../../../components/common/ui/CardTable';

const eventTypeMap = {
  dangerous_keyword: { label: '危险关键词', color: 'red' },
  sensitive_word: { label: '敏感词', color: 'orange' },
};

const actionMap = {
  user_banned: { label: '用户已禁用', color: 'red' },
  request_blocked: { label: '请求已拦截', color: 'orange' },
  warned: { label: '告警', color: 'yellow' },
};

const SecurityAuditLog = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterUsername, setFilterUsername] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [dateRange, setDateRange] = useState([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (filterUsername) params.set('username', filterUsername);
      if (filterEventType) params.set('event_type', filterEventType);
      if (filterAction) params.set('action', filterAction);
      if (dateRange && dateRange.length === 2) {
        if (dateRange[0]) params.set('start_time', dateRange[0].toISOString());
        if (dateRange[1]) params.set('end_time', dateRange[1].toISOString());
      }

      const res = await API.get(`/api/security/audit-logs?${params}`);
      if (res.data.success) {
        setLogs(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch {
      Toast.error(t('获取审计日志失败'));
    }
    setLoading(false);
  }, [page, pageSize, filterUsername, filterEventType, filterAction, dateRange, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearLogs = async () => {
    try {
      const res = await API.delete('/api/security/audit-logs?retention_days=90');
      if (res.data.success) {
        Toast.success(t('清理完成，删除了 ') + (res.data.data?.deleted || 0) + t(' 条记录'));
        fetchLogs();
      }
    } catch {
      Toast.error(t('清理失败'));
    }
  };

  const columns = [
    {
      title: t('时间'),
      dataIndex: 'created_at',
      width: 170,
      render: (val) => {
        if (!val) return '—';
        return new Date(val).toLocaleString();
      },
    },
    {
      title: t('用户名'),
      dataIndex: 'username',
      width: 120,
    },
    {
      title: t('触发关键词'),
      dataIndex: 'trigger_keyword',
      width: 180,
      render: (text) => (
        <Tag size='small' color='red' style={{ wordBreak: 'break-all' }}>
          {text && text.length > 30 ? text.slice(0, 30) + '...' : text}
        </Tag>
      ),
    },
    {
      title: t('事件类型'),
      dataIndex: 'event_type',
      width: 120,
      render: (val) => {
        const info = eventTypeMap[val] || { label: val, color: 'grey' };
        return <Tag size='small' color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: t('执行动作'),
      dataIndex: 'action',
      width: 120,
      render: (val) => {
        const info = actionMap[val] || { label: val, color: 'grey' };
        return <Tag size='small' color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: t('请求摘要'),
      dataIndex: 'request_summary',
      width: 200,
      render: (text) => (
        <Tooltip content={text}>
          <span style={{
            display: 'inline-block',
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {text || '—'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: t('模型'),
      dataIndex: 'model_name',
      width: 130,
    },
    {
      title: t('已通知'),
      dataIndex: 'notified_admin',
      width: 70,
      align: 'center',
      render: (val) => (val ? '✓' : '—'),
    },
  ];

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <Space>
          <Input
            prefix={<Search size={14} />}
            placeholder={t('搜索用户名')}
            value={filterUsername}
            onChange={(val) => { setFilterUsername(val); setPage(1); }}
            showClear
            style={{ width: 160 }}
          />
          <Select
            placeholder={t('事件类型')}
            value={filterEventType}
            onChange={(val) => { setFilterEventType(val || ''); setPage(1); }}
            showClear
            style={{ width: 130 }}
            optionList={[
              { label: t('危险关键词'), value: 'dangerous_keyword' },
              { label: t('敏感词'), value: 'sensitive_word' },
            ]}
          />
          <Select
            placeholder={t('执行动作')}
            value={filterAction}
            onChange={(val) => { setFilterAction(val || ''); setPage(1); }}
            showClear
            style={{ width: 130 }}
            optionList={[
              { label: t('用户已禁用'), value: 'user_banned' },
              { label: t('请求已拦截'), value: 'request_blocked' },
              { label: t('告警'), value: 'warned' },
            ]}
          />
          <DatePicker
            type='dateRange'
            density='compact'
            placeholder={[t('开始时间'), t('结束时间')]}
            value={dateRange}
            onChange={(val) => { setDateRange(val || []); setPage(1); }}
            style={{ width: 260 }}
          />
        </Space>
        <Popconfirm
          title={t('确定清理 90 天前的审计日志吗？')}
          onConfirm={handleClearLogs}
        >
          <Button icon={<Trash2 size={14} />} type='danger' theme='borderless'>
            {t('清理过期日志')}
          </Button>
        </Popconfirm>
      </div>

      <Spin spinning={loading}>
        <CardTable
          columns={columns}
          dataSource={logs}
          scroll={{ x: 'max-content' }}
          pagination={{
            currentPage: page,
            pageSize: pageSize,
            total: total,
            pageSizeOpts: [10, 20, 50, 100],
            showSizeChanger: true,
            onPageSizeChange: (newSize) => { setPageSize(newSize); setPage(1); },
            onPageChange: (newPage) => setPage(newPage),
          }}
          empty={
            <Empty
              image={<IllustrationNoResult style={{ width: 150, height: 150 }} />}
              description={t('暂无安全审计日志')}
            />
          }
          size='middle'
        />
      </Spin>
    </div>
  );
};

export default SecurityAuditLog;
