import axios from 'axios';

// 建立 axios 實例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 可以在這裡添加認證 token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// 回應攔截器
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // 統一錯誤處理
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // 未授權，可以重定向到登入頁面
          console.error('Unauthorized access');
          break;
        case 403:
          console.error('Forbidden access');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Internal server error');
          break;
        default:
          console.error(`Error ${status}: ${data.message || 'Unknown error'}`);
      }
      
      return Promise.reject({
        status,
        message: data.message || 'Request failed',
        details: data.details || null
      });
    } else if (error.request) {
      console.error('Network error:', error.request);
      return Promise.reject({
        status: 0,
        message: '網路連線異常，請檢查您的網路連線',
        details: null
      });
    } else {
      console.error('Request setup error:', error.message);
      return Promise.reject({
        status: -1,
        message: error.message || 'Request setup failed',
        details: null
      });
    }
  }
);

// API 服務函數

// 使用者相關 API
export const usersAPI = {
  // 取得使用者列表
  getUsers: (params = {}) => 
    api.get('/users', { params }),
  
  // 取得單個使用者
  getUser: (employeeId) => 
    api.get(`/users/${employeeId}`),
  
  // 建立使用者
  createUser: (userData) => 
    api.post('/users', userData),
  
  // 更新使用者
  updateUser: (employeeId, userData) => 
    api.put(`/users/${employeeId}`, userData),
  
  // 刪除使用者
  deleteUser: (employeeId) => 
    api.delete(`/users/${employeeId}`),
  
  // 搜尋使用者
  searchUsers: (query) => 
    api.get(`/users/search/${encodeURIComponent(query)}`)
};

// 檔案上傳相關 API
export const uploadAPI = {
  // 上傳照片
  uploadPhoto: (file, employeeId) => {
    const formData = new FormData();
    formData.append('photo', file);
    if (employeeId) {
      formData.append('employee_id', employeeId);
    }
    
    return api.post('/upload/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // 批次上傳照片
  uploadPhotos: (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('photos', file);
    });
    
    return api.post('/upload/photos/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // 刪除照片
  deletePhoto: (filename) => 
    api.delete(`/upload/photo/${filename}`),
  
  // 取得照片資訊
  getPhotoInfo: (filename) => 
    api.get(`/upload/photo/${filename}/info`)
};

// 匯入相關 API
export const importAPI = {
  // 下載匯入範本
  downloadTemplate: () => 
    api.get('/import/template', {
      responseType: 'blob',
    }),
  
  // 預覽匯入檔案
  previewImport: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // 執行匯入
  importUsers: (file, updateExisting = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('update_existing', updateExisting);
    
    return api.post('/import/users', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};

// 系統設定相關 API
export const settingsAPI = {
  // 取得所有設定
  getSettings: () => 
    api.get('/settings'),
  
  // 取得特定設定
  getSetting: (key) => 
    api.get(`/settings/${key}`),
  
  // 更新設定
  updateSetting: (key, value, description) => 
    api.put(`/settings/${key}`, { value, description }),
  
  // 取得 GitHub 設定狀態
  getGitHubStatus: () => 
    api.get('/settings/github/status'),
  
  // 設定 GitHub 配置
  setGitHubConfig: (repositoryUrl, accessToken) => 
    api.post('/settings/github', {
      repository_url: repositoryUrl,
      access_token: accessToken
    }),
  
  // 測試 GitHub 連接
  testGitHubConnection: () => 
    api.post('/settings/github/test'),
  
  // 重置 GitHub 設定
  resetGitHubConfig: () => 
    api.delete('/settings/github')
};

// 部署相關 API
export const deployAPI = {
  // 取得部署狀態
  getDeployStatus: () => 
    api.get('/deploy/status'),
  
  // 執行部署
  executeDeployment: () => 
    api.post('/deploy/execute'),
  
  // 預覽部署內容
  previewDeployment: () => 
    api.get('/deploy/preview'),
  
  // 測試 GitHub 連接
  testConnection: () => 
    api.post('/deploy/test-connection')
};

// 範本相關 API
export const templateAPI = {
  // 生成單個使用者的 HTML
  generateHTML: (employeeId) => 
    api.get(`/template/generate/${employeeId}`),
  
  // 生成單個使用者的 vCard
  generateVCard: (employeeId) => 
    api.get(`/template/vcard/${employeeId}`),
  
  // 預覽名片
  previewCard: (employeeId) => 
    api.get(`/template/preview/${employeeId}`),
  
  // 批次生成所有檔案
  generateAll: () => 
    api.post('/template/generate-all')
};

// 系統健康檢查
export const healthAPI = {
  check: () => api.get('/health', { baseURL: '/' })
};

export default api;