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
  InputNumber,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconDelete,
  IconEye,
} from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { tenantApi, planApi } from '../../services/api';
import { Tenant, Plan, PaginationResult } from '../../types';

const FormItem = Form.Item;
const Option = Select.Option;

function TenantList() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginationResult<Tenant> | null>(null);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPlans();
    fetchTenants();
  }, [page, pageSize, keyword]);

  const fetchPlans = async () => {
    try {
      const data = await planApi.getActiveList();
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await tenantApi.getList({ page, pageSize, keyword });
      setData(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTenant(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    form.setFieldsValue({
      name: tenant.name,
      code: tenant.code,
      contactName: tenant.contactName,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      address: tenant.address,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await tenantApi.delete(id);
      Message.success('删除成功');
      fetchTenants();
    } catch (error) {
      console.error('Failed to delete tenant:', error);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await tenantApi.updateStatus(id, status);
      Message.success('状态更新成功');
      fetchTenants();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingTenant) {
        await tenantApi.update(editingTenant.id, values);
        Message.success('更新成功');
      } else {
        await tenantApi.create(values);
        Message.success('创建成功');
      }
      setModalVisible(false);
      fetchTenants();
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { className: string; text: string }> = {
      active: { className: 'status-tag-active', text: '启用' },
      inactive: { className: 'status-tag-inactive', text: '禁用' },
      suspended: { className: 'status-tag-suspended', text: '暂停' },
      trial: { className: 'status-tag-trial', text: '试用中' },
    };
    const config = statusMap[status] || statusMap.inactive;
    return (
      <Tag className={config.className} color="default">
        {config.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
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
      title: '套餐',
      dataIndex: 'plan',
      render: (_: any, record: Tenant) => record.plan?.name || '-',
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
      title: '状态',
      dataIndex: 'status',
      render: (val: string, record: Tenant) =>
        val === 'trial' ? (
          getStatusTag(val)
        ) : (
          <Select
            style={{ width: 100 }}
            value={val}
            onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
          >
            <Option value="active">启用</Option>
            <Option value="inactive">禁用</Option>
            <Option value="suspended">暂停</Option>
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
      render: (_: any, record: Tenant) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<IconEye />}
            onClick={() => navigate(`/tenants/${record.id}`)}
          />
          <Button
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确认删除"
            content="删除后无法恢复，确定要删除吗？"
            onOk={() => handleDelete(record.id)}
          >
            <Button type="text" size="small" status="danger" icon={<IconDelete />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">租户管理</h2>
      </div>

      <div className="content-card">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <Input
              style={{ width: 280 }}
              placeholder="搜索租户名称、编码、联系人"
              prefix={<IconSearch />}
              value={keyword}
              onChange={(val) => setKeyword(val)}
              allowClear
            />
          </div>
          <div className="table-toolbar-right">
            <Button type="primary" icon={<IconPlus />} onClick={handleCreate}>
              新建租户
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
        title={editingTenant ? '编辑租户' : '新建租户'}
        visible={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onSubmit={handleSubmit}>
          <FormItem
            field="name"
            label="租户名称"
            rules={[{ required: true, message: '请输入租户名称' }]}
          >
            <Input placeholder="请输入租户名称" />
          </FormItem>
          <FormItem
            field="code"
            label="租户编码"
            rules={[{ required: true, message: '请输入租户编码' }]}
          >
            <Input placeholder="请输入租户编码" />
          </FormItem>
          {!editingTenant && (
            <FormItem
              field="planId"
              label="套餐"
              rules={[{ required: true, message: '请选择套餐' }]}
            >
              <Select placeholder="请选择套餐">
                {plans.map((plan) => (
                  <Option key={plan.id} value={plan.id}>
                    {plan.name} - ¥{plan.price}/月
                  </Option>
                ))}
              </Select>
            </FormItem>
          )}
          {!editingTenant && (
            <FormItem
              field="trialDays"
              label="试用天数（选填，填写后租户进入试用状态）"
            >
              <InputNumber
                min={1}
                max={365}
                placeholder="如：14"
                style={{ width: '100%' }}
              />
            </FormItem>
          )}
          <FormItem
            field="contactName"
            label="联系人姓名"
            rules={[{ required: true, message: '请输入联系人姓名' }]}
          >
            <Input placeholder="请输入联系人姓名" />
          </FormItem>
          <FormItem
            field="contactEmail"
            label="联系人邮箱"
            rules={[
              { required: true, message: '请输入联系人邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="请输入联系人邮箱" />
          </FormItem>
          <FormItem field="contactPhone" label="联系电话">
            <Input placeholder="请输入联系电话" />
          </FormItem>
          <FormItem field="address" label="地址">
            <Input.TextArea placeholder="请输入地址" rows={3} />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}

export default TenantList;
