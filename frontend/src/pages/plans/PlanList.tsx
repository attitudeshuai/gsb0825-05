import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Tag,
  Modal,
  Form,
  Select,
  Message,
  Popconfirm,
  Space,
  Grid,
  InputNumber,
  Checkbox,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconDelete,
  IconEye,
  IconCheck,
} from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { planApi } from '../../services/api';
import { Plan, PaginationResult } from '../../types';

const FormItem = Form.Item;
const Option = Select.Option;
const { Row, Col } = Grid;

const featureOptions = [
  { label: '用户管理', value: 'userManagement' },
  { label: '基础报表', value: 'basicReport' },
  { label: '高级报表', value: 'advancedReport' },
  { label: '邮件支持', value: 'emailSupport' },
  { label: '电话支持', value: 'phoneSupport' },
  { label: '自定义域名', value: 'customDomain' },
  { label: 'API 访问', value: 'apiAccess' },
  { label: 'SSO 集成', value: 'ssoIntegration' },
  { label: '专属客户经理', value: 'dedicatedAccountManager' },
];

function PlanList() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginationResult<Plan> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPlans();
  }, [page, pageSize, keyword]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await planApi.getList({ page, pageSize, keyword });
      setData(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPlan(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    const features = Object.entries(plan.features)
      .filter(([, value]) => value === true)
      .map(([key]) => key);

    form.setFieldsValue({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billingCycle: plan.billingCycle,
      maxUsers: plan.maxUsers,
      maxStorage: plan.maxStorage,
      features,
      status: plan.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await planApi.delete(id);
      Message.success('删除成功');
      fetchPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await planApi.updateStatus(id, status);
      Message.success('状态更新成功');
      fetchPlans();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const featuresObj: Record<string, boolean> = {};
      featureOptions.forEach((opt) => {
        featuresObj[opt.value] = values.features?.includes(opt.value) || false;
      });

      const submitData = {
        ...values,
        features: featuresObj,
      };

      if (editingPlan) {
        await planApi.update(editingPlan.id, submitData);
        Message.success('更新成功');
      } else {
        await planApi.create(submitData);
        Message.success('创建成功');
      }
      setModalVisible(false);
      fetchPlans();
    } catch (error) {
      console.error('Failed to submit:', error);
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

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '套餐名称',
      dataIndex: 'name',
      render: (val: string, record: Plan) => (
        <span
          style={{ color: '#165dff', cursor: 'pointer', fontWeight: 500 }}
          onClick={() => navigate(`/plans/${record.id}`)}
        >
          {val}
        </span>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      render: (val: number) => (
        <span style={{ color: '#f53f3f', fontWeight: 600 }}>¥{val.toFixed(2)}</span>
      ),
    },
    {
      title: '计费周期',
      dataIndex: 'billingCycle',
      render: (val: string) => getBillingCycleText(val),
    },
    {
      title: '最大用户数',
      dataIndex: 'maxUsers',
      render: (val: number) => `${val} 人`,
    },
    {
      title: '存储空间',
      dataIndex: 'maxStorage',
      render: (val: number) => `${val} GB`,
    },
    {
      title: '租户数量',
      dataIndex: '_count',
      render: (_: any, record: Plan) => record._count?.tenants || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (val: string, record: Plan) => (
        <Select
          style={{ width: 100 }}
          value={val}
          onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
        >
          <Option value="active">启用</Option>
          <Option value="inactive">禁用</Option>
        </Select>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 160,
      render: (_: any, record: Plan) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<IconEye />}
            onClick={() => navigate(`/plans/${record.id}`)}
          />
          <Button
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确认删除"
            content={
              record._count?.tenants && record._count.tenants > 0
                ? '该套餐下存在租户，无法删除'
                : '删除后无法恢复，确定要删除吗？'
            }
            onOk={() => handleDelete(record.id)}
            disabled={!!(record._count?.tenants && record._count.tenants > 0)}
          >
            <Button
              type="text"
              size="small"
              status="danger"
              icon={<IconDelete />}
              disabled={!!(record._count?.tenants && record._count.tenants > 0)}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">套餐管理</h2>
      </div>

      <div className="content-card">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <Input
              style={{ width: 280 }}
              placeholder="搜索套餐名称、描述"
              prefix={<IconSearch />}
              value={keyword}
              onChange={(val) => setKeyword(val)}
              allowClear
            />
          </div>
          <div className="table-toolbar-right">
            <Button type="primary" icon={<IconPlus />} onClick={handleCreate}>
              新建套餐
            </Button>
          </div>
        </div>

        <Table
          loading={loading}
          columns={columns}
          data={data?.data || []}
          pagination={{
            total: data?.total || 0,
            current: page,
            pageSize,
            showTotal: true,
            showJumper: true,
            pageSizeChangeResetCurrent: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          border={false}
        />
      </div>

      <Modal
        title={editingPlan ? '编辑套餐' : '新建套餐'}
        visible={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        maskClosable={false}
        style={{ width: 600 }}
      >
        <Form form={form} layout="vertical" onSubmit={handleSubmit}>
          <FormItem
            field="name"
            label="套餐名称"
            rules={[{ required: true, message: '请输入套餐名称' }]}
          >
            <Input placeholder="请输入套餐名称" />
          </FormItem>
          <FormItem field="description" label="套餐描述">
            <Input.TextArea placeholder="请输入套餐描述" rows={2} />
          </FormItem>
          <Row gutter={16}>
            <Col span={12}>
              <FormItem
                field="price"
                label="价格 (元)"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  placeholder="请输入价格"
                />
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem
                field="billingCycle"
                label="计费周期"
                rules={[{ required: true, message: '请选择计费周期' }]}
              >
                <Select placeholder="请选择计费周期">
                  <Option value="monthly">月付</Option>
                  <Option value="quarterly">季付</Option>
                  <Option value="yearly">年付</Option>
                </Select>
              </FormItem>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <FormItem
                field="maxUsers"
                label="最大用户数"
                rules={[{ required: true, message: '请输入最大用户数' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="请输入最大用户数"
                />
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem
                field="maxStorage"
                label="最大存储空间 (GB)"
                rules={[{ required: true, message: '请输入最大存储空间' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  placeholder="请输入最大存储空间"
                />
              </FormItem>
            </Col>
          </Row>
          <FormItem
            field="features"
            label="功能特性"
            rules={[{ required: true, message: '请选择功能特性' }]}
          >
            <Checkbox.Group>
              <Row gutter={16}>
                {featureOptions.map((opt) => (
                  <Col span={8} key={opt.value}>
                    <Checkbox value={opt.value}>{opt.label}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </FormItem>
          {editingPlan && (
            <FormItem field="status" label="状态">
              <Select>
                <Option value="active">启用</Option>
                <Option value="inactive">禁用</Option>
              </Select>
            </FormItem>
          )}
        </Form>
      </Modal>
    </div>
  );
}

export default PlanList;
