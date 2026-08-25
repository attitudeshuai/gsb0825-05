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
  Message,
  Popconfirm,
  Space,
  Alert,
  Progress,
  Tooltip,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconEdit,
  IconFile,
  IconPlus,
  IconDelete,
  IconUser,
  IconSync,
  IconClockCircle,
  IconCheckCircle,
  IconExclamationCircle,
} from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { tenantApi, planApi } from '../../services/api';
import { Tenant, Bill, TenantUser, Plan, PlanChange } from '../../types';

const { Row, Col } = Grid;
const FormItem = Form.Item;
const Option = Select.Option;

function TenantDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [trialModalVisible, setTrialModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [userForm] = Form.useForm();
  const [editUserForm] = Form.useForm();
  const [planForm] = Form.useForm();
  const [trialForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchData(+id);
      fetchPlans();
    }
  }, [id]);

  const fetchData = async (tenantId: number) => {
    try {
      setLoading(true);
      const data = await tenantApi.getById(tenantId);
      setTenant(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await planApi.getActiveList();
      setPlans(data);
    } catch (e) {
      // ignore
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { className: string; text: string }> = {
      active: { className: 'status-tag-active', text: '启用' },
      inactive: { className: 'status-tag-inactive', text: '禁用' },
      suspended: { className: 'status-tag-suspended', text: '已停用' },
      pending: { className: 'status-tag-pending', text: '待支付' },
      paid: { className: 'status-tag-paid', text: '已支付' },
      overdue: { className: 'status-tag-overdue', text: '已逾期' },
      cancelled: { className: 'status-tag-cancelled', text: '已取消' },
      trial: { className: 'status-tag-pending', text: '试用中' },
    };
    const config = statusMap[status] || statusMap.inactive;
    return (
      <Tag className={config.className} color="default">
        {config.text}
      </Tag>
    );
  };

  const handleAddUser = () => {
    userForm.resetFields();
    setUserModalVisible(true);
  };

  const handleCreateUser = async () => {
    try {
      const values = await userForm.validate();
      await tenantApi.createUser(+id!, values);
      Message.success('用户创建成功');
      setUserModalVisible(false);
      fetchData(+id!);
    } catch (e: any) {
      if (e?.errors) return;
    }
  };

  const handleEditUser = (user: TenantUser) => {
    setEditingUser(user);
    editUserForm.setFieldsValue({
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setEditUserModalVisible(true);
  };

  const handleUpdateUser = async () => {
    try {
      const values = await editUserForm.validate();
      await tenantApi.updateUser(+id!, editingUser!.id, values);
      Message.success('用户更新成功');
      setEditUserModalVisible(false);
      fetchData(+id!);
    } catch (e: any) {
      if (e?.errors) return;
    }
  };

  const handleDeleteUser = async (userId: number) => {
    await tenantApi.deleteUser(+id!, userId);
    Message.success('用户已删除');
    fetchData(+id!);
  };

  const handleChangePlan = () => {
    planForm.resetFields();
    setPlanModalVisible(true);
  };

  const handleSubmitPlanChange = async () => {
    try {
      const values = await planForm.validate();
      const result = await tenantApi.changePlan(+id!, values);
      if (result.bill) {
        Message.success(`套餐升级成功，已生成补差账单 ¥${result.bill.amount.toFixed(2)}`);
      } else if (result.creditAmount > 0) {
        Message.success(`套餐降级成功，差额 ¥${result.creditAmount.toFixed(2)} 已存入账户余额，将在下月账单中抵扣`);
      } else {
        Message.success('套餐变更成功');
      }
      setPlanModalVisible(false);
      fetchData(+id!);
    } catch (e: any) {
      if (e?.errors) return;
    }
  };

  const handleExtendTrial = () => {
    trialForm.resetFields();
    trialForm.setFieldsValue({ days: 30 });
    setTrialModalVisible(true);
  };

  const handleExtendTrialSubmit = async () => {
    try {
      const values = await trialForm.validate();
      await tenantApi.extendTrial(+id!, values.days, values.remark);
      Message.success(`试用期已延长 ${values.days} 天`);
      setTrialModalVisible(false);
      fetchData(+id!);
    } catch (e: any) {
      if (e?.errors) return;
    }
  };

  const handleConvertTrial = async () => {
    Modal.confirm({
      title: '确认试用转正',
      content: '转正后试用期将结束，租户将转为正式付费状态。',
      onOk: async () => {
        await tenantApi.convertTrial(+id!);
        Message.success('试用转正成功');
        fetchData(+id!);
      },
    });
  };

  const handleSuspend = () => {
    Modal.confirm({
      title: '停用租户',
      content: (
        <div>
          <p>确定要停用该租户吗？停用后租户用户将无法登录。</p>
          <Input id="suspend-reason" placeholder="请输入停用原因（选填）" />
        </div>
      ),
      onOk: async () => {
        const reasonInput = document.getElementById('suspend-reason') as HTMLInputElement;
        await tenantApi.suspend(+id!, reasonInput?.value || '管理员手动停用');
        Message.success('租户已停用');
        fetchData(+id!);
      },
    });
  };

  const handleActivate = async () => {
    try {
      await tenantApi.activate(+id!);
      Message.success('租户已启用');
      fetchData(+id!);
    } catch (e: any) {
      // Error handled by interceptor
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
      render: (_: any, record: TenantUser) => (
        <Space>
          <Button type="text" size="small" onClick={() => handleEditUser(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该用户吗？"
            onOk={() => handleDeleteUser(record.id)}
          >
            <Button type="text" size="small" status="danger" icon={<IconDelete />}>
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
      dataIndex: 'billType',
      render: (val: string) => (
        <Tag color={val === 'plan_change' ? 'orange' : 'arcoblue'}>
          {val === 'plan_change' ? '套餐变更' : '订阅费'}
        </Tag>
      ),
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

  const planChangeColumns = [
    {
      title: '变更时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '原套餐',
      dataIndex: 'fromPlan',
      render: (plan: Plan) => plan?.name || '-',
    },
    {
      title: '新套餐',
      dataIndex: 'toPlan',
      render: (plan: Plan) => plan?.name || '-',
    },
    {
      title: '变更类型',
      dataIndex: 'changeType',
      render: (val: string) => (
        <Tag color={val === 'upgrade' ? 'green' : 'orange'}>
          {val === 'upgrade' ? '升级' : '降级'}
        </Tag>
      ),
    },
    {
      title: '补差金额',
      dataIndex: 'proratedAmount',
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#f53f3f' : '#00b42a' }}>
          {val > 0 ? `+¥${val.toFixed(2)}` : val < 0 ? `¥${val.toFixed(2)}` : '¥0.00'}
        </span>
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

  if (!tenant) {
    return <div>加载中...</div>;
  }

  const activeUsers = tenant.tenantUsers?.filter(u => u.status === 'active').length || 0;
  const maxUsers = tenant.plan?.maxUsers || 0;
  const userUsagePercent = maxUsers > 0 ? Math.round((activeUsers / maxUsers) * 100) : 0;
  const MB_PER_GB = 1024;
  const storageUsedMb = tenant.storageUsedMb ?? tenant.storageUsed ?? 0;
  const maxStorageGb = tenant.maxStorageGb ?? tenant.plan?.maxStorage ?? 0;
  const maxStorageMb = tenant.maxStorageMb ?? maxStorageGb * MB_PER_GB;
  const storagePercent = maxStorageMb > 0 ? Math.round((storageUsedMb / maxStorageMb) * 100) : 0;
  const formatStorage = (mb: number) => {
    if (mb >= MB_PER_GB) {
      return `${(mb / MB_PER_GB).toFixed(2)} GB`;
    }
    return `${mb} MB`;
  };
  const isTrial = !!tenant.trialEndsAt;
  const trialDaysLeft = tenant.trialEndsAt
    ? Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

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
          {isTrial && (
            <Tag color={trialDaysLeft <= 3 ? 'red' : 'orange'} icon={<IconClockCircle />}>
              {trialDaysLeft > 0
                ? `试用剩余 ${trialDaysLeft} 天`
                : '试用已到期'}
            </Tag>
          )}
        </div>
        <Space>
          {tenant.status === 'active' ? (
            <Button status="warning" onClick={handleSuspend}>
              停用租户
            </Button>
          ) : (
            <Button type="primary" status="success" icon={<IconCheckCircle />} onClick={handleActivate}>
              启用租户
            </Button>
          )}
          <Button
            type="primary"
            icon={<IconEdit />}
            onClick={() => navigate('/tenants')}
          >
            编辑
          </Button>
        </Space>
      </div>

      {(tenant.status === 'suspended' || tenant.isTrialExpired || (tenant.overdueBills || 0) > 0) && (
        <Alert
          type={tenant.status === 'suspended' ? 'error' : 'warning'}
          icon={<IconExclamationCircle />}
          style={{ marginBottom: 16 }}
          content={
            <div>
              {tenant.status === 'suspended' && (
                <div>
                  <strong>租户已停用</strong>
                  {tenant.suspendedReason && `：${tenant.suspendedReason}`}
                  {tenant.suspendedAt && `（${dayjs(tenant.suspendedAt).format('YYYY-MM-DD HH:mm')}）`}
                </div>
              )}
              {tenant.isTrialExpired && tenant.status === 'active' && (
                <div>
                  <strong>试用期已到期</strong>，请及时延长试用期或办理转正。
                </div>
              )}
              {(tenant.overdueBills || 0) > 0 && (
                <div>
                  有 <strong>{tenant.overdueBills}</strong> 笔逾期账单未处理。
                </div>
              )}
            </div>
          }
        />
      )}

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="当前套餐"
              value={tenant.plan.name}
              suffix={`- ¥${tenant.plan.price}/月`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="用户数"
              value={activeUsers}
              suffix={`/ ${maxUsers}`}
            />
            <Progress
              percent={userUsagePercent}
              size="small"
              color={userUsagePercent >= 90 ? '#f53f3f' : userUsagePercent >= 70 ? '#ff7d00' : '#165dff'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="存储空间"
              value={formatStorage(storageUsedMb)}
              suffix={`/ ${maxStorageGb}GB`}
            />
            <Progress
              percent={storagePercent}
              size="small"
              color={storagePercent >= 90 ? '#f53f3f' : storagePercent >= 70 ? '#ff7d00' : '#165dff'}
              style={{ marginTop: 8 }}
            />
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

      {isTrial && (
        <div className="content-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="detail-section-title" style={{ marginBottom: 8 }}>
                <IconClockCircle style={{ marginRight: 8 }} />
                试用期管理
              </div>
              <div style={{ color: '#86909c' }}>
                试用到期时间：{dayjs(tenant.trialEndsAt).format('YYYY-MM-DD HH:mm')}
                {trialDaysLeft > 0 && `（剩余 ${trialDaysLeft} 天）`}
                {trialDaysLeft <= 0 && '（已到期）'}
              </div>
            </div>
            <Space>
              <Button icon={<IconClockCircle />} onClick={handleExtendTrial}>
                延长试用期
              </Button>
              <Button type="primary" status="success" icon={<IconCheckCircle />} onClick={handleConvertTrial}>
                试用转正
              </Button>
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
        </div>
      </div>

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="detail-section-title" style={{ marginBottom: 0 }}>
            套餐信息
          </div>
          <Button size="small" icon={<IconSync />} onClick={handleChangePlan}>
            变更套餐
          </Button>
        </div>
        <div className="detail-grid">
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
          <div className="detail-item">
            <span className="detail-label">最大存储：</span>
            <span className="detail-value">{tenant.plan.maxStorage} GB（{tenant.plan.maxStorage * 1024} MB）</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">计费周期：</span>
            <span className="detail-value">
              {tenant.plan.billingCycle === 'monthly' ? '按月' : tenant.plan.billingCycle}
            </span>
          </div>
          {(tenant.creditBalance || 0) > 0 && (
            <div className="detail-item">
              <span className="detail-label">账户余额：</span>
              <span className="detail-value" style={{ color: '#00b42a' }}>
                ¥{Number(tenant.creditBalance).toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>套餐功能</div>
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
      </div>

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="detail-section-title" style={{ marginBottom: 0 }}>
            <IconUser style={{ marginRight: 8 }} />
            用户列表（{activeUsers}/{maxUsers}）
          </div>
          <Tooltip content={activeUsers >= maxUsers ? '已达套餐用户上限' : ''}>
            <Button
              type="primary"
              size="small"
              icon={<IconPlus />}
              onClick={handleAddUser}
              disabled={activeUsers >= maxUsers}
            >
              添加用户
            </Button>
          </Tooltip>
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
        <div className="detail-section-title">最近账单</div>
        <Table
          loading={loading}
          columns={billColumns}
          data={tenant.bills || []}
          pagination={false}
          border={false}
        />
      </div>

      {tenant.planChanges && tenant.planChanges.length > 0 && (
        <div className="content-card">
          <div className="detail-section-title">套餐变更记录</div>
          <Table
            columns={planChangeColumns}
            data={tenant.planChanges || []}
            pagination={false}
            border={false}
          />
        </div>
      )}

      <Modal
        title="添加用户"
        visible={userModalVisible}
        onOk={handleCreateUser}
        onCancel={() => setUserModalVisible(false)}
        autoFocus={false}
      >
        <Form form={userForm} layout="vertical">
          <FormItem
            label="用户名"
            field="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </FormItem>
          <FormItem
            label="邮箱"
            field="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </FormItem>
          <FormItem
            label="密码"
            field="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </FormItem>
          <FormItem label="角色" field="role" initialValue="user">
            <Select>
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="编辑用户"
        visible={editUserModalVisible}
        onOk={handleUpdateUser}
        onCancel={() => setEditUserModalVisible(false)}
        autoFocus={false}
      >
        <Form form={editUserForm} layout="vertical">
          <FormItem
            label="邮箱"
            field="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </FormItem>
          <FormItem label="新密码（不修改请留空）" field="password">
            <Input.Password placeholder="请输入新密码" />
          </FormItem>
          <FormItem label="角色" field="role">
            <Select>
              <Option value="user">普通用户</Option>
              <Option value="admin">管理员</Option>
            </Select>
          </FormItem>
          <FormItem label="状态" field="status">
            <Select>
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="变更套餐"
        visible={planModalVisible}
        onOk={handleSubmitPlanChange}
        onCancel={() => setPlanModalVisible(false)}
        autoFocus={false}
      >
        <Alert
          type="info"
          content="套餐变更按当月剩余天数折算费用：升级需补差价并生成账单；降级差额将存入账户余额，在下月账单中自动抵扣。"
          style={{ marginBottom: 16 }}
        />
        <Form form={planForm} layout="vertical">
          <FormItem
            label="选择新套餐"
            field="planId"
            rules={[{ required: true, message: '请选择套餐' }]}
          >
            <Select placeholder="请选择套餐">
              {plans
                .filter(p => p.id !== tenant.planId)
                .map(p => (
                  <Option key={p.id} value={p.id}>
                    {p.name} - ¥{p.price}/月（{p.maxUsers}用户 / {p.maxStorage}GB）
                  </Option>
                ))}
            </Select>
          </FormItem>
          <FormItem label="备注" field="remark">
            <Input.TextArea placeholder="请输入变更原因（选填）" rows={3} />
          </FormItem>
        </Form>
      </Modal>

      <Modal
        title="延长试用期"
        visible={trialModalVisible}
        onOk={handleExtendTrialSubmit}
        onCancel={() => setTrialModalVisible(false)}
        autoFocus={false}
      >
        <Form form={trialForm} layout="vertical">
          <FormItem
            label="延长天数"
            field="days"
            rules={[{ required: true, message: '请输入延长天数' }]}
          >
            <Select>
              <Option value={7}>7 天</Option>
              <Option value={14}>14 天</Option>
              <Option value={30}>30 天</Option>
              <Option value={60}>60 天</Option>
              <Option value={90}>90 天</Option>
            </Select>
          </FormItem>
          <FormItem label="备注" field="remark">
            <Input.TextArea placeholder="请输入延长原因（选填）" rows={3} />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}

export default TenantDetail;
