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
  DatePicker,
  InputNumber,
  Card,
  Grid,
  Statistic,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconDelete,
  IconEye,
  IconRefresh,
} from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { billApi, tenantApi } from '../../services/api';
import { Bill, Tenant, PaginationResult } from '../../types';

const FormItem = Form.Item;
const Option = Select.Option;
const { Row, Col } = Grid;

function BillList() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginationResult<Bill> | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTenants();
    fetchBills();
    fetchStats();
  }, [page, pageSize, keyword, statusFilter]);

  const fetchTenants = async () => {
    try {
      const result = await tenantApi.getList({ page: 1, pageSize: 1000 });
      setTenants(result.data);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params: any = { page, pageSize };
      if (keyword) params.keyword = keyword;
      if (statusFilter) params.status = statusFilter;
      const data = await billApi.getList(params);
      setData(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await billApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCreate = () => {
    setEditingBill(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    form.setFieldsValue({
      tenantId: bill.tenantId,
      amount: bill.amount,
      billDate: dayjs(bill.billDate),
      dueDate: dayjs(bill.dueDate),
      status: bill.status,
      remark: bill.remark,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await billApi.delete(id);
      Message.success('删除成功');
      fetchBills();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete bill:', error);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await billApi.updateStatus(id, status);
      Message.success('状态更新成功');
      fetchBills();
      fetchStats();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleGenerateMonthly = async () => {
    try {
      const result = await billApi.generateMonthly();
      Message.success(`成功生成 ${result.generated} 张账单`);
      fetchBills();
      fetchStats();
    } catch (error) {
      console.error('Failed to generate monthly bills:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        ...values,
        billDate: dayjs(values.billDate).toISOString(),
        dueDate: dayjs(values.dueDate).toISOString(),
        items: values.items || {
          planFee: {
            name: '套餐月费',
            amount: values.amount,
            quantity: 1,
          },
        },
      };

      if (editingBill) {
        await billApi.update(editingBill.id, submitData);
        Message.success('更新成功');
      } else {
        await billApi.create(submitData);
        Message.success('创建成功');
      }
      setModalVisible(false);
      fetchBills();
      fetchStats();
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { className: string; text: string }> = {
      pending: { className: 'status-tag-pending', text: '待支付' },
      paid: { className: 'status-tag-paid', text: '已支付' },
      overdue: { className: 'status-tag-overdue', text: '已逾期' },
      cancelled: { className: 'status-tag-cancelled', text: '已取消' },
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <Tag className={config.className} color="default">
        {config.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: '账单编号',
      dataIndex: 'id',
      width: 120,
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
      render: (val: number, record: Bill) => (
        <span
          className={`bill-amount ${record.status === 'paid' ? 'paid' : ''}`}
        >
          ¥{val.toFixed(2)}
        </span>
      ),
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
      title: '状态',
      dataIndex: 'status',
      render: (val: string, record: Bill) => (
        <Select
          style={{ width: 120 }}
          value={val}
          onChange={(newStatus) => handleStatusChange(record.id, newStatus)}
        >
          <Option value="pending">待支付</Option>
          <Option value="paid">已支付</Option>
          <Option value="overdue">已逾期</Option>
          <Option value="cancelled">已取消</Option>
        </Select>
      ),
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      render: (val: string) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 160,
      render: (_: any, record: Bill) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<IconEye />}
            onClick={() => navigate(`/bills/${record.id}`)}
          />
          <Button
            type="text"
            size="small"
            icon={<IconEdit />}
            onClick={() => handleEdit(record)}
            disabled={record.status === 'paid'}
          />
          <Popconfirm
            title="确认删除"
            content="删除后无法恢复，确定要删除吗？"
            onOk={() => handleDelete(record.id)}
          >
            <Button
              type="text"
              size="small"
              status="danger"
              icon={<IconDelete />}
              disabled={record.status === 'paid'}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">账单管理</h2>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="总金额"
              value={`¥${(stats?.amount?.total || 0).toFixed(2)}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="已收金额"
              value={`¥${(stats?.amount?.paid || 0).toFixed(2)}`}
              style={{ color: '#00b42a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="待收金额"
              value={`¥${(stats?.amount?.pending || 0).toFixed(2)}`}
              style={{ color: '#ff7d00' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic title="账单总数" value={stats?.count?.total || 0} />
          </Card>
        </Col>
      </Row>

      <div className="content-card">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <Input
              style={{ width: 240 }}
              placeholder="搜索租户名称、编码"
              prefix={<IconSearch />}
              value={keyword}
              onChange={(val) => setKeyword(val)}
              allowClear
            />
            <Select
              style={{ width: 140 }}
              placeholder="账单状态"
              allowClear
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
            >
              <Option value="pending">待支付</Option>
              <Option value="paid">已支付</Option>
              <Option value="overdue">已逾期</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
            <Button icon={<IconRefresh />} onClick={fetchBills}>
              刷新
            </Button>
          </div>
          <div className="table-toolbar-right">
            <Button onClick={handleGenerateMonthly}>
              生成月度账单
            </Button>
            <Button type="primary" icon={<IconPlus />} onClick={handleCreate}>
              新建账单
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
        title={editingBill ? '编辑账单' : '新建账单'}
        visible={modalVisible}
        onOk={() => form.submit()}
        onCancel={() => setModalVisible(false)}
        maskClosable={false}
      >
        <Form form={form} layout="vertical" onSubmit={handleSubmit}>
          <FormItem
            field="tenantId"
            label="租户"
            rules={[{ required: true, message: '请选择租户' }]}
          >
            <Select placeholder="请选择租户" disabled={!!editingBill}>
              {tenants.map((tenant) => (
                <Option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </Option>
              ))}
            </Select>
          </FormItem>
          <FormItem
            field="amount"
            label="金额 (元)"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              placeholder="请输入金额"
            />
          </FormItem>
          <Row gutter={16}>
            <Col span={12}>
              <FormItem
                field="billDate"
                label="账单日期"
                rules={[{ required: true, message: '请选择账单日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择账单日期"
                />
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem
                field="dueDate"
                label="到期日期"
                rules={[{ required: true, message: '请选择到期日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择到期日期"
                />
              </FormItem>
            </Col>
          </Row>
          {editingBill && (
            <FormItem field="status" label="状态">
              <Select>
                <Option value="pending">待支付</Option>
                <Option value="paid">已支付</Option>
                <Option value="overdue">已逾期</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
            </FormItem>
          )}
          <FormItem field="remark" label="备注">
            <Input.TextArea placeholder="请输入备注" rows={3} />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}

export default BillList;
