import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Form,
  Input,
  Button,
  Card,
  Upload,
  Typography,
  Space,
  Row,
  Col,
  message,
  Avatar,
  Divider,
  Spin
} from 'antd';
import {
  UserOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { usersAPI, uploadAPI } from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const UserForm = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const isEdit = Boolean(employeeId);

  // 載入使用者資料（編輯模式）
  const { data: userData, isLoading } = useQuery(
    ['user', employeeId],
    () => usersAPI.getUser(employeeId),
    {
      enabled: isEdit,
      onSuccess: (data) => {
        form.setFieldsValue(data.data);
        setPhotoUrl(data.data.photo_url);
      }
    }
  );

  // 創建/更新使用者
  const saveMutation = useMutation(
    (data) => isEdit ? 
      usersAPI.updateUser(employeeId, data) : 
      usersAPI.createUser(data),
    {
      onSuccess: () => {
        message.success(`使用者${isEdit ? '更新' : '創建'}成功`);
        queryClient.invalidateQueries('users');
        navigate('/users');
      },
      onError: (error) => {
        message.error(`${isEdit ? '更新' : '創建'}失敗: ${error.message}`);
      }
    }
  );

  // 上傳照片
  const handlePhotoUpload = async (file) => {
    setUploading(true);
    try {
      const response = await uploadAPI.uploadPhoto(file, employeeId);
      setPhotoUrl(response.data.photo_url);
      form.setFieldsValue({ photo_url: response.data.photo_url });
      message.success('照片上傳成功');
    } catch (error) {
      message.error(`照片上傳失敗: ${error.message}`);
    } finally {
      setUploading(false);
    }
    return false; // 阻止預設上傳行為
  };

  // 表單提交
  const handleSubmit = (values) => {
    saveMutation.mutate(values);
  };

  // 預覽名片
  const handlePreview = () => {
    if (!employeeId) {
      message.warning('請先儲存使用者資料後再預覽');
      return;
    }
    window.open(`/api/template/preview/${employeeId}`, '_blank');
  };

  if (isEdit && isLoading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/users')}
              style={{ marginBottom: 16 }}
            >
              返回列表
            </Button>
            <Title level={2} className="page-title">
              {isEdit ? '編輯使用者' : '新增使用者'}
            </Title>
            <Text className="page-description">
              {isEdit ? '編輯現有使用者的數位名片資料' : '創建新的數位名片使用者'}
            </Text>
          </div>
          {isEdit && (
            <Button
              icon={<EyeOutlined />}
              onClick={handlePreview}
            >
              預覽名片
            </Button>
          )}
        </div>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="基本資訊">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                employee_id: '',
                full_name: '',
                title: '',
                department: '',
                unit: '',
                email: '',
                phone: '',
                address: '',
                linkedin_url: '',
                github_url: '',
                photo_url: ''
              }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="員工編號"
                    name="employee_id"
                    rules={[
                      { required: true, message: '請輸入員工編號' },
                      { pattern: /^[A-Z0-9]+$/, message: '員工編號只能包含大寫字母和數字' }
                    ]}
                  >
                    <Input 
                      placeholder="例如: E001"
                      disabled={isEdit}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="姓名"
                    name="full_name"
                    rules={[{ required: true, message: '請輸入姓名' }]}
                  >
                    <Input placeholder="請輸入完整姓名" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="職稱"
                    name="title"
                    rules={[{ required: true, message: '請輸入職稱' }]}
                  >
                    <Input placeholder="例如: 工程師、經理" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="部門"
                    name="department"
                    rules={[{ required: true, message: '請輸入部門' }]}
                  >
                    <Input placeholder="例如: 資訊部" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="單位"
                    name="unit"
                    rules={[{ required: true, message: '請輸入單位' }]}
                  >
                    <Input placeholder="例如: 系統開發組" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="電子郵件"
                    name="email"
                    rules={[
                      { required: true, message: '請輸入電子郵件' },
                      { type: 'email', message: '請輸入有效的電子郵件格式' }
                    ]}
                  >
                    <Input placeholder="example@company.com" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="電話"
                    name="phone"
                  >
                    <Input placeholder="+886-2-1234-5678" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="地址"
                    name="address"
                  >
                    <Input placeholder="公司地址" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">社群連結</Divider>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="LinkedIn"
                    name="linkedin_url"
                    rules={[
                      { type: 'url', message: '請輸入有效的 URL' }
                    ]}
                  >
                    <Input placeholder="https://www.linkedin.com/in/username" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="GitHub"
                    name="github_url"
                    rules={[
                      { type: 'url', message: '請輸入有效的 URL' }
                    ]}
                  >
                    <Input placeholder="https://github.com/username" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="photo_url" hidden>
                <Input />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={saveMutation.isLoading}
                  >
                    {isEdit ? '更新' : '創建'}
                  </Button>
                  <Button onClick={() => navigate('/users')}>
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="大頭照">
            <div style={{ textAlign: 'center' }}>
              <Avatar
                size={120}
                src={photoUrl ? `/uploads/photos/${photoUrl.split('/').pop()}` : null}
                icon={<UserOutlined />}
                style={{ marginBottom: 16 }}
              />
              <br />
              <Upload
                beforeUpload={handlePhotoUpload}
                showUploadList={false}
                accept="image/*"
                disabled={uploading}
              >
                <Button 
                  icon={<UploadOutlined />}
                  loading={uploading}
                  block
                >
                  {uploading ? '上傳中...' : '上傳照片'}
                </Button>
              </Upload>
              <Text type="secondary" style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>
                建議上傳 300x300 像素的正方形照片，檔案大小不超過 10MB
              </Text>
            </div>
          </Card>

          {isEdit && (
            <Card title="操作" style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  block
                  icon={<EyeOutlined />}
                  onClick={handlePreview}
                >
                  預覽名片
                </Button>
                <Button 
                  block
                  onClick={() => window.open(`/api/template/vcard/${employeeId}`, '_blank')}
                >
                  下載 vCard
                </Button>
              </Space>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default UserForm;