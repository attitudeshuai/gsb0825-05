import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Tag,
  Table,
  Grid,
  Statistic,
} from '@arco-design/web-react';
import { IconLeft, IconEdit, IconUserGroup } from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { planApi } from '../../services/api';
import { Plan, Tenant } from '../../types';

const { Row, Col } = Grid;

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

function PlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPlanDetail(+id);
    }
  }, [id]);

  const fetchPlanDetail = async (planId: number) => {
    try {
      setLoading(true);
      const data = await planApi.getById(planId);
      setPlan(data);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { className: string; text: string }> = {
      active: { className: 'status-tag-active', text: '启用' },
      inactive: { className: 'status-tag-inactive', text: '禁用' },
    };
    const config = statusMap[status] || statusMap.inactive;
    return (
      <Tag className={config.className} color="default">
        {config.text}
      </Tag>
    );
  };

  const getBillingCycleText = (cycle: string) => {
    const cycleMap: Record<string, string> = {
      monthly: '月付',
      quarterly: '季付',
      yearly: '年付',
    };
    return cycleMap[cycle] || cycle;
  };

  const featuresList = plan?.features
    ? Object.entries(plan.features)
        .filter(([, value]) => value === true)
        .map(([key]) => featureMap[key] || key)
    : [];

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
      title: '租户编码',
      dataIndex: 'code',
    },
    {
      title: '联系人',
      dataIndex: 'contactName',
    },
    {
      title: '联系邮箱',
      dataIndex: 'contactEmail',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
  ];

  if (!plan) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button
            type="text"
            icon={<IconLeft />}
            onClick={() => navigate('/plans')}
          >
            返回
          </Button>
          <h2 className="page-title">套餐详情 - {plan.name}</h2>
          {getStatusTag(plan.status)}
        </div>
        <Button
          type="primary"
          icon={<IconEdit />}
          onClick={() => navigate('/plans')}
        >
          编辑
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="价格"
              value={`¥${plan.price.toFixed(2)}`}
              suffix={`/${getBillingCycleText(plan.billingCycle)}`}
              style={{ color: '#f53f3f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="最大用户数" value={plan.maxUsers} suffix="人" />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="存储空间" value={plan.maxStorage} suffix="GB" />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="使用租户数"
              value={plan._count?.tenants || 0}
            />
          </Card>
        </Col>
      </Row>

      <div className="content-card">
        <div className="detail-section-title">套餐信息</div>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="detail-label">套餐名称：</span>
            <span className="detail-value">{plan.name}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">套餐描述：</span>
            <span className="detail-value">{plan.description || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">价格：</span>
            <span className="detail-value" style={{ color: '#f53f3f', fontWeight: 600 }}>
              ¥{plan.price.toFixed(2)}/{getBillingCycleText(plan.billingCycle)}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">计费周期：</span>
            <span className="detail-value">{getBillingCycleText(plan.billingCycle)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">最大用户数：</span>
            <span className="detail-value">{plan.maxUsers} 人</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">最大存储空间：</span>
            <span className="detail-value">{plan.maxStorage} GB</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">创建时间：</span>
            <span className="detail-value">
              {dayjs(plan.createdAt).format('YYYY-MM-DD HH:mm')}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">更新时间：</span>
            <span className="detail-value">
              {dayjs(plan.updatedAt).format('YYYY-MM-DD HH:mm')}
            </span>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="detail-section-title">功能特性</div>
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
        <div className="detail-section-title">
          <IconUserGroup style={{ marginRight: '8px' }} />
          使用此套餐的租户 ({plan._count?.tenants || 0})
        </div>
        <Table
          loading={loading}
          columns={tenantColumns}
          data={plan.tenants || []}
          pagination={false}
          border={false}
        />
      </div>
    </div>
  );
}

export default PlanDetail;
