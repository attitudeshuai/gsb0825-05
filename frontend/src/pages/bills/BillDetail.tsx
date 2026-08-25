import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Tag,
  Grid,
  Statistic,
  Descriptions,
  Divider,
  Table,
} from '@arco-design/web-react';
import { IconLeft, IconEdit, IconUser } from '@arco-design/web-react/icon';
import dayjs from 'dayjs';
import { billApi } from '../../services/api';
import { Bill } from '../../types';

const { Row, Col } = Grid;

function BillDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBillDetail(+id);
    }
  }, [id]);

  const fetchBillDetail = async (billId: number) => {
    try {
      setLoading(true);
      const data = await billApi.getById(billId);
      setBill(data);
    } finally {
      setLoading(false);
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

  const itemColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
    },
    {
      title: '单价',
      dataIndex: 'amount',
      render: (val: number) => `¥${val.toFixed(2)}`,
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      render: (_: any, record: any) =>
        `¥${(record.amount * record.quantity).toFixed(2)}`,
    },
  ];

  const itemsData = bill?.items
    ? Object.entries(bill.items).map(([key, value]: [string, any]) => ({
        key,
        name: value.name,
        quantity: value.quantity || 1,
        amount: value.amount,
      }))
    : [];

  if (!bill) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button
            type="text"
            icon={<IconLeft />}
            onClick={() => navigate('/bills')}
          >
            返回
          </Button>
          <h2 className="page-title">
            账单详情 - #{String(bill.id).padStart(6, '0')}
          </h2>
          {getStatusTag(bill.status)}
        </div>
        <Button
          type="primary"
          icon={<IconEdit />}
          onClick={() => navigate('/bills')}
          disabled={bill.status === 'paid'}
        >
          编辑
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card className="stat-card">
            <Statistic
              title="账单金额"
              value={`¥${bill.amount.toFixed(2)}`}
              className={bill.status === 'paid' ? 'bill-amount paid' : 'bill-amount'}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card">
            <Statistic
              title="账单日期"
              value={dayjs(bill.billDate).format('YYYY-MM-DD')}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card">
            <Statistic
              title="到期日期"
              value={dayjs(bill.dueDate).format('YYYY-MM-DD')}
            />
          </Card>
        </Col>
      </Row>

      <div className="content-card">
        <div className="detail-section-title">账单信息</div>
        <Descriptions
          column={2}
          data={[
            {
              label: '账单编号',
              value: `#${String(bill.id).padStart(6, '0')}`,
            },
            {
              label: '账单状态',
              value: getStatusTag(bill.status),
            },
            {
              label: '账单金额',
              value: `¥${bill.amount.toFixed(2)}`,
            },
            {
              label: '支付时间',
              value: bill.paidAt ? dayjs(bill.paidAt).format('YYYY-MM-DD HH:mm') : '-',
            },
            {
              label: '账单日期',
              value: dayjs(bill.billDate).format('YYYY-MM-DD'),
            },
            {
              label: '到期日期',
              value: dayjs(bill.dueDate).format('YYYY-MM-DD'),
            },
            {
              label: '创建时间',
              value: dayjs(bill.createdAt).format('YYYY-MM-DD HH:mm'),
            },
            {
              label: '更新时间',
              value: dayjs(bill.updatedAt).format('YYYY-MM-DD HH:mm'),
            },
            {
              label: '备注',
              value: bill.remark || '-',
              span: 2,
            },
          ]}
        />
      </div>

      <div className="content-card">
        <div className="detail-section-title">
          <IconUser style={{ marginRight: '8px' }} />
          租户信息
        </div>
        <Descriptions
          column={2}
          data={[
            {
              label: '租户名称',
              value: (
                <span
                  style={{ color: '#165dff', cursor: 'pointer' }}
                  onClick={() => navigate(`/tenants/${bill.tenantId}`)}
                >
                  {bill.tenant.name}
                </span>
              ),
            },
            {
              label: '租户编码',
              value: bill.tenant.code,
            },
            {
              label: '联系人',
              value: bill.tenant.contactName,
            },
            {
              label: '联系邮箱',
              value: bill.tenant.contactEmail,
            },
            {
              label: '联系电话',
              value: bill.tenant.contactPhone || '-',
            },
            {
              label: '当前套餐',
              value: `${bill.tenant.plan.name} - ¥${bill.tenant.plan.price}/月`,
            },
          ]}
        />
      </div>

      <div className="content-card">
        <div className="detail-section-title">账单明细</div>
        <Table
          columns={itemColumns}
          data={itemsData}
          pagination={false}
          border={false}
        />
        <Divider />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span style={{ fontSize: '14px', color: '#86909c' }}>合计：</span>
          <span
            className={`bill-amount ${bill.status === 'paid' ? 'paid' : ''}`}
          >
            ¥{bill.amount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default BillDetail;
