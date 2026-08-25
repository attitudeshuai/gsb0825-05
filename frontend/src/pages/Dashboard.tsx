import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Card, Tag, Table, Button, Statistic } from '@arco-design/web-react';
import {
  IconUserGroup,
  IconStorage,
  IconFile,
  IconRight,
  IconArrowUp,
} from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { dashboardApi } from '../services/api';
import { DashboardStats, Tenant, Bill } from '../types';

const { Row, Col } = Grid;

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getOverview();
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { className: string; text: string }> = {
      active: { className: 'status-tag-active', text: '启用' },
      inactive: { className: 'status-tag-inactive', text: '禁用' },
      suspended: { className: 'status-tag-suspended', text: '暂停' },
      pending: { className: 'status-tag-pending', text: '待支付' },
      paid: { className: 'status-tag-paid', text: '已支付' },
      overdue: { className: 'status-tag-overdue', text: '已逾期' },
      cancelled: { className: 'status-tag-cancelled', text: '已取消' },
    };
    const config = statusMap[status] || statusMap.inactive;
    return (
      <Tag className={config.className} color="default">
        {config.text}
      </Tag>
    );
  };

  const tenantColumns = [
    {
      title: '租户名称',
      dataIndex: 'name',
      render: (val: string, record: Tenant) => (
        <span
          style={{ color: '#165dff', cursor: 'pointer' }}
          onClick={() => navigate(`/tenants/${record.id}`)}
        >
          {val}
        </span>
      ),
    },
    {
      title: '套餐',
      dataIndex: 'plan',
      render: (_: any, record: Tenant) => record.plan?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (val: string) => getStatusTag(val),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD'),
    },
  ];

  const billColumns = [
    {
      title: '账单编号',
      dataIndex: 'id',
      render: (val: number) => `#${String(val).padStart(6, '0')}`,
    },
    {
      title: '租户',
      dataIndex: 'tenant',
      render: (_: any, record: Bill) => record.tenant?.name || '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (val: number) => `¥${val.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (val: string) => getStatusTag(val),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD'),
    },
  ];

  const statCards = [
    {
      title: '总租户',
      value: stats?.tenants.total || 0,
      trend: stats?.tenants.newThisMonth || 0,
      icon: <IconUserGroup />,
      iconBg: '#e6edff',
      iconColor: '#165dff',
      onClick: () => navigate('/tenants'),
    },
    {
      title: '活跃租户',
      value: stats?.tenants.active || 0,
      icon: <IconUserGroup />,
      iconBg: '#e8ffea',
      iconColor: '#00b42a',
      onClick: () => navigate('/tenants'),
    },
    {
      title: '套餐数',
      value: stats?.plans.total || 0,
      icon: <IconStorage />,
      iconBg: '#fff7e8',
      iconColor: '#ff7d00',
      onClick: () => navigate('/plans'),
    },
    {
      title: '已收金额',
      value: `¥${(stats?.bills.amount.paid || 0).toFixed(2)}`,
      icon: <IconFile />,
      iconBg: '#ffece8',
      iconColor: '#f53f3f',
      onClick: () => navigate('/bills'),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">仪表盘</h2>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        {statCards.map((card, index) => (
          <Col span={6} key={index}>
            <Card
              className="stat-card"
              style={{ cursor: 'pointer' }}
              onClick={card.onClick}
            >
              <div
                className="stat-card-icon"
                style={{ background: card.iconBg, color: card.iconColor }}
              >
                {card.icon}
              </div>
              <div className="stat-card-title">{card.title}</div>
              <div className="stat-card-value">{card.value}</div>
              {card.trend !== undefined && (
                <div className="stat-card-trend" style={{ color: '#00b42a' }}>
                  <IconArrowUp /> 本月新增 {card.trend} 个
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <div className="content-card">
            <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>套餐收入分布</span>
              <Button
                type="text"
                size="small"
                onClick={() => navigate('/plans')}
              >
                查看全部 <IconRight />
              </Button>
            </div>
            {stats?.planRevenue.map((item, index) => (
              <div
                key={item.planId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: index < stats.planRevenue.length - 1 ? '1px solid #e5e6eb' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                    {item.planName}
                  </div>
                  <div style={{ color: '#86909c', fontSize: '12px' }}>
                    {item.tenantCount} 个租户
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#165dff' }}>
                    ¥{item.monthlyRevenue.toFixed(2)}
                  </div>
                  <div style={{ color: '#86909c', fontSize: '12px' }}>
                    月收入
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Col>

        <Col span={10}>
          <div className="content-card">
            <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>账单统计</span>
              <Button
                type="text"
                size="small"
                onClick={() => navigate('/bills')}
              >
                查看全部 <IconRight />
              </Button>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="总金额"
                  value={`¥${(stats?.bills.amount.total || 0).toFixed(2)}`}
                  style={{ marginBottom: '16px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="待支付"
                  value={`¥${(stats?.bills.amount.pending || 0).toFixed(2)}`}
                  style={{ color: '#ff7d00' }}
                />
              </Col>
            </Row>
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e6eb' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="总账单"
                    value={stats?.bills.count.total || 0}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="已支付"
                    value={stats?.bills.count.paid || 0}
                    style={{ color: '#00b42a' }}
                  />
                </Col>
              </Row>
            </div>
          </div>
        </Col>
      </Row>

      <div className="content-card" style={{ marginTop: '24px' }}>
        <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>最近租户</span>
          <Button
            type="text"
            size="small"
            onClick={() => navigate('/tenants')}
          >
            查看全部 <IconRight />
          </Button>
        </div>
        <Table
          loading={loading}
          columns={tenantColumns}
          data={stats?.recentTenants || []}
          pagination={false}
          border={false}
        />
      </div>

      <div className="content-card">
        <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>最近账单</span>
          <Button
            type="text"
            size="small"
            onClick={() => navigate('/bills')}
          >
            查看全部 <IconRight />
          </Button>
        </div>
        <Table
          loading={loading}
          columns={billColumns}
          data={stats?.recentBills || []}
          pagination={false}
          border={false}
        />
      </div>
    </div>
  );
}

export default Dashboard;
