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
  DatePicker,
  Message,
  Popconfirm,
  Space,
  Progress,
  InputNumber,
} from '@arco-design/web-react';
import {
  IconLeft,
  IconPlus,
  IconEdit,
  IconDelete,
  IconFile,
  IconSync,
} from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { tenantApi, tenantUserApi, planApi } from '../../services/api';
import { Tenant, Bill, TenantUser, Plan, PlanChangeRecord } from '../../types';

const FormItem = Form.Item;
const Option = Select.Option;
const { Row, Col } = Grid;

function TenantDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);

  // 用户管理弹窗
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [userForm] = Form.useForm();

  // 试用延期弹窗
  const [trialModalVisible, setTrialModalVisible] = useState(false);
  const [trialForm] = Form.useForm();

  // 套餐切换弹窗
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [planForm] = Form.useForm();

  // 存储用量弹窗
  const [storageModalVisible, setStorageModalVisible] = useState(false);
  const [storageForm] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchTenantDetail(+id);
      fetchPlans();
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

  const fetchPlans = async () => {
    try {
      const data = await planApi.getActiveList();
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const activeUserCount =
    tenant?.tenantUsers?.filter((u) => u.status === 'active').length || 0;
  const maxUsers = tenant?.plan?.maxUsers || 0;
  const quotaReached = maxUsers > 0 && activeUserCount >= maxUsers;

  const storageUsed = tenant?.storageUsed || 0;
  const maxStorage = tenant?.plan?.maxStorage || 0;
  const storagePercent =
    maxStorage > 0 ? Math.min(100, Math.round((storageUsed / maxStorage) * 100)) : 0;
  const storageWarning = maxStorage > 0 && storageUsed / maxStorage >= 0.9;

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

  const getSuspendReasonText = (reason?: string) => {
    const map: Record<string, string> = {
      trial_expired: '试用到期',
      arrears: '长期欠费',
    };
    return reason ? map[reason] || reason : '';
  };

  // ==================== 用户管理 ====================

  const handleCreateUser = () => {
    if (quotaReached) {
      Message.warning(
        `当前套餐「${tenant?.plan?.name}」最多允许 ${maxUsers} 个用户，已达上限`,
      );
      return;
    }
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
    if (!tenant) return;
    try {
      await tenantUserApi.delete(tenant.id, userId);
      Message.success('删除成功');
      fetchTenantDetail(tenant.id);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleSubmitUser = async (values: any) => {
    if (!tenant) return;
    try {
      if (editingUser) {
        const data: any = {
          email: values.email,
          role: values.role,
          status: values.status,
        };
        if (values.password) data.password = values.password;
        await tenantUserApi.update(tenant.id, editingUser.id, data);
        Message.success('更新成功');
      } else {
        await tenantUserApi.create(tenant.id, values);
        Message.success('创建成功');
      }
      setUserModalVisible(false);
      fetchTenantDetail(tenant.id);
    } catch (error) {
      console.error('Failed to submit user:', error);
    }
  };

  // ==================== 试用期 ====================

  const handleExtendTrial = () => {
    trialForm.resetFields();
    if (tenant?.trialEndsAt) {
      trialForm.setFieldsValue({ trialEndsAt: dayjs(tenant.trialEndsAt) });
    }
    setTrialModalVisible(true);
  };

  const handleSubmitTrial = async (values: any) => {
    if (!tenant) return;
    try {
      await tenantApi.extendTrial(
        tenant.id,
        dayjs(values.trialEndsAt).toISOString(),
      );
      Message.success('试用期已更新');
      setTrialModalVisible(false);
      fetchTenantDetail(tenant.id);
    } catch (error) {
      console.error('Failed to extend trial:', error);
    }
  };

  const handleConvert = async () => {
    if (!tenant) return;
    try {
      await tenantApi.convertToFormal(tenant.id);
      Message.success('已转为正式租户');
      fetchTenantDetail(tenant.id);
    } catch (error) {
      console.error('Failed to convert tenant:', error);
    }
  };

  // ==================== 套餐切换 ====================

  const handleChangePlan = () => {
    planForm.resetFields();
    planForm.setFieldsValue({ planId: tenant?.planId });
    setPlanModalVisible(true);
  };

  const handleSubmitPlan = async (values: any) => {
    if (!tenant) return;
    try {
      await tenantApi.changePlan(tenant.id, values.planId, values.remark);
      Message.success('套餐切换成功');
      setPlanModalVisible(false);
      fetchTenantDetail(tenant.id);
    } catch (error) {
      console.error('Failed to change plan:', error);
    }
  };

  // ==================== 存储用量 ====================

  const handleUpdateStorage = () => {
    storageForm.resetFields();
    storageForm.setFieldsValue({ storageUsed });
    setStorageModalVisible(true);
  };

  const handleSubmitStorage = async (values: any) => {
    if (!tenant) return;
    try {
      const result = await tenantApi.updateStorage(tenant.id, values.storageUsed);
      if (result.storageWarning) {
        Message.warning(result.storageWarning);
      } else {
        Message.success('存储用量已更新');
      }
      setStorageModalVisible(false);
      fetchTenantDetail(tenant.id);
    } catch (error) {
      console.error('Failed to update storage:', error);
    }
  };

  const userColumns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '邮箱', dataIndex: 'email' },
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
      width: 120,
      render: (_: any, record: TenantUser) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => handleEditUser(record)}
          />
          <Popconfirm
            title="确认删除"
            content="删除后无法恢复，确定要删除吗？"
            onOk={() => handleDeleteUser(record.id)}
          >
            <Button type="text" size="small" status="danger" icon={<IconDelete />} />
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

  const changeTypeText = (t: string) => {
    const map: Record<string, string> = {
      upgrade: '升级',
      downgrade: '降级',
      change: '变更',
    };
    return map[t] || t;
  };

  const planChangeColumns = [
    {
      title: '变更时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '原套餐',
      dataIndex: 'fromPlanName',
    },
    {
      title: '新套餐',
      dataIndex: 'toPlanName',
    },
    {
      title: '类型',
      dataIndex: 'changeType',
      render: (val: string) => (
        <Tag color={val === 'upgrade' ? 'green' : val === 'downgrade' ? 'orange' : 'gray'}>
          {changeTypeText(val)}
        </Tag>
      ),
    },
    {
      title: '补差金额',
      dataIndex: 'priceDiff',
      render: (val: number) => (val ? `¥${Number(val).toFixed(2)}` : '-'),
    },
    {
      title: '关联账单',
      dataIndex: 'billId',
      render: (val: number) =>
        val ? (
          <Button type="text" size="small" onClick={() => navigate(`/bills/${val}`)}>
            #{String(val).padStart(6, '0')}
          </Button>
        ) : (
          '-'
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

  const isTrial = !!tenant.trialEndsAt;
  const trialExpired = isTrial && dayjs(tenant.trialEndsAt).isBefore(dayjs());

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button type="text" icon={<IconLeft />} onClick={() => navigate('/tenants')}>
            返回
          </Button>
          <h2 className="page-title">租户详情 - {tenant.name}</h2>
          {getStatusTag(tenant.status)}
          {tenant.status === 'suspended' && tenant.suspendReason && (
            <Tag color="red">停用原因：{getSuspendReasonText(tenant.suspendReason)}</Tag>
          )}
          {isTrial && (
            <Tag color={trialExpired ? 'red' : 'arcoblue'}>
              试用{trialExpired ? '已到期' : '中'}（
              {dayjs(tenant.trialEndsAt).format('YYYY-MM-DD')}）
            </Tag>
          )}
        </div>
        <Space>
          {isTrial && (
            <>
              <Button icon={<IconSync />} onClick={handleExtendTrial}>
                延长试用
              </Button>
              <Popconfirm title="确认将该租户转为正式租户？" onOk={handleConvert}>
                <Button type="primary">转正</Button>
              </Popconfirm>
            </>
          )}
          <Button icon={<IconSync />} onClick={handleChangePlan}>
            切换套餐
          </Button>
        </Space>
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
            <Statistic
              title="用户数（激活/上限）"
              value={`${activeUserCount} / ${maxUsers}`}
            />
            <Progress
              percent={maxUsers > 0 ? Math.min(100, Math.round((activeUserCount / maxUsers) * 100)) : 0}
              status={quotaReached ? 'warning' : 'normal'}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={handleUpdateStorage}
          >
            <Statistic
              title="存储用量（GB / 上限）"
              value={`${storageUsed} / ${maxStorage}`}
            />
            <Progress
              percent={storagePercent}
              status={storageWarning ? 'warning' : 'normal'}
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
          <div className="detail-item">
            <span className="detail-label">试用到期：</span>
            <span className="detail-value">
              {tenant.trialEndsAt
                ? dayjs(tenant.trialEndsAt).format('YYYY-MM-DD')
                : '-（正式租户）'}
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
        <div className="table-toolbar">
          <div className="detail-section-title" style={{ marginBottom: 0, border: 'none' }}>
            用户列表（{activeUserCount}/{maxUsers}）
          </div>
          <Button
            type="primary"
            icon={<IconPlus />}
            onClick={handleCreateUser}
            disabled={quotaReached}
          >
            新增用户
          </Button>
        </div>
        {quotaReached && (
          <div style={{ color: '#ff7d00', marginBottom: 12 }}>
            当前套餐用户数已达上限，如需新增请升级套餐或停用部分用户。
          </div>
        )}
        <Table
          loading={loading}
          columns={userColumns}
          data={tenant.tenantUsers || []}
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
          noDataElement={<span style={{ color: '#86909c' }}>暂无变更记录</span>}
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

      {/* 用户管理弹窗 */}
      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
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
              <Option value="admin">管理员</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </FormItem>
          <FormItem field="status" label="状态" initialValue="active">
            <Select>
              <Option value="active">启用</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      {/* 试用延期弹窗 */}
      <Modal
        title="延长试用期"
        visible={trialModalVisible}
        onOk={() => trialForm.submit()}
        onCancel={() => setTrialModalVisible(false)}
        maskClosable={false}
      >
        <Form form={trialForm} layout="vertical" onSubmit={handleSubmitTrial}>
          <FormItem
            field="trialEndsAt"
            label="新的试用到期时间"
            rules={[{ required: true, message: '请选择试用到期时间' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择试用到期时间" />
          </FormItem>
        </Form>
      </Modal>

      {/* 套餐切换弹窗 */}
      <Modal
        title="切换套餐"
        visible={planModalVisible}
        onOk={() => planForm.submit()}
        onCancel={() => setPlanModalVisible(false)}
        maskClosable={false}
      >
        <Form form={planForm} layout="vertical" onSubmit={handleSubmitPlan}>
          <FormItem
            field="planId"
            label="目标套餐"
            rules={[{ required: true, message: '请选择目标套餐' }]}
          >
            <Select placeholder="请选择目标套餐">
              {plans.map((plan) => (
                <Option key={plan.id} value={plan.id}>
                  {plan.name} - ¥{plan.price}/月（最多 {plan.maxUsers} 用户）
                </Option>
              ))}
            </Select>
          </FormItem>
          <FormItem field="remark" label="备注">
            <Input.TextArea placeholder="请输入备注（可选）" rows={3} />
          </FormItem>
          <div style={{ color: '#86909c', fontSize: 12 }}>
            升级将按当月剩余天数生成补差账单；降级时若当前激活用户数超过目标套餐上限将被拒绝。
          </div>
        </Form>
      </Modal>

      {/* 存储用量弹窗 */}
      <Modal
        title="更新存储用量"
        visible={storageModalVisible}
        onOk={() => storageForm.submit()}
        onCancel={() => setStorageModalVisible(false)}
        maskClosable={false}
      >
        <Form form={storageForm} layout="vertical" onSubmit={handleSubmitStorage}>
          <FormItem
            field="storageUsed"
            label={`存储用量 (GB)，当前套餐上限 ${maxStorage}GB`}
            rules={[{ required: true, message: '请输入存储用量' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={maxStorage}
              placeholder="请输入存储用量"
            />
          </FormItem>
          <div style={{ color: '#86909c', fontSize: 12 }}>
            超过套餐上限将被拒绝；达到上限的 90% 及以上会触发告警提示。
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default TenantDetail;
