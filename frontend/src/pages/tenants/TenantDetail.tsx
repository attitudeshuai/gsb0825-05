import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Tag,
  Table,
  Descriptions,
  Grid,
  Statistic,
} from '@arco-design/web-react';
import { IconLeft, IconEdit, IconFile } from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { tenantApi } from '../../services/api';
import { Tenant, Bill, TenantUser } from '../../types';

const { Row, Col } = Grid;

function TenantDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTenantDetail(+id);
    }
  }, [id]);

  const fetchTenantDetail = async (tenantId: number) => {
    try {
      setLoading(true);
      const data = await tenantApi.getById(tenantId);
      setTenant(data);
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

  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
    },
    {
      title: '角色',
      dataIndex: 'role',
      render: (val: string) => (
        <Tag color={val === 'admin' ? 'blue' : 'gray'}>
          {val === 'admin' ? '管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (val: string) => getStatusTag(val),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const billColumns = [
    {
      title: '账单编号',
      dataIndex: 'id',
      render: (val: number) => `#${String(val).padStart(6, '0')}`,
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
      title: '账单日期',
      dataIndex: 'billDate',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD'),
    },
    {
      title: '到期日期',
      dataIndex: 'dueDate',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      render: (_: any, record: Bill) => (
        <Button
          type="text"
          size="small"
          icon={<IconFile />}
          onClick={() => navigate(`/bills/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  const featuresList = tenant?.plan?.features
    ? Object.entries(tenant.plan.features)
        .filter(([, value]) => value === true)
        .map(([key]) => {
          const featureMap: Record<string, string> = {
            userManagement: '用户管理',
            basicReport: '基础报表',
            advancedReport: '高级报表',
            emailSupport: '邮件支持',
            phoneSupport: '电话支持',
            customDomain: '自定义域名',
            apiAccess: 'API 访问',
            ssoIntegration: 'SSO 集成',
            dedicatedAccountManager: '专属客户经理',
          };
          return featureMap[key] || key;
        })
    : [];

  if (!tenant) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button
            type="text"
            icon={<IconLeft />}
            onClick={() => navigate('/tenants')}
          >
            返回
          </Button>
          <h2 className="page-title">租户详情 - {tenant.name}</h2>
          {getStatusTag(tenant.status)}
        </div>
        <Button
          type="primary"
          icon={<IconEdit />}
          onClick={() => navigate('/tenants')}
        >
          编辑
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="套餐"
              value={tenant.plan.name}
              suffix={`- ¥${tenant.plan.price}/月`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="用户数" value={tenant.tenantUsers?.length || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="账单数" value={tenant.bills?.length || 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="创建时间"
              value={dayjs(tenant.createdAt).format('YYYY-MM-DD')}
            />
          </Card>
        </Col>
      </Row>

      <div className="content-card">
        <div className="detail-section-title">基本信息</div>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">租户名称：</span>
            <span className="detail-value">{tenant.name}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">租户编码：</span>
            <span className="detail-value">{tenant.code}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">联系人：</span>
            <span className="detail-value">{tenant.contactName}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">联系邮箱：</span>
            <span className="detail-value">{tenant.contactEmail}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">联系电话：</span>
            <span className="detail-value">{tenant.contactPhone || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">地址：</span>
            <span className="detail-value">{tenant.address || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">当前套餐：</span>
            <span className="detail-value">
              {tenant.plan.name} - ¥{tenant.plan.price}/月
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">最大用户数：</span>
            <span className="detail-value">{tenant.plan.maxUsers} 人</span>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="detail-section-title">套餐功能</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {featuresList.map((feature, index) => (
            <Tag key={index} color="green">
              ✓ {feature}
            </Tag>
          ))}
          {featuresList.length === 0 && (
            <span style={{ color: '#86909c' }}>暂无功能配置</span>
          )}
        </div>
      </div>

      <div className="content-card">
        <div className="detail-section-title">用户列表</div>
        <Table
          loading={loading}
          columns={userColumns}
          data={tenant.tenantUsers || []}
          pagination={false}
          border={false}
        />
      </div>

      <div className="content-card">
        <div className="detail-section-title">最近账单</div>
        <Table
          loading={loading}
          columns={billColumns}
          data={tenant.bills || []}
          pagination={false}
          border={false}
        />
      </div>
    </div>
  );
}

export default TenantDetail;
