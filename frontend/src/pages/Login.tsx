import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Button, Message } from '@arco-design/web-react';
import { IconLock, IconUser } from '@arco-design/web-react/icon';
import { RootState } from '../store';
import { login, clearError } from '../store/slices/authSlice';

const FormItem = Form.Item;

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [form] = Form.useForm();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
    return () => {
      dispatch(clearError());
    };
  }, [isAuthenticated, navigate, dispatch]);

  useEffect(() => {
    if (error) {
      Message.error(error);
    }
  }, [error]);

  const handleSubmit = async (values: { username: string; password: string }) => {
    const result = await dispatch(login(values));
    if (login.fulfilled.match(result)) {
      Message.success('登录成功');
      navigate('/');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-title">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
          <h1>多租户管理平台</h1>
          <p>Multi-Tenant Management System</p>
        </div>
        <Form
          form={form}
          layout="vertical"
          onSubmit={handleSubmit}
          initialValues={{ username: 'admin', password: '112233' }}
        >
          <FormItem
            field="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<IconUser />}
              placeholder="请输入用户名"
              size="large"
            />
          </FormItem>
          <FormItem
            field="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<IconLock />}
              placeholder="请输入密码"
              size="large"
            />
          </FormItem>
          <FormItem>
            <Button
              type="primary"
              htmlType="submit"
              long
              size="large"
              loading={loading}
            >
              登录
            </Button>
          </FormItem>
        </Form>
        <div
          style={{
            textAlign: 'center',
            color: '#86909c',
            fontSize: '12px',
            marginTop: '16px',
          }}
        >
          <p>演示账号：admin / 112233</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
