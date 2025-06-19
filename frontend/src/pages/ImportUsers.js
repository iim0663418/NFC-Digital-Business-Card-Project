import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import {
  Card,
  Upload,
  Button,
  Typography,
  Steps,
  Table,
  Alert,
  Space,
  Checkbox,
  message,
  Row,
  Col,
  Divider,
  Tag,
  Progress
} from 'antd';
import {
  CloudUploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { importAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Dragger } = Upload;

const ImportUsers = () => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // 下載範本
  const downloadTemplateMutation = useMutation(
    importAPI.downloadTemplate,
    {
      onSuccess: (response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'digital-business-cards-template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        message.success('範本下載成功');
      },
      onError: (error) => {
        message.error(`範本下載失敗: ${error.message}`);
      }
    }
  );

  // 預覽匯入檔案
  const previewMutation = useMutation(
    importAPI.previewImport,
    {
      onSuccess: (response) => {
        setPreviewData(response.data);
        setCurrentStep(1);
        message.success('檔案解析成功');
      },
      onError: (error) => {
        message.error(`檔案解析失敗: ${error.message}`);
        setSelectedFile(null);
      }
    }
  );

  // 執行匯入
  const importMutation = useMutation(
    ({ file, updateExisting }) => importAPI.importUsers(file, updateExisting),
    {
      onSuccess: (response) => {
        setImportResult(response.data);
        setCurrentStep(2);
        queryClient.invalidateQueries('users');
        message.success('使用者匯入完成');
      },
      onError: (error) => {
        message.error(`匯入失敗: ${error.message}`);
      }
    }
  );

  // 處理檔案上傳
  const handleFileUpload = ({ file }) => {
    if (file.type && !file.type.includes('spreadsheet') && !file.type.includes('excel') && !file.type.includes('csv')) {
      message.error('請上傳 Excel (.xlsx, .xls) 或 CSV 檔案');
      return false;
    }

    setSelectedFile(file);
    previewMutation.mutate(file);
    return false; // 阻止自動上傳
  };

  // 執行匯入
  const handleImport = () => {
    if (!selectedFile) {
      message.error('請先選擇檔案');
      return;
    }

    importMutation.mutate({
      file: selectedFile,
      updateExisting: updateExisting
    });
  };

  // 重新開始
  const handleReset = () => {
    setCurrentStep(0);
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setUpdateExisting(false);
  };

  // 預覽表格欄位
  const previewColumns = previewData?.columns?.map((col, index) => ({
    title: col,
    dataIndex: index,
    key: col,
    width: 150,
    render: (text) => (
      <Text style={{ fontSize: '12px' }}>
        {text || '-'}
      </Text>
    )
  })) || [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <Title level={2} className="page-title">批次匯入使用者</Title>
        <Text className="page-description">
          透過 Excel 或 CSV 檔案批次匯入多位使用者資料
        </Text>
      </div>

      {/* 進度指示器 */}
      <Card style={{ marginBottom: 24 }}>
        <Steps current={currentStep}>
          <Step 
            title="上傳檔案" 
            description="選擇要匯入的檔案"
            icon={<CloudUploadOutlined />}
          />
          <Step 
            title="預覽資料" 
            description="確認匯入內容"
            icon={<FileExcelOutlined />}
          />
          <Step 
            title="匯入完成" 
            description="查看匯入結果"
            icon={<CheckCircleOutlined />}
          />
        </Steps>
      </Card>

      {/* 步驟 0: 上傳檔案 */}
      {currentStep === 0 && (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card title="上傳檔案">
              <Dragger
                beforeUpload={handleFileUpload}
                showUploadList={false}
                accept=".xlsx,.xls,.csv"
                disabled={previewMutation.isLoading}
              >
                <p className="ant-upload-drag-icon">
                  <CloudUploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">
                  點擊或拖拽檔案到此區域上傳
                </p>
                <p className="ant-upload-hint">
                  支援 Excel (.xlsx, .xls) 和 CSV 檔案格式
                </p>
              </Dragger>

              {previewMutation.isLoading && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Progress percent={50} status="active" />
                  <Text>正在解析檔案...</Text>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="使用說明">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Title level={5}>1. 下載範本</Title>
                  <Paragraph type="secondary">
                    建議先下載範本檔案，了解所需的欄位格式
                  </Paragraph>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => downloadTemplateMutation.mutate()}
                    loading={downloadTemplateMutation.isLoading}
                    block
                  >
                    下載 Excel 範本
                  </Button>
                </div>

                <Divider />

                <div>
                  <Title level={5}>2. 必要欄位</Title>
                  <ul style={{ paddingLeft: 16, color: '#8c8c8c' }}>
                    <li>employee_id (員工編號)</li>
                    <li>full_name (姓名)</li>
                    <li>title (職稱)</li>
                    <li>department (部門)</li>
                    <li>unit (單位)</li>
                    <li>email (電子郵件)</li>
                  </ul>
                </div>

                <Divider />

                <div>
                  <Title level={5}>3. 注意事項</Title>
                  <ul style={{ paddingLeft: 16, color: '#8c8c8c' }}>
                    <li>員工編號必須唯一</li>
                    <li>電子郵件格式必須正確</li>
                    <li>檔案大小限制 50MB</li>
                  </ul>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* 步驟 1: 預覽資料 */}
      {currentStep === 1 && previewData && (
        <div>
          <Card 
            title="資料預覽"
            extra={
              <Space>
                <Button onClick={handleReset}>重新選擇檔案</Button>
              </Space>
            }
          >
            {/* 驗證結果 */}
            <Alert
              message="檔案驗證結果"
              description={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>總行數: </Text>
                    <Tag color="blue">{previewData.total_rows}</Tag>
                    <Text>檔案格式: </Text>
                    <Tag color={previewData.is_valid ? 'green' : 'red'}>
                      {previewData.is_valid ? '有效' : '無效'}
                    </Tag>
                  </div>
                  {previewData.validation_errors?.length > 0 && (
                    <div>
                      <Text type="danger">驗證錯誤:</Text>
                      <ul style={{ marginTop: 8, color: '#ff4d4f' }}>
                        {previewData.validation_errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Space>
              }
              type={previewData.is_valid ? 'success' : 'error'}
              style={{ marginBottom: 16 }}
            />

            {/* 資料預覽表格 */}
            {previewData.preview && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>資料預覽 (前 10 行):</Text>
                </div>
                <Table
                  columns={previewColumns}
                  dataSource={previewData.preview.slice(1).map((row, index) => ({
                    ...row.reduce((obj, cell, cellIndex) => {
                      obj[cellIndex] = cell;
                      return obj;
                    }, {}),
                    key: index
                  }))}
                  pagination={false}
                  scroll={{ x: 1200 }}
                  size="small"
                />
              </div>
            )}

            {/* 匯入選項 */}
            <div style={{ marginTop: 24 }}>
              <Checkbox
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
              >
                更新現有使用者資料 (如果員工編號已存在)
              </Checkbox>
            </div>

            {/* 執行匯入按鈕 */}
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={handleReset}>
                  取消
                </Button>
                <Button
                  type="primary"
                  icon={<ImportOutlined />}
                  onClick={handleImport}
                  loading={importMutation.isLoading}
                  disabled={!previewData.is_valid}
                >
                  開始匯入
                </Button>
              </Space>
            </div>
          </Card>
        </div>
      )}

      {/* 步驟 2: 匯入結果 */}
      {currentStep === 2 && importResult && (
        <Card title="匯入完成">
          <Alert
            message="匯入結果"
            description={
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                      {importResult.summary.created}
                    </div>
                    <div>新建</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                      {importResult.summary.updated}
                    </div>
                    <div>更新</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                      {importResult.summary.skipped}
                    </div>
                    <div>跳過</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                      {importResult.summary.errors}
                    </div>
                    <div>錯誤</div>
                  </div>
                </Col>
              </Row>
            }
            type="success"
            style={{ marginBottom: 24 }}
          />

          {/* 錯誤詳情 */}
          {importResult.details.errors?.length > 0 && (
            <Card title="錯誤詳情" style={{ marginBottom: 16 }}>
              <Table
                columns={[
                  { title: '行號', dataIndex: 'row', key: 'row', width: 80 },
                  { title: '錯誤訊息', dataIndex: 'error', key: 'error' }
                ]}
                dataSource={importResult.details.errors}
                rowKey="row"
                pagination={false}
                size="small"
              />
            </Card>
          )}

          <div style={{ textAlign: 'center' }}>
            <Space>
              <Button onClick={handleReset}>
                匯入更多檔案
              </Button>
              <Button type="primary" onClick={() => window.location.href = '/users'}>
                查看使用者列表
              </Button>
            </Space>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImportUsers;