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
  InputNumber,
  Select,
  Message,
  Popconfirm,
  Space,
  Tooltip,
  Progress,
  Radio,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconEdit,
  IconFile,
  IconPlus,
  IconDelete,
  IconSwap,
} from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { tenantApi, tenantUserApi, planApi } from '../../services/api';
import { Tenant, Bill, TenantUser, Plan, PlanChangeRecord } from '../../types';

const { Row, Col } = Grid;
const FormItem = Form.Item;
const Option = Select.Option;

function TenantDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tenantId = Number(id);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planChanges, setPlanChanges] = useState<PlanChangeRecord[]>([]);

  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [userForm] = Form.useForm();

  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [extendForm] = Form.useForm();

  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>();
  const [planChanging, setPlanChanging] = useState(false);

  const [storageModalVisible, setStorageModalVisible] = useState(false);
  const [storageForm] = Form.useForm();
  const [storageMode, setStorageMode] = useState<'value' | 'delta'>('value');

  useEffect(() => {
    if (id) {
      fetchTenantDetail(tenantId);
      fetchPlans();
      fetchPlanChanges(tenantId);
    }
  }, [id]);

  const fetchTenantDetail = async (id: number) => {
    try {
      setLoading(true);
      const data = await tenantApi.getById(id);
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

  const fetchPlanChanges = async (id: number) => {
    try {
      const data = await tenantApi.getPlanChanges(id);
      setPlanChanges(data);
    } catch (error) {
      console.error('Failed to fetch plan changes:', error);
    }
  };

  const refresh = () => {
    fetchTenantDetail(tenantId);
    fetchPlanChanges(tenantId);
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { className: string; text: string }> = {
      active: { className: 'status-tag-active', text: '启用' },
      inactive: { className: 'status-tag-inactive', text: '禁用' },
      suspended: { className: 'status-tag-suspended', text: '暂停' },
      trial: { className: 'status-tag-trial', text: '试用中' },
      disabled: { className: 'status-tag-disabled', text: '禁用' },
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

  const suspendReasonMap: Record<string, string> = {
    trial_expired: '试用到期自动停用',
    arrears: '长期欠费自动停用',
    manual: '人工暂停',
  };

  // ---------- 用户管理 ----------
  const activeUserCount =
    tenant?.activeUserCount ??
    tenant?.tenantUsers?.filter((u) => u.status === 'active').length ??
    0;
  const maxUsers = tenant?.plan?.maxUsers ?? 0;
  const quotaFull = activeUserCount >= maxUsers;

  const handleAddUser = () => {
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
      password: undefined,
    });
    setUserModalVisible(true);
  };

  const handleSubmitUser = async (values: any) => {
    try {
      if (editingUser) {
        const data: any = { email: values.email, role: values.role };
        if (values.password) data.password = values.password;
        await tenantUserApi.update(tenantId, editingUser.id, data);
        Message.success('用户更新成功');
      } else {
        await tenantUserApi.create(tenantId, {
          username: values.username,
          email: values.email,
          password: values.password,
          role: values.role,
        });
        Message.success('用户创建成功');
      }
      setUserModalVisible(false);
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to submit user:', error);
    }
  };

  const handleToggleUserStatus = async (user: TenantUser) => {
    try {
      const nextStatus = user.status === 'active' ? 'disabled' : 'active';
      await tenantUserApi.update(tenantId, user.id, { status: nextStatus });
      Message.success(nextStatus === 'active' ? '已启用' : '已禁用');
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await tenantUserApi.delete(tenantId, userId);
      Message.success('删除成功');
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  // ---------- 试用管理 ----------
  const isTrial = tenant?.status === 'trial';
  const isTrialExpired =
    tenant?.status === 'suspended' && tenant?.suspendReason === 'trial_expired';

  const handleExtendTrial = async (values: { days: number }) => {
    try {
      await tenantApi.extendTrial(tenantId, values.days);
      Message.success(`试用已延期 ${values.days} 天`);
      setExtendModalVisible(false);
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to extend trial:', error);
    }
  };

  const handleConvertTrial = async () => {
    try {
      const result = await tenantApi.convertTrial(tenantId);
      Message.success(
        result.bill
          ? `转正成功，已生成首期账单 ¥${Number(result.bill.amount).toFixed(2)}`
          : '转正成功',
      );
      fetchTenantDetail(tenantId);
    } catch (error) {
      console.error('Failed to convert trial:', error);
    }
  };

  // ---------- 套餐变更 ----------
  const handleChangePlan = async () => {
    if (!selectedPlanId) {
      Message.warning('请选择新套餐');
      return;
    }
    try {
      setPlanChanging(true);
      const result = await tenantApi.changePlan(tenantId, selectedPlanId);
      if (result.bill) {
        Message.success(
          `套餐变更成功，已生成补差账单 ¥${Number(result.bill.amount).toFixed(2)}`,
        );
      } else {
        Message.success('套餐变更成功');
      }
      setPlanModalVisible(false);
      setSelectedPlanId(undefined);
      refresh();
    } catch (error) {
      console.error('Failed to change plan:', error);
    } finally {
      setPlanChanging(false);
    }
  };

  // ---------- 存储用量 ----------
  const handleUpdateStorage = async (values: { value: number }) => {
    try {
      const payload =
        storageMode === 'value'
          ? { storageUsed: values.value }
          : { delta: values.value };
      const result = await tenantApi.updateStorage(tenantId, payload);
      if (result.warning) {
        Message.warning(result.warning);
      } else {
        Message.success('存储用量已更新');
      }
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
      render: (val: string) => getStatusTag(val),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 220,
      render: (_: any, record: TenantUser) => (
        <Space>
          <Button type="text" size="small" onClick={() => handleEditUser(record)}>
            编辑
          </Button>
          <Button
            type="text"
            size="small"
            status={record.status === 'active' ? 'warning' : 'success'}
            onClick={() => handleToggleUserStatus(record)}
          >
            {record.status === 'active' ? '禁用' : '启用'}
          </Button>
          <Popconfirm
            title="确认删除"
            content="删除后无法恢复，确定要删除该用户吗？"
            onOk={() => handleDeleteUser(record.id)}
          >
            <Button type="text" size="small" status="danger" icon={<IconDelete />} />
          </Popconfirm>
        </Space>
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
      dataIndex: 'fromPlanId',
      render: (_: any, record: PlanChangeRecord) => record.fromPlan?.name || '-',
    },
    {
      title: '新套餐',
      dataIndex: 'toPlanId',
      render: (_: any, record: PlanChangeRecord) => record.toPlan?.name || '-',
    },
    {
      title: '类型',
      dataIndex: 'changeType',
      render: (val: string) => {
        const typeMap: Record<string, { color: string; text: string }> = {
          upgrade: { color: 'green', text: '升级' },
          downgrade: { color: 'orange', text: '降级' },
          same_price: { color: 'gray', text: '平级变更' },
        };
        const config = typeMap[val] || typeMap.same_price;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '月差价',
      dataIndex: 'priceDiff',
      render: (val: number) => {
        const num = Number(val);
        return (
          <span style={{ color: num > 0 ? '#f53f3f' : num < 0 ? '#00b42a' : undefined }}>
            {num > 0 ? '+' : ''}¥{num.toFixed(2)}
          </span>
        );
      },
    },
    {
      title: '补差金额',
      dataIndex: 'proratedAmount',
      render: (val: number, record: PlanChangeRecord) => {
        const num = Number(val);
        if (!num || !record.billId) return '-';
        return (
          <Button
            type="text"
            size="small"
            onClick={() => navigate(`/bills/${record.billId}`)}
          >
            ¥{num.toFixed(2)}
          </Button>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      render: (val: string) => val || '-',
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

  const trialDaysLeft = tenant.trialEndsAt
    ? dayjs(tenant.trialEndsAt).diff(dayjs(), 'day')
    : null;

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
          {tenant.status === 'suspended' && tenant.suspendReason && (
            <Tag color="red">
              {suspendReasonMap[tenant.suspendReason] || tenant.suspendReason}
            </Tag>
          )}
        </div>
        <Space>
          <Button
            icon={<IconSwap />}
            onClick={() => {
              setSelectedPlanId(undefined);
              setPlanModalVisible(true);
            }}
          >
            变更套餐
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

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={5}>
          <Card className="stat-card">
            <Statistic
              title="套餐"
              value={tenant.plan.name}
              suffix={`- ¥${tenant.plan.price}/月`}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="stat-card">
            <Statistic
              title="用户数（活跃/上限）"
              value={activeUserCount}
              suffix={`/ ${maxUsers}`}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setStorageModalVisible(true)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Statistic
                title="存储用量"
                value={tenant.storageUsed}
                suffix={`/ ${tenant.plan.maxStorage} GB`}
              />
              {tenant.storageUsed > tenant.plan.maxStorage && (
                <Tag color="red" style={{ marginLeft: 8 }}>超额</Tag>
              )}
            </div>
            <Progress
              percent={Math.min(
                Math.round((tenant.storageUsed / (tenant.plan.maxStorage || 1)) * 100),
                100
              )}
              size="small"
              status={tenant.storageUsed > tenant.plan.maxStorage ? 'error' : 'normal'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card className="stat-card">
            <Statistic title="账单数" value={tenant.bills?.length || 0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="创建时间"
              value={dayjs(tenant.createdAt).format('YYYY-MM-DD')}
            />
          </Card>
        </Col>
      </Row>

      {(isTrial || isTrialExpired) && (
        <div className="content-card">
          <div className="detail-section-title">试用管理</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {isTrial && tenant.trialEndsAt && (
                <span>
                  试用到期时间：{dayjs(tenant.trialEndsAt).format('YYYY-MM-DD HH:mm')}
                  {trialDaysLeft !== null && trialDaysLeft >= 0 && (
                    <Tag color="blue" style={{ marginLeft: 12 }}>
                      剩余 {trialDaysLeft} 天
                    </Tag>
                  )}
                </span>
              )}
              {isTrialExpired && (
                <span style={{ color: '#f53f3f' }}>
                  试用已于 {dayjs(tenant.trialEndsAt).format('YYYY-MM-DD HH:mm')} 到期，租户已自动停用
                </span>
              )}
            </div>
            <Space>
              <Button
                onClick={() => {
                  extendForm.resetFields();
                  extendForm.setFieldsValue({ days: 7 });
                  setExtendModalVisible(true);
                }}
              >
                延期试用
              </Button>
              <Popconfirm
                title="确认转正"
                content="转正后租户将转为正式状态，并按当前套餐生成首期账单，确定转正吗？"
                onOk={handleConvertTrial}
              >
                <Button type="primary">转正</Button>
              </Popconfirm>
            </Space>
          </div>
        </div>
      )}

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
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="detail-section-title" style={{ border: 'none', margin: 0, padding: 0 }}>
              用户列表（{activeUserCount}/{maxUsers}）
            </span>
          </div>
          <div className="table-toolbar-right">
            <Tooltip content={quotaFull ? `已达套餐用户数上限（${maxUsers} 人）` : ''}>
              <Button
                type="primary"
                icon={<IconPlus />}
                disabled={quotaFull}
                onClick={handleAddUser}
              >
                添加用户
              </Button>
            </Tooltip>
          </div>
        </div>
        <Table
          loading={loading}
          columns={userColumns}
          data={tenant.tenantUsers || []}
          pagination={false}
          border={false}
        />
      </div>

      <div className="content-card">
        <div className="detail-section-title">套餐变更记录</div>
        <Table
          columns={planChangeColumns}
          data={planChanges}
          pagination={false}
          border={false}
          noDataElement="暂无变更记录"
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

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        visible={userModalVisible}
        onOk={() => userForm.submit()}
        onCancel={() => setUserModalVisible(false)}
        maskClosable={false}
      >
        <Form form={userForm} layout="vertical" onSubmit={handleSubmitUser}>
          <FormItem
            field="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
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
            label={editingUser ? '密码（留空则不修改）' : '密码'}
            rules={
              editingUser
                ? [{ minLength: 6, message: '密码长度不能少于6位' }]
                : [
                    { required: true, message: '请输入密码' },
                    { minLength: 6, message: '密码长度不能少于6位' },
                  ]
            }
          >
            <Input.Password placeholder="请输入密码" />
          </FormItem>
          <FormItem field="role" label="角色" initialValue="user">
            <Select>
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="延期试用"
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
            <InputNumber min={1} max={365} placeholder="请输入延期天数" style={{ width: '100%' }} />
          </FormItem>
          {isTrialExpired && (
            <div style={{ color: '#86909c', fontSize: 12 }}>
              租户当前已因试用到期停用，延期后将自动恢复为试用状态
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title="变更套餐"
        visible={planModalVisible}
        onOk={handleChangePlan}
        onCancel={() => setPlanModalVisible(false)}
        confirmLoading={planChanging}
        maskClosable={false}
      >
        <div style={{ marginBottom: 16 }}>
          当前套餐：{tenant.plan.name}（¥{tenant.plan.price}/月，最多 {tenant.plan.maxUsers} 人，{tenant.plan.maxStorage}GB 存储）
        </div>
        <Select
          placeholder="请选择新套餐"
          style={{ width: '100%' }}
          value={selectedPlanId}
          onChange={(val) => setSelectedPlanId(val)}
        >
          {plans
            .filter((plan) => plan.id !== tenant.planId)
            .map((plan) => (
              <Option key={plan.id} value={plan.id}>
                {plan.name} - ¥{plan.price}/月（最多 {plan.maxUsers} 人，{plan.maxStorage}GB 存储）
              </Option>
            ))}
        </Select>
        <div style={{ color: '#86909c', fontSize: 12, marginTop: 12 }}>
          升级套餐将按当月剩余天数生成补差账单；降级不收取当月差价；新套餐用户数/存储上限不得低于当前使用量（{activeUserCount} 人 / {tenant.storageUsed}GB）。
        </div>
      </Modal>

      <Modal
        title="调整存储用量"
        visible={storageModalVisible}
        onOk={() => storageForm.submit()}
        onCancel={() => setStorageModalVisible(false)}
        maskClosable={false}
      >
        <div style={{ marginBottom: 16 }}>
          当前用量：{tenant.storageUsed} GB / 上限：{tenant.plan.maxStorage} GB
          {tenant.storageUsed > tenant.plan.maxStorage && (
            <Tag color="red" style={{ marginLeft: 8 }}>已超额</Tag>
          )}
        </div>
        <Radio.Group
          type="button"
          value={storageMode}
          onChange={(val) => {
            setStorageMode(val as 'value' | 'delta');
            storageForm.resetFields();
          }}
          style={{ marginBottom: 16 }}
        >
          <Radio value="value">设为绝对值</Radio>
          <Radio value="delta">按增量调整</Radio>
        </Radio.Group>
        <Form
          form={storageForm}
          layout="vertical"
          onSubmit={handleUpdateStorage}
        >
          <FormItem
            field="value"
            label={storageMode === 'value' ? '实际用量（GB）' : '调整量（GB，可为负）'}
            rules={[{ required: true, message: '请输入数值' }]}
          >
            <InputNumber
              step={0.1}
              placeholder={storageMode === 'value' ? '如：12.5' : '如：1.5 或 -2'}
              style={{ width: '100%' }}
            />
          </FormItem>
        </Form>
        <div style={{ color: '#86909c', fontSize: 12 }}>
          超出套餐上限时接口会返回警告，但仍允许写入（用于监控/告警场景）。如需强制拦截写入，需额外配置策略。
        </div>
      </Modal>
    </div>
  );
}

export default TenantDetail;
