import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Tag,
  Table,
  Grid,
  Statistic,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Message,
  Popconfirm,
  Space,
  Alert,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconEdit,
  IconFile,
  IconPlus,
  IconClockCircle,
  IconSwap,
  IconStorage,
} from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { tenantApi, planApi } from '../../services/api';
import {
  Tenant,
  Bill,
  TenantUser,
  Plan,
  PlanChangeRecord,
} from '../../types';

const { Row, Col } = Grid;
const FormItem = Form.Item;
const Option = Select.Option;

function TenantDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tenantId = id ? +id : 0;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [userForm] = Form.useForm();

  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [extendForm] = Form.useForm();

  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [planForm] = Form.useForm();
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>();

  const [storageModalVisible, setStorageModalVisible] = useState(false);
  const [storageForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchTenantDetail(+id);
      fetchPlans();
    }
  }, [id]);

  const fetchTenantDetail = async (tid: number) => {
    try {
      setLoading(true);
      const data = await tenantApi.getById(tid);
      setTenant(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await planApi.getActiveList();
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { className: string; text: string }> = {
      active: { className: 'status-tag-active', text: '正式' },
      trial: { className: 'status-tag-pending', text: '试用中' },
      inactive: { className: 'status-tag-inactive', text: '禁用' },
      suspended: { className: 'status-tag-suspended', text: '已停用' },
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

  const suspendReasonText = (reason?: string | null) => {
    const map: Record<string, string> = {
      trial_expired: '试用到期',
      arrears: '长期欠费',
      manual: '手动停用',
    };
    return reason ? map[reason] || reason : null;
  };

  const billTypeText = (type?: string) => {
    const map: Record<string, { text: string; color: string }> = {
      subscription: { text: '订阅费', color: 'gray' },
      plan_change: { text: '套餐补差', color: 'orange' },
      manual: { text: '手动账单', color: 'purple' },
    };
    const config = map[type || 'subscription'] || map.subscription;
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const users = tenant?.tenantUsers || [];
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const maxUsers = tenant?.plan?.maxUsers || 0;
  const maxStorage = tenant?.plan?.maxStorage || 0;
  const storageUsed = tenant?.storageUsed || 0;
  const quotaReached = activeUsers >= maxUsers;
  const trialDaysLeft = tenant?.trialEndsAt
    ? dayjs(tenant.trialEndsAt).diff(dayjs(), 'day')
    : null;
  const isTrial = tenant?.status === 'trial';
  const isTrialExpiredSuspended =
    tenant?.status === 'suspended' &&
    tenant.suspendReason === 'trial_expired';
  const isArrearsSuspended =
    tenant?.status === 'suspended' && tenant.suspendReason === 'arrears';
  const canExtendTrial = isTrial || isTrialExpiredSuspended;
  const canConvertTrial = canExtendTrial;

  const handleCreateUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setUserModalVisible(true);
  };

  const handleEditUser = (user: TenantUser) => {
    setEditingUser(user);
    userForm.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setUserModalVisible(true);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await tenantApi.deleteUser(tenantId, userId);
      Message.success('用户已删除');
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleUserSubmit = async (values: any) => {
    try {
      if (editingUser) {
        const data: any = {
          email: values.email,
          role: values.role,
          status: values.status,
        };
        if (values.password) {
          data.password = values.password;
        }
        await tenantApi.updateUser(tenantId, editingUser.id, data);
        Message.success('用户更新成功');
      } else {
        await tenantApi.createUser(tenantId, values);
        Message.success('用户创建成功');
      }
      setUserModalVisible(false);
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to submit user:', error);
    }
  };

  const handleExtendTrial = async (values: any) => {
    try {
      await tenantApi.extendTrial(tenantId, values.days);
      Message.success(`试用已延长 ${values.days} 天`);
      setExtendModalVisible(false);
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to extend trial:', error);
    }
  };

  const handleConvertTrial = () => {
    Modal.confirm({
      title: '试用转正',
      content: '转正后租户将按当前套餐正常计费，试用到期时间将清空。确认转正吗？',
      onOk: async () => {
        try {
          await tenantApi.convertTrial(tenantId);
          Message.success('租户已转正');
          fetchTenantDetail(tenantId);
        } catch (error) {
          console.error('Failed to convert trial:', error);
        }
      },
    });
  };

  const handleOpenPlanModal = () => {
    planForm.resetFields();
    setSelectedPlanId(undefined);
    setPlanModalVisible(true);
  };

  const handleChangePlan = async (values: any) => {
    try {
      const result = await tenantApi.changePlan(
        tenantId,
        values.planId,
        values.remark
      );
      if (result.billId) {
        Message.success(
          `套餐已切换为「${result.record.toPlanName}」，已生成补差账单 ¥${result.record.proratedAmount.toFixed(
            2
          )}`
        );
      } else {
        Message.success(`套餐已切换为「${result.record.toPlanName}」`);
      }
      setPlanModalVisible(false);
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to change plan:', error);
    }
  };

  const handleOpenStorageModal = () => {
    storageForm.setFieldsValue({ storageUsed });
    setStorageModalVisible(true);
  };

  const handleStorageSubmit = async (values: any) => {
    try {
      await tenantApi.updateStorage(tenantId, values.storageUsed);
      Message.success('存储用量已更新');
      setStorageModalVisible(false);
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to update storage:', error);
    }
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
      render: (val: string) =>
        val === 'active' ? (
          <Tag className="status-tag-active">启用</Tag>
        ) : (
          <Tag className="status-tag-inactive">禁用</Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 140,
      render: (_: any, record: TenantUser) => (
        <Space>
          <Button type="text" size="small" onClick={() => handleEditUser(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该用户？"
            onOk={() => handleDeleteUser(record.id)}
          >
            <Button type="text" size="small" status="danger">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const billColumns = [
    {
      title: '账单编号',
      dataIndex: 'id',
      render: (val: number) => `#${String(val).padStart(6, '0')}`,
    },
    {
      title: '类型',
      dataIndex: 'type',
      render: (val: string) => billTypeText(val),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      render: (val: number) => `¥${Number(val).toFixed(2)}`,
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

  const planChangeColumns = [
    {
      title: '变更时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '原套餐',
      dataIndex: 'fromPlanName',
      render: (val: string, record: PlanChangeRecord) =>
        `${val}（¥${Number(record.fromPrice).toFixed(2)}/月）`,
    },
    {
      title: '新套餐',
      dataIndex: 'toPlanName',
      render: (val: string, record: PlanChangeRecord) =>
        `${val}（¥${Number(record.toPrice).toFixed(2)}/月）`,
    },
    {
      title: '补差金额',
      dataIndex: 'proratedAmount',
      render: (val: number) => {
        const amount = Number(val);
        if (amount > 0) {
          return <span style={{ color: '#f53f3f' }}>¥{amount.toFixed(2)}</span>;
        }
        if (amount < 0) {
          return <span style={{ color: '#00b42a' }}>¥{amount.toFixed(2)}（抵扣）</span>;
        }
        return <span>¥0.00</span>;
      },
    },
    {
      title: '补差账单',
      dataIndex: 'billId',
      render: (val: number | null) =>
        val ? (
          <Button
            type="text"
            size="small"
            icon={<IconFile />}
            onClick={() => navigate(`/bills/${val}`)}
          >
            {`#${String(val).padStart(6, '0')}`}
          </Button>
        ) : (
          <span style={{ color: '#86909c' }}>无</span>
        ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      render: (val: string) => val || '-',
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

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

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
          {tenant.status === 'suspended' && (
            <Tag color="red">
              停用原因：{suspendReasonText(tenant.suspendReason) || '未知'}
            </Tag>
          )}
        </div>
        <Space>
          {canExtendTrial && (
            <Button
              icon={<IconClockCircle />}
              onClick={() => {
                extendForm.setFieldsValue({ days: 30 });
                setExtendModalVisible(true);
              }}
            >
              延期试用
            </Button>
          )}
          {canConvertTrial && (
            <Button type="primary" onClick={handleConvertTrial}>
              试用转正
            </Button>
          )}
          {isArrearsSuspended && (
            <Button
              type="primary"
              status="warning"
              onClick={() => navigate('/bills')}
            >
              前往结清欠费
            </Button>
          )}
          <Button icon={<IconSwap />} onClick={handleOpenPlanModal}>
            切换套餐
          </Button>
          <Button
            type="primary"
            icon={<IconEdit />}
            onClick={() => navigate('/tenants')}
          >
            编辑
          </Button>
        </Space>
      </div>

      {(isTrial || isTrialExpiredSuspended) && (
        <Alert
          style={{ marginBottom: '16px' }}
          type={isTrial ? 'info' : 'error'}
          content={
            isTrial
              ? `该租户正在试用中，试用到期时间：${dayjs(tenant.trialEndsAt).format(
                  'YYYY-MM-DD'
                )}（剩余 ${trialDaysLeft} 天），到期后将自动停用。可提前延期或办理转正。`
              : `该租户试用已于 ${dayjs(tenant.trialEndsAt).format(
                  'YYYY-MM-DD'
                )} 到期并被自动停用，延期试用或转正后可恢复服务。`
          }
        />
      )}
      {isArrearsSuspended && (
        <Alert
          style={{ marginBottom: '16px' }}
          type="error"
          content="该租户因账单长期逾期未付已被停用，结清全部欠费账单后将自动恢复启用。"
        />
      )}

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
            <Statistic
              title="用户数（活跃/上限）"
              value={`${activeUsers} / ${maxUsers}`}
              styleValue={quotaReached ? { color: '#f53f3f' } : undefined}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="存储用量（GB）"
              value={`${storageUsed} / ${maxStorage}`}
              styleValue={
                storageUsed >= maxStorage ? { color: '#f53f3f' } : undefined
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title={isTrial ? '试用到期' : '创建时间'}
              value={dayjs(
                isTrial ? tenant.trialEndsAt : tenant.createdAt
              ).format('YYYY-MM-DD')}
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
            <span className="detail-label">套餐上限：</span>
            <span className="detail-value">
              {tenant.plan.maxUsers} 用户 / {tenant.plan.maxStorage}GB 存储
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">试用到期时间：</span>
            <span className="detail-value">
              {tenant.trialEndsAt
                ? dayjs(tenant.trialEndsAt).format('YYYY-MM-DD')
                : '（非试用租户）'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">存储用量：</span>
            <span className="detail-value">
              {storageUsed}GB / {maxStorage}GB
              <Button
                type="text"
                size="mini"
                icon={<IconStorage />}
                onClick={handleOpenStorageModal}
                style={{ marginLeft: 8 }}
              >
                更新
              </Button>
            </span>
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div className="detail-section-title" style={{ marginBottom: 0 }}>
            用户列表（活跃 {activeUsers}/{maxUsers}）
            {quotaReached && (
              <Tag color="red" style={{ marginLeft: 8 }}>
                已达套餐用户上限
              </Tag>
            )}
          </div>
          <Button
            type="primary"
            icon={<IconPlus />}
            size="small"
            onClick={handleCreateUser}
            disabled={quotaReached}
          >
            添加用户
          </Button>
        </div>
        <Table
          loading={loading}
          columns={userColumns}
          data={users}
          pagination={false}
          border={false}
          rowKey="id"
        />
      </div>

      <div className="content-card">
        <div className="detail-section-title">套餐变更记录</div>
        <Table
          loading={loading}
          columns={planChangeColumns}
          data={tenant.planChanges || []}
          pagination={false}
          border={false}
          rowKey="id"
          noDataElement="暂无套餐变更记录"
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
          rowKey="id"
        />
      </div>

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        visible={userModalVisible}
        onOk={() => userForm.submit()}
        onCancel={() => setUserModalVisible(false)}
        maskClosable={false}
      >
        <Form form={userForm} layout="vertical" onSubmit={handleUserSubmit}>
          <FormItem
            field="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              placeholder="请输入用户名"
              disabled={!!editingUser}
            />
          </FormItem>
          <FormItem
            field="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </FormItem>
          <FormItem
            field="password"
            label={editingUser ? '新密码（留空则不修改）' : '初始密码'}
            rules={
              editingUser
                ? []
                : [{ required: true, message: '请输入初始密码' }]
            }
          >
            <Input.Password placeholder="至少 6 位" />
          </FormItem>
          <FormItem field="role" label="角色" initialValue="user">
            <Select>
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </FormItem>
          <FormItem field="status" label="状态" initialValue="active">
            <Select>
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </FormItem>
          {!editingUser && quotaReached && (
            <Alert
              type="warning"
              content="当前活跃用户已达套餐上限，新用户将无法以启用状态创建。"
            />
          )}
        </Form>
      </Modal>

      <Modal
        title="试用延期"
        visible={extendModalVisible}
        onOk={() => extendForm.submit()}
        onCancel={() => setExtendModalVisible(false)}
        maskClosable={false}
      >
        <Form form={extendForm} layout="vertical" onSubmit={handleExtendTrial}>
          <FormItem
            field="days"
            label="延期天数"
            rules={[{ required: true, message: '请输入延期天数' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={365}
              placeholder="请输入延期天数"
            />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="切换套餐"
        visible={planModalVisible}
        onOk={() => planForm.submit()}
        onCancel={() => setPlanModalVisible(false)}
        maskClosable={false}
      >
        <Form form={planForm} layout="vertical" onSubmit={handleChangePlan}>
          <FormItem
            field="planId"
            label="新套餐"
            rules={[{ required: true, message: '请选择新套餐' }]}
          >
            <Select
              placeholder="请选择新套餐"
              onChange={(val) => setSelectedPlanId(val)}
            >
              {plans
                .filter((p) => p.id !== tenant.planId)
                .map((plan) => (
                  <Option key={plan.id} value={plan.id}>
                    {plan.name} - ¥{plan.price}/月（{plan.maxUsers} 用户 /{' '}
                    {plan.maxStorage}GB）
                  </Option>
                ))}
            </Select>
          </FormItem>
          {selectedPlan && (
            <Alert
              type={
                Number(selectedPlan.price) > Number(tenant.plan.price)
                  ? 'warning'
                  : 'info'
              }
              style={{ marginBottom: 12 }}
              content={
                Number(selectedPlan.price) > Number(tenant.plan.price)
                  ? `升级为「${selectedPlan.name}」后，将按本月剩余天数生成补差账单，并同步创建套餐变更记录。`
                  : `降级为「${selectedPlan.name}」不产生补差费用，变更记录将保留；若活跃用户数或存储用量超过新套餐上限将无法切换。`
              }
            />
          )}
          <FormItem field="remark" label="备注">
            <Input.TextArea placeholder="请输入备注（可选）" rows={2} />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="更新存储用量"
        visible={storageModalVisible}
        onOk={() => storageForm.submit()}
        onCancel={() => setStorageModalVisible(false)}
        maskClosable={false}
      >
        <Form
          form={storageForm}
          layout="vertical"
          onSubmit={handleStorageSubmit}
        >
          <FormItem
            field="storageUsed"
            label={`已用存储（GB），套餐上限 ${maxStorage}GB`}
            rules={[{ required: true, message: '请输入存储用量' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={maxStorage}
              placeholder="请输入已用存储 GB 数"
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}

export default TenantDetail;
