import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Avatar,
  Modal,
  message,
  Tooltip,
  Select,
  Card,
  Row,
  Col,
  Popconfirm,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LinkedinOutlined,
  GithubOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { usersAPI } from '../services/api';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const UserList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchText, setSearchText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // 載入使用者列表
  const { data, isLoading, refetch } = useQuery(
    ['users', pagination.current, pagination.pageSize, searchText, selectedDepartment, selectedUnit],
    () => usersAPI.getUsers({
      page: pagination.current,
      limit: pagination.pageSize,
      search: searchText || undefined,
      department: selectedDepartment || undefined,
      unit: selectedUnit || undefined
    }),
    {
      keepPreviousData: true,
      onSuccess: (data) => {
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total
        }));
      }
    }
  );

  // 刪除使用者
  const deleteMutation = useMutation(usersAPI.deleteUser, {
    onSuccess: () => {
      message.success('使用者刪除成功');
      queryClient.invalidateQueries('users');
    },
    onError: (error) => {
      message.error(`刪除失敗: ${error.message}`);
    }
  });

  const users = data?.users || [];
  const allDepartments = [...new Set(users.map(user => user.department))];
  const allUnits = [...new Set(users.map(user => user.unit))];

  // 處理搜尋
  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 處理篩選
  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
    setSelectedUnit(''); // 重置單位篩選
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleUnitChange = (value) => {
    setSelectedUnit(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 處理分頁
  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  // 處理刪除
  const handleDelete = (employeeId) => {
    deleteMutation.mutate(employeeId);
  };

  // 清除篩選
  const handleClearFilters = () => {
    setSearchText('');
    setSelectedDepartment('');
    setSelectedUnit('');
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 表格欄位定義
  const columns = [
    {
      title: '頭像',
      dataIndex: 'photo_url',
      key: 'photo',
      width: 80,
      render: (photoUrl, record) => (
        <Avatar 
          size={40}
          src={photoUrl ? `/uploads/photos/${photoUrl.split('/').pop()}` : null}
          icon={<UserOutlined />}
        />
      )
    },
    {
      title: '基本資訊',
      key: 'basic_info',
      render: (record) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: '14px' }}>
            {record.full_name}
          </div>
          <div>
            <Tag color="blue">{record.employee_id}</Tag>
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.title}
          </Text>
        </div>
      )
    },
    {
      title: '部門/單位',
      key: 'department_unit',
      render: (record) => (
        <div>
          <div style={{ fontSize: '14px' }}>{record.department}</div>
          {record.unit && record.unit !== record.department && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.unit}
            </Text>
          )}
        </div>
      )
    },
    {
      title: '聯絡資訊',
      key: 'contact',
      render: (record) => (
        <Space direction="vertical" size="small">
          <Space size="small">
            <MailOutlined style={{ color: '#1890ff' }} />
            <Text style={{ fontSize: '12px' }}>{record.email}</Text>
          </Space>
          {record.phone && (
            <Space size="small">
              <PhoneOutlined style={{ color: '#52c41a' }} />
              <Text style={{ fontSize: '12px' }}>{record.phone}</Text>
            </Space>
          )}
        </Space>
      )
    },
    {
      title: '社群連結',
      key: 'social',
      render: (record) => (
        <Space>
          {record.linkedin_url && (
            <Tooltip title="LinkedIn">
              <Button 
                type="text" 
                size="small"
                icon={<LinkedinOutlined />}
                onClick={() => window.open(record.linkedin_url, '_blank')}
              />
            </Tooltip>
          )}
          {record.github_url && (
            <Tooltip title="GitHub">
              <Button 
                type="text" 
                size="small"
                icon={<GithubOutlined />}
                onClick={() => window.open(record.github_url, '_blank')}
              />
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '建立時間',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => (
        <Text style={{ fontSize: '12px' }}>
          {moment(date).format('YYYY-MM-DD')}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (record) => (
        <Space size="small">
          <Tooltip title="預覽名片">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => window.open(`/api/template/preview/${record.employee_id}`, '_blank')}
            />
          </Tooltip>
          <Tooltip title="編輯">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/users/edit/${record.employee_id}`)}
            />
          </Tooltip>
          <Tooltip title="下載vCard">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => window.open(`/api/template/vcard/${record.employee_id}`, '_blank')}
            />
          </Tooltip>
          <Popconfirm
            title="確定要刪除此使用者嗎？"
            description="刪除後將無法恢復，且會影響已部署的名片。"
            onConfirm={() => handleDelete(record.employee_id)}
            okText="確定"
            cancelText="取消"
          >
            <Tooltip title="刪除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isLoading}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} className="page-title">使用者管理</Title>
            <Text className="page-description">
              管理所有數位名片使用者資料
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/users/new')}
          >
            新增使用者
          </Button>
        </div>
      </div>

      {/* 搜尋和篩選區域 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="搜尋姓名、員工編號或電子郵件"
              allowClear
              enterButton={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="選擇部門"
              allowClear
              style={{ width: '100%' }}
              value={selectedDepartment}
              onChange={handleDepartmentChange}
            >
              {allDepartments.map(dept => (
                <Option key={dept} value={dept}>{dept}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="選擇單位"
              allowClear
              style={{ width: '100%' }}
              value={selectedUnit}
              onChange={handleUnitChange}
              disabled={!selectedDepartment}
            >
              {allUnits
                .filter(unit => !selectedDepartment || users.some(user => 
                  user.department === selectedDepartment && user.unit === unit
                ))
                .map(unit => (
                  <Option key={unit} value={unit}>{unit}</Option>
                ))
              }
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                loading={isLoading}
              >
                重新整理
              </Button>
              <Button onClick={handleClearFilters}>
                清除篩選
              </Button>
              <Text type="secondary">
                共 {pagination.total} 位使用者
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 使用者表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="employee_id"
          loading={isLoading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default UserList;