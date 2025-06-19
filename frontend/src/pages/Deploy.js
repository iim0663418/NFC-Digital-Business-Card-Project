import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Card,
  Button,
  Typography,
  Alert,
  Space,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  Modal,
  Progress,
  message,
  Divider,
  Timeline
} from 'antd';
import {
  DeploymentUnitOutlined,
  RocketOutlined,
  EyeOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  GithubOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { deployAPI, settingsAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

const Deploy = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deployProgress, setDeployProgress] = useState(0);
  const [deploying, setDeploying] = useState(false);

  // 載入部署狀態
  const { data: deployStatus, isLoading: statusLoading } = useQuery(
    'deploy-status',
    deployAPI.getDeployStatus,
    { refetchInterval: 30000 }
  );

  // 載入預覽資料
  const { data: previewData, isLoading: previewLoading } = useQuery(
    'deploy-preview',
    deployAPI.previewDeployment
  );

  // 載入 GitHub 狀態
  const { data: githubStatus } = useQuery(
    'github-status',
    settingsAPI.getGitHubStatus
  );

  // 執行部署
  const deployMutation = useMutation(
    deployAPI.executeDeployment,
    {
      onMutate: () => {
        setDeploying(true);
        setDeployProgress(0);
        
        // 模擬進度更新
        const interval = setInterval(() => {
          setDeployProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 1000);
        
        return { interval };
      },
      onSuccess: (data, variables, context) => {
        clearInterval(context.interval);
        setDeployProgress(100);
        message.success('部署完成！');
        queryClient.invalidateQueries('deploy-status');
        
        setTimeout(() => {
          setDeploying(false);
          setDeployProgress(0);
        }, 2000);
      },
      onError: (error, variables, context) => {
        if (context?.interval) {
          clearInterval(context.interval);
        }
        setDeploying(false);
        setDeployProgress(0);
        message.error(`部署失敗: ${error.message}`);
      }
    }
  );

  // 測試連接
  const testConnectionMutation = useMutation(
    deployAPI.testConnection,
    {
      onSuccess: () => {
        message.success('GitHub 連接測試成功');
      },
      onError: (error) => {
        message.error(`連接測試失敗: ${error.message}`);
      }
    }
  );

  const isConfigured = deployStatus?.github_configured;
  const isEnabled = deployStatus?.deployment_enabled;
  const canDeploy = isConfigured && isEnabled && (previewData?.total_users > 0);

  // 執行部署確認
  const handleDeploy = () => {
    if (!canDeploy) {
      if (!isConfigured) {
        message.warning('請先設定 GitHub 配置');
        navigate('/settings');
        return;
      }
      if (previewData?.total_users === 0) {
        message.warning('沒有使用者資料可以部署');
        navigate('/users');
        return;
      }
    }

    confirm({
      title: '確定要執行部署嗎？',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>
            此操作將會：
          </Paragraph>
          <ul>
            <li>為 {previewData?.total_users} 位使用者生成數位名片</li>
            <li>將所有檔案推送到 GitHub Repository</li>
            <li>覆蓋現有的部署內容</li>
          </ul>
          <Paragraph type="secondary">
            部署完成後，所有名片將可透過 GitHub Pages 訪問。
          </Paragraph>
        </div>
      ),
      okText: '確定部署',
      okType: 'primary',
      cancelText: '取消',
      onOk() {
        deployMutation.mutate();
      }
    });
  };

  const isLoading = statusLoading || previewLoading;

  if (isLoading) {
    return (
      <div className="loading-container">
        <SyncOutlined spin style={{ fontSize: '24px' }} />
        <div style={{ marginTop: 16 }}>載入部署資訊...</div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} className="page-title">部署管理</Title>
            <Text className="page-description">
              將數位名片部署到 GitHub Pages
            </Text>
          </div>
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => navigate('/settings')}
            >
              GitHub 設定
            </Button>
            <Button
              type="primary"
              icon={<RocketOutlined />}
              onClick={handleDeploy}
              disabled={!canDeploy || deploying}
              loading={deploying}
            >
              {deploying ? '部署中...' : '執行部署'}
            </Button>
          </Space>
        </div>
      </div>

      {/* 部署進度 */}
      {deploying && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={4}>正在部署...</Title>
            <Progress 
              percent={deployProgress} 
              status="active"
              style={{ marginBottom: 16 }}
            />
            <Text type="secondary">
              {deployProgress < 30 && '準備部署環境...'}
              {deployProgress >= 30 && deployProgress < 60 && '生成名片檔案...'}
              {deployProgress >= 60 && deployProgress < 90 && '推送到 GitHub...'}
              {deployProgress >= 90 && '完成部署...'}
            </Text>
          </div>
        </Card>
      )}

      {/* 系統狀態檢查 */}
      {!isConfigured && (
        <Alert
          message="需要設定 GitHub"
          description="請先前往系統設定頁面配置 GitHub Repository 和 Personal Access Token"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={() => navigate('/settings')}>
              前往設定
            </Button>
          }
        />
      )}

      {isConfigured && previewData?.total_users === 0 && (
        <Alert
          message="沒有使用者資料"
          description="請先新增使用者資料後再執行部署"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={() => navigate('/users/new')}>
              新增使用者
            </Button>
          }
        />
      )}

      <Row gutter={[24, 24]}>
        {/* 部署狀態 */}
        <Col xs={24} lg={12}>
          <Card title="部署狀態">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="GitHub 設定"
                  value={isConfigured ? '已設定' : '未設定'}
                  prefix={
                    isConfigured ? 
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                    <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                  }
                  valueStyle={{ 
                    color: isConfigured ? '#52c41a' : '#faad14',
                    fontSize: '16px'
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="部署功能"
                  value={isEnabled ? '已啟用' : '未啟用'}
                  prefix={
                    isEnabled ? 
                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                    <SyncOutlined style={{ color: '#8c8c8c' }} />
                  }
                  valueStyle={{ 
                    color: isEnabled ? '#52c41a' : '#8c8c8c',
                    fontSize: '16px'
                  }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="使用者數量"
                  value={previewData?.total_users || 0}
                  prefix={<DeploymentUnitOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="最後部署"
                  value={deployStatus?.last_deployment ? 
                    moment(deployStatus.last_deployment).fromNow() : 
                    '從未部署'
                  }
                  valueStyle={{ 
                    color: deployStatus?.last_deployment ? '#1890ff' : '#8c8c8c',
                    fontSize: '14px'
                  }}
                />
              </Col>
            </Row>

            <Divider />

            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => deployAPI.previewDeployment().then(data => {
                  Modal.info({
                    title: '部署預覽',
                    width: 600,
                    content: (
                      <div>
                        <Paragraph>將為以下使用者生成數位名片：</Paragraph>
                        <List
                          dataSource={data.data.users.slice(0, 5)}
                          renderItem={user => (
                            <List.Item>
                              <Text>{user.full_name}</Text>
                              <Tag color="blue">{user.employee_id}</Tag>
                            </List.Item>
                          )}
                        />
                        {data.data.users.length > 5 && (
                          <Text type="secondary">...及其他 {data.data.users.length - 5} 位使用者</Text>
                        )}
                      </div>
                    )
                  });
                })}
              >
                預覽部署
              </Button>
              <Button
                icon={<GithubOutlined />}
                onClick={() => testConnectionMutation.mutate()}
                loading={testConnectionMutation.isLoading}
                disabled={!isConfigured}
              >
                測試連接
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 部署歷史 */}
        <Col xs={24} lg={12}>
          <Card title="部署說明">
            <Timeline>
              <Timeline.Item color="blue">
                <Text strong>準備階段</Text>
                <br />
                <Text type="secondary">檢查系統設定和使用者資料</Text>
              </Timeline.Item>
              <Timeline.Item color="blue">
                <Text strong>生成檔案</Text>
                <br />
                <Text type="secondary">為每位使用者生成 HTML 和 vCard 檔案</Text>
              </Timeline.Item>
              <Timeline.Item color="blue">
                <Text strong>處理資源</Text>
                <br />
                <Text type="secondary">最佳化圖片並整理靜態資源</Text>
              </Timeline.Item>
              <Timeline.Item color="green">
                <Text strong>推送部署</Text>
                <br />
                <Text type="secondary">將所有檔案推送到 GitHub Repository</Text>
              </Timeline.Item>
            </Timeline>

            <Divider />

            <div>
              <Title level={5}>部署後網址格式</Title>
              <Text code style={{ display: 'block', padding: '8px', background: '#f5f5f5' }}>
                https://username.github.io/repo-name/員工編號/
              </Text>
              <Text type="secondary" style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>
                每位使用者都會有獨立的網址路徑，可寫入 NFC 晶片或生成 QR 碼
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 使用者列表預覽 */}
      {previewData?.users && previewData.users.length > 0 && (
        <Card title="即將部署的使用者" style={{ marginTop: 24 }}>
          <List
            dataSource={previewData.users}
            renderItem={(user) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    size="small"
                    onClick={() => window.open(`/api/template/preview/${user.employee_id}`, '_blank')}
                  >
                    預覽
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{user.full_name}</span>
                      <Tag color="blue">{user.employee_id}</Tag>
                    </Space>
                  }
                  description={
                    <Text type="secondary">
                      部署後網址: {githubStatus?.repository_url ? 
                        `${githubStatus.repository_url.replace('github.com', 'github.io').replace('.git', '')}/${user.employee_id}/` :
                        `username.github.io/repo-name/${user.employee_id}/`
                      }
                    </Text>
                  }
                />
              </List.Item>
            )}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showQuickJumper: true
            }}
          />
        </Card>
      )}
    </div>
  );
};

export default Deploy;