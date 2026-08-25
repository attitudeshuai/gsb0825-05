import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Layout, Menu, Avatar, Dropdown } from '@arco-design/web-react';
import {
  IconDashboard,
  IconUserGroup,
  IconStorage,
  IconFile,
  IconSettings,
  IconUser,
  IconMenuFold,
  IconMenuUnfold,
} from '@arco-design/web-react/icon';
import { RootState } from '../store';
import { logout, getProfile } from '../store/slices/authSlice';

const { Header, Sider, Content } = Layout;
const MenuItem = Menu.Item;

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<any>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(['/dashboard']);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && !user) {
      dispatch(getProfile());
    }
    const pathname = location.pathname;
    setSelectedKeys([pathname]);
  }, [location.pathname, user, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleUserMenuClick = (key: string) => {
    if (key === 'logout') {
      handleLogout();
    }
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <IconDashboard />,
      content: '仪表盘',
    },
    {
      key: '/tenants',
      icon: <IconUserGroup />,
      content: '租户管理',
    },
    {
      key: '/plans',
      icon: <IconStorage />,
      content: '套餐管理',
    },
    {
      key: '/bills',
      icon: <IconFile />,
      content: '账单管理',
    },
  ];

  return (
    <Layout className="layout-container">
      <Header className="layout-header">
        <div className="logo">
          <span style={{ fontSize: '28px' }}>🏢</span>
          <span>多租户管理平台</span>
        </div>
        <div className="user-info">
          <Dropdown
            droplist={
              <Menu onClickMenuItem={handleUserMenuClick}>
                <MenuItem key="profile">
                  <IconUser /> 个人信息
                </MenuItem>
                <MenuItem key="settings">
                  <IconSettings /> 系统设置
                </MenuItem>
                <MenuItem key="logout">
                  <IconUser /> 退出登录
                </MenuItem>
              </Menu>
            }
            position="br"
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size={32} style={{ backgroundColor: '#165dff' }}>
                {user?.name?.charAt(0) || 'A'}
              </Avatar>
              <span style={{ color: '#1d2129' }}>{user?.name || '管理员'}</span>
            </div>
          </Dropdown>
        </div>
      </Header>
      <Layout>
        <Sider
          collapsed={collapsed}
          collapsible
          trigger={null}
          style={{ backgroundColor: '#fff', borderRight: '1px solid #e5e6eb' }}
          width={220}
          collapsedWidth={60}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '12px',
              cursor: 'pointer',
              borderBottom: '1px solid #e5e6eb',
            }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
          </div>
          <Menu
            selectedKeys={selectedKeys}
            style={{ width: '100%', border: 'none' }}
            onClickMenuItem={handleMenuClick}
          >
            {menuItems.map((item) => (
              <MenuItem key={item.key}>
                {item.icon}
                {!collapsed && <span style={{ marginLeft: '8px' }}>{item.content}</span>}
              </MenuItem>
            ))}
          </Menu>
        </Sider>
        <Content className="page-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
