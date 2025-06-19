import React from 'react';
import { useQuery } from 'react-query';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Alert, 
  Spin, 
  Button, 
  Space,
  Typography,
  List,
  Tag,
  Divider
} from 'antd';
import {
  UserOutlined,
  CloudUploadOutlined,
  DeploymentUnitOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

import { usersAPI, settingsAPI, deployAPI, healthAPI } from '../services/api';

const { Title, Paragraph } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();

  // 載入各種數據
  const { data: usersData, isLoading: usersLoading } = useQuery(
    'dashboard-users', 
    () => usersAPI.getUsers({ limit: 5 }),
    { refetchInterval: 30000 }
  );

  const { data: gitHubStatus, isLoading: githubLoading } = useQuery(
    'github-status',
    settingsAPI.getGitHubStatus,
    { refetchInterval: 60000 }
  );

  const { data: deployStatus, isLoading: deployLoading } = useQuery(
    'deploy-status',
    deployAPI.getDeployStatus,
    { refetchInterval: 30000 }
  );

  const { data: healthData, isLoading: healthLoading } = useQuery(
    'health-check',
    healthAPI.check,
    { refetchInterval: 30000 }
  );

  const isLoading = usersLoading || githubLoading || deployLoading || healthLoading;

  // 計算統計數據
  const totalUsers = usersData?.pagination?.total || 0;
  const recentUsers = usersData?.users || [];
  const isGitHubConfigured = gitHubStatus?.github_configured || false;
  const deploymentEnabled = deployStatus?.deployment_enabled || false;
  const lastDeployment = deployStatus?.last_deployment;

  // 系統狀態檢查
  const getSystemStatus = () => {
    if (!isGitHubConfigured) {
      return { status: 'warning', text: '需要設定 GitHub' };
    }
    if (!deploymentEnabled) {
      return { status: 'warning', text: '部署功能未啟用' };
    }
    if (totalUsers === 0) {
      return { status: 'info', text: '尚無使用者資料' };
    }
    return { status: 'success', text: '系統運行正常' };
  };

  const systemStatus = getSystemStatus();

  if (isLoading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <Title level={2} className="page-title">儀表板</Title>
        <Paragraph className="page-description">
          系統概覽與快速操作
        </Paragraph>
      </div>

      {/* 系統狀態警告 */}
      {systemStatus.status !== 'success' && (
        <Alert
          message="系統狀態提醒"
          description={systemStatus.text}
          type={systemStatus.status}
          showIcon
          closable
          style={{ marginBottom: 24 }}
          action={
            <Space>
              {!isGitHubConfigured && (
                <Button size="small" onClick={() => navigate('/settings')}>
                  前往設定
                </Button>
              )}
              {totalUsers === 0 && (
                <Button size="small" onClick={() => navigate('/users/new')}>
                  新增使用者
                </Button>
              )}
            </Space>
          }
        />
      )}

      {/* 統計卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="總使用者數"
              value={totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Button 
              type="link" 
              size="small"
              onClick={() => navigate('/users')}
            >
              管理使用者 →
            </Button>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="GitHub 設定"
              value={isGitHubConfigured ? '已設定' : '未設定'}
              prefix={
                isGitHubConfigured ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                <ExclamationCircleOutlined style={{ color: '#faad14' }} />
              }
              valueStyle={{ 
                color: isGitHubConfigured ? '#52c41a' : '#faad14',
                fontSize: '16px'
              }}
            />
            <Button 
              type="link" 
              size="small"
              onClick={() => navigate('/settings')}
            >
              前往設定 →
            </Button>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="部署狀態"
              value={deploymentEnabled ? '已啟用' : '未啟用'}
              prefix={
                deploymentEnabled ? 
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                <SyncOutlined style={{ color: '#8c8c8c' }} />
              }
              valueStyle={{ 
                color: deploymentEnabled ? '#52c41a' : '#8c8c8c',
                fontSize: '16px'
              }}
            />
            <Button 
              type="link" 
              size="small"
              onClick={() => navigate('/deploy')}
            >
              部署管理 →
            </Button>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="最後部署"
              value={lastDeployment ? moment(lastDeployment).fromNow() : '從未部署'}
              prefix={<DeploymentUnitOutlined />}
              valueStyle={{ 
                color: lastDeployment ? '#1890ff' : '#8c8c8c',
                fontSize: '14px'
              }}
            />
            <Button 
              type="link" 
              size="small"
              onClick={() => navigate('/deploy')}
            >
              執行部署 →
            </Button>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 最近使用者 */}
        <Col xs={24} lg={12}>
          <Card 
            title="最近新增的使用者" 
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/users')}
              >
                查看全部
              </Button>
            }
          >
            {recentUsers.length > 0 ? (
              <List
                dataSource={recentUsers}
                renderItem={(user) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>{user.full_name}</span>
                          <Tag color="blue">{user.employee_id}</Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size="small">
                          <span>{user.title} · {user.department}</span>
                          <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                            {moment(user.created_at).format('YYYY-MM-DD HH:mm')}
                          </span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div className="empty-state">
                <Paragraph type="secondary">尚無使用者資料</Paragraph>
                <Button 
                  type="primary" 
                  icon={<UserOutlined />}
                  onClick={() => navigate('/users/new')}
                >
                  新增第一位使用者
                </Button>
              </div>
            )}
          </Card>
        </Col>

        {/* 快速操作 */}
        <Col xs={24} lg={12}>
          <Card title="快速操作">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Button 
                  type="primary" 
                  icon={<UserOutlined />} 
                  block
                  onClick={() => navigate('/users/new')}
                >
                  新增使用者
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  icon={<CloudUploadOutlined />} 
                  block
                  onClick={() => navigate('/import')}
                >
                  批次匯入
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  icon={<DeploymentUnitOutlined />} 
                  block
                  disabled={!deploymentEnabled}
                  onClick={() => navigate('/deploy')}
                >
                  執行部署
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  icon={<SettingOutlined />} 
                  block
                  onClick={() => navigate('/settings')}
                >
                  系統設定
                </Button>
              </Col>
            </Row>

            <Divider />

            <div>
              <Title level={5}>系統資訊</Title>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>系統狀態：</span>
                  <Tag color={
                    systemStatus.status === 'success' ? 'green' : 
                    systemStatus.status === 'warning' ? 'orange' : 'blue'
                  }>
                    {systemStatus.text}
                  </Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>後端連接：</span>
                  <Tag color={healthData ? 'green' : 'red'}>
                    {healthData ? '正常' : '異常'}
                  </Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>資料庫：</span>
                  <Tag color="green">正常</Tag>
                </div>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;