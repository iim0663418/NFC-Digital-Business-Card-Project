import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Alert,
  message,
  Divider,
  Tag,
  Row,
  Col,
  Modal,
  Spin
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  TestOutlined,
  DeleteOutlined,
  GithubOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { settingsAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

const Settings = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [testingConnection, setTestingConnection] = useState(false);

  // 載入 GitHub 設定狀態
  const { data: githubStatus, isLoading } = useQuery(
    'github-status',
    settingsAPI.getGitHubStatus,
    {
      onSuccess: (data) => {
        if (data.repository_url !== '未設定') {
          // 如果已設定，取得完整的設定資料
          settingsAPI.getSetting('github_repository_url')
            .then(response => {
              form.setFieldsValue({
                repository_url: response.data.value
              });
            });
        }
      }
    }
  );

  // 設定 GitHub 配置
  const saveConfigMutation = useMutation(
    ({ repository_url, access_token }) => 
      settingsAPI.setGitHubConfig(repository_url, access_token),
    {
      onSuccess: () => {
        message.success('GitHub 設定儲存成功');
        queryClient.invalidateQueries('github-status');
        form.resetFields(['access_token']); // 清除 token 欄位
      },
      onError: (error) => {
        message.error(`設定失敗: ${error.message}`);
      }
    }
  );

  // 測試連接
  const testConnectionMutation = useMutation(
    settingsAPI.testGitHubConnection,
    {
      onSuccess: () => {
        message.success('GitHub 連接測試成功');
      },
      onError: (error) => {
        message.error(`連接測試失敗: ${error.message}`);
      }
    }
  );

  // 重置設定
  const resetConfigMutation = useMutation(
    settingsAPI.resetGitHubConfig,
    {
      onSuccess: () => {
        message.success('GitHub 設定已重置');
        queryClient.invalidateQueries('github-status');
        form.resetFields();
      },
      onError: (error) => {
        message.error(`重置失敗: ${error.message}`);
      }
    }
  );

  // 處理表單提交
  const handleSubmit = (values) => {
    if (!values.repository_url || !values.access_token) {
      message.error('請填寫完整的 Repository URL 和 Access Token');
      return;
    }

    saveConfigMutation.mutate(values);
  };

  // 測試連接
  const handleTestConnection = async () => {
    if (!githubStatus?.github_configured) {
      message.warning('請先儲存 GitHub 設定後再測試連接');
      return;
    }

    setTestingConnection(true);
    try {
      await testConnectionMutation.mutateAsync();
    } finally {
      setTestingConnection(false);
    }
  };

  // 重置設定
  const handleResetConfig = () => {
    confirm({
      title: '確定要重置 GitHub 設定嗎？',
      icon: <ExclamationCircleOutlined />,
      content: '重置後將無法執行部署功能，直到重新設定為止。',
      okText: '確定重置',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        resetConfigMutation.mutate();
      }
    });
  };

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
        <Title level={2} className="page-title">系統設定</Title>
        <Text className="page-description">
          設定 GitHub Repository 與 Personal Access Token 以啟用部署功能
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title={
            <Space>
              <GithubOutlined />
              GitHub 部署設定
            </Space>
          }>
            {/* 當前狀態顯示 */}
            <Alert
              message="設定狀態"
              description={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>Repository URL: </Text>
                    <Tag color={githubStatus?.repository_url !== '未設定' ? 'green' : 'red'}>
                      {githubStatus?.repository_url}
                    </Tag>
                  </div>
                  <div>
                    <Text>Access Token: </Text>
                    <Tag color={githubStatus?.access_token !== '未設定' ? 'green' : 'red'}>
                      {githubStatus?.access_token}
                    </Tag>
                  </div>
                  <div>
                    <Text>整體狀態: </Text>
                    <Tag 
                      color={githubStatus?.is_configured ? 'green' : 'orange'}
                      icon={githubStatus?.is_configured ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                    >
                      {githubStatus?.is_configured ? '已設定完成' : '需要設定'}
                    </Tag>
                  </div>
                </Space>
              }
              type={githubStatus?.is_configured ? 'success' : 'warning'}
              style={{ marginBottom: 24 }}
            />

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                repository_url: '',
                access_token: ''
              }}
            >
              <Form.Item
                label="GitHub Repository URL"
                name="repository_url"
                rules={[
                  { required: true, message: '請輸入 Repository URL' },
                  { type: 'url', message: '請輸入有效的 URL' },
                  { 
                    pattern: /github\.com/, 
                    message: 'URL 必須是 GitHub Repository' 
                  }
                ]}
                extra="例如: https://github.com/username/repository-name"
              >
                <Input 
                  placeholder="https://github.com/username/repository-name"
                  prefix={<GithubOutlined />}
                />
              </Form.Item>

              <Form.Item
                label="Personal Access Token"
                name="access_token"
                rules={[
                  { required: true, message: '請輸入 GitHub Personal Access Token' },
                  { min: 40, message: 'Token 長度至少需要 40 個字元' }
                ]}
                extra={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">
                      需要有 Repository 的寫入權限 (repo scope)
                    </Text>
                    <Text type="secondary">
                      如何建立 Token: 
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => window.open('https://github.com/settings/tokens/new', '_blank')}
                      >
                        前往 GitHub 設定 →
                      </Button>
                    </Text>
                  </Space>
                }
              >
                <Input.Password 
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={saveConfigMutation.isLoading}
                  >
                    儲存設定
                  </Button>
                  <Button
                    icon={<TestOutlined />}
                    onClick={handleTestConnection}
                    loading={testingConnection}
                    disabled={!githubStatus?.is_configured}
                  >
                    測試連接
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleResetConfig}
                    loading={resetConfigMutation.isLoading}
                    disabled={!githubStatus?.is_configured}
                  >
                    重置設定
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="設定說明">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Title level={5}>1. 建立 GitHub Repository</Title>
                <Paragraph type="secondary">
                  在 GitHub 上建立一個新的 Repository，這將用來儲存生成的數位名片檔案。
                </Paragraph>
              </div>

              <Divider />

              <div>
                <Title level={5}>2. 建立 Personal Access Token</Title>
                <Paragraph type="secondary">
                  前往 GitHub Settings → Developer settings → Personal access tokens，
                  建立一個具有 repo 權限的 Token。
                </Paragraph>
              </div>

              <Divider />

              <div>
                <Title level={5}>3. 啟用 GitHub Pages</Title>
                <Paragraph type="secondary">
                  在 Repository 設定中啟用 GitHub Pages，選擇 main branch 作為來源。
                </Paragraph>
              </div>

              <Divider />

              <div>
                <Title level={5}>注意事項</Title>
                <ul style={{ paddingLeft: 16, color: '#8c8c8c' }}>
                  <li>Token 一旦設定後將無法再次查看，請妥善保管</li>
                  <li>Repository 必須是公開的才能使用 GitHub Pages</li>
                  <li>部署後的名片網址格式為: username.github.io/repo-name/員工編號/</li>
                </ul>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;