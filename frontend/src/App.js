import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout, Menu, Typography, Space, Avatar } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  DashboardOutlined,
  CloudUploadOutlined,
  DeploymentUnitOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

// 頁面組件
import Dashboard from './pages/Dashboard';
import UserList from './pages/UserList';
import UserForm from './pages/UserForm';
import ImportUsers from './pages/ImportUsers';
import Settings from './pages/Settings';
import Deploy from './pages/Deploy';
import NotFound from './pages/NotFound';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // 根據當前路徑設定選中的選單項
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/users')) return 'users';
    if (path.startsWith('/import')) return 'import';
    if (path.startsWith('/deploy')) return 'deploy';
    if (path.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  // 選單項目
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '儀表板',
      onClick: () => navigate('/')
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '使用者管理',
      onClick: () => navigate('/users')
    },
    {
      key: 'import',
      icon: <CloudUploadOutlined />,
      label: '批次匯入',
      onClick: () => navigate('/import')
    },
    {
      key: 'deploy',
      icon: <DeploymentUnitOutlined />,
      label: '部署管理',
      onClick: () => navigate('/deploy')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系統設定',
      onClick: () => navigate('/settings')
    }
  ];

  return (
    <Layout className="min-h-screen">
      {/* 側邊欄 */}
      <Sider width={240} className="bg-white shadow-lg">
        <div className="logo p-6">
          <Space>
            <Avatar size={32} icon={<FileTextOutlined />} className="bg-blue-500" />
            <Title level={4} className="m-0 text-blue-600">
              數位名片管理
            </Title>
          </Space>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          className="nav-menu border-none"
          items={menuItems}
        />
      </Sider>

      <Layout>
        {/* 頂部導航 */}
        <Header className="bg-white shadow-sm px-6 flex items-center justify-between">
          <div>
            <Title level={3} className="m-0 text-gray-800">
              {menuItems.find(item => item.key === getSelectedKey())?.label || '數位名片管理系統'}
            </Title>
          </div>
          
          <div>
            <Space>
              <Avatar icon={<UserOutlined />} />
              <span className="text-gray-600">管理員</span>
            </Space>
          </div>
        </Header>

        {/* 主要內容區域 */}
        <Content className="m-6 p-6 bg-white rounded-lg shadow-sm">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/edit/:employeeId" element={<UserForm />} />
            <Route path="/import" element={<ImportUsers />} />
            <Route path="/deploy" element={<Deploy />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;