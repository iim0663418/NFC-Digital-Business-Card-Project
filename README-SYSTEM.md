# 多人數位名片管理與部署系統

基於原有的數位名片專案，擴展為支援多人管理的後台系統，實現集中化管理與自動部署功能。

## 📋 系統概覽

本系統將原本的單人數位名片擴展為多人管理系統，提供完整的後台管理介面，支援批次匯入、圖片處理、模板渲染與自動部署功能。

### 🎯 核心功能

- **集中化管理**: 統一管理多位使用者的數位名片資料
- **批次操作**: 支援 Excel/CSV 檔案批次匯入使用者資料
- **圖片處理**: 自動最佳化大頭照，符合 PHOTO-GUIDE.md 建議
- **模板渲染**: 基於現有名片模板動態生成 HTML 和 vCard 檔案
- **自動部署**: 一鍵部署到 GitHub Pages，每位使用者擁有獨立網址

### 📁 專案結構

```
├── backend/                 # Node.js 後端 API
│   ├── config/             # 資料庫設定
│   ├── models/             # 資料模型
│   ├── routes/             # API 路由
│   ├── templates/          # EJS 模板
│   └── uploads/            # 檔案上傳目錄
├── frontend/               # React 前端管理介面
│   ├── public/             # 靜態資源
│   ├── src/                # 源碼
│   │   ├── pages/          # 頁面組件
│   │   └── services/       # API 服務
│   └── nginx.conf          # Nginx 設定
├── database/               # 資料庫架構
│   └── schema.sql          # PostgreSQL 資料表結構
├── docker-compose.yml      # Docker 容器編排
├── .env.example           # 環境變數範例
└── 原有檔案 (index.html, contact.vcf, assets/ 等)
```

## 🚀 快速開始

### 1. 環境準備

```bash
# 複製環境變數設定
cp .env.example .env

# 編輯環境變數 (設定資料庫密碼、JWT密鑰等)
vim .env
```

### 2. 啟動系統

```bash
# 啟動所有服務
docker-compose up -d

# 檢查服務狀態
docker-compose ps
```

### 3. 訪問系統

- **管理介面**: http://localhost:3001
- **API文件**: http://localhost:3000/api
- **健康檢查**: http://localhost:3000/health

### 4. 初始設定

1. 訪問管理介面的「系統設定」頁面
2. 設定 GitHub Repository URL 和 Personal Access Token
3. 新增第一位使用者或匯入使用者資料
4. 執行部署測試

## 🔧 系統設定

### GitHub 設定

1. **建立 Repository**: 在 GitHub 建立一個新的公開 Repository
2. **建立 Token**: 前往 GitHub Settings → Developer settings → Personal access tokens
   - 選擇權限: repo (完整存取權限)
   - 複製生成的 token
3. **啟用 Pages**: 在 Repository 設定中啟用 GitHub Pages (選擇 main branch)

### 環境變數說明

```env
# 應用程式設定
NODE_ENV=development
API_URL=http://localhost:3000

# 資料庫設定
DB_PASSWORD=secure_password_2024

# 安全設定
JWT_SECRET=your_jwt_secret_key_here

# GitHub 部署設定
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_REPO_URL=https://github.com/yourusername/your-repo-name
```

## 📊 API 端點

### 使用者管理
- `GET /api/users` - 取得使用者列表
- `POST /api/users` - 建立新使用者
- `GET /api/users/:employeeId` - 取得特定使用者
- `PUT /api/users/:employeeId` - 更新使用者資料
- `DELETE /api/users/:employeeId` - 刪除使用者

### 檔案上傳
- `POST /api/upload/photo` - 上傳單張照片
- `POST /api/upload/photos/batch` - 批次上傳照片

### 批次匯入
- `GET /api/import/template` - 下載匯入範本
- `POST /api/import/preview` - 預覽匯入檔案
- `POST /api/import/users` - 執行批次匯入

### 系統設定
- `GET /api/settings/github/status` - 取得 GitHub 設定狀態
- `POST /api/settings/github` - 設定 GitHub 配置

### 部署管理
- `GET /api/deploy/status` - 取得部署狀態
- `POST /api/deploy/execute` - 執行部署
- `GET /api/deploy/preview` - 預覽部署內容

### 模板渲染
- `GET /api/template/generate/:employeeId` - 生成 HTML 名片
- `GET /api/template/vcard/:employeeId` - 生成 vCard 檔案
- `GET /api/template/preview/:employeeId` - 預覽名片

## 🔄 部署流程

### 自動部署流程

1. **資料收集**: 從資料庫讀取所有使用者資料
2. **檔案生成**: 為每位使用者生成 `index.html` 和 `contact.vcf`
3. **圖片處理**: 複製並最佳化使用者大頭照
4. **目錄結構**: 建立 `/{員工編號}/` 目錄結構
5. **Git 操作**: 初始化 Git、添加檔案、提交並推送到 GitHub
6. **頁面更新**: GitHub Pages 自動更新，名片立即可用

### 部署後網址格式

```
https://username.github.io/repository-name/{員工編號}/
```

每位使用者都會有獨立的網址，可以：
- 寫入 NFC 晶片
- 生成 QR 碼
- 直接分享連結

## 💾 資料庫架構

### users 資料表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL | 主鍵 |
| employee_id | VARCHAR(50) | 員工編號 (唯一, URL路徑) |
| full_name | VARCHAR(100) | 姓名 |
| title | VARCHAR(100) | 職稱 |
| department | VARCHAR(100) | 部門 |
| unit | VARCHAR(100) | 單位 |
| email | VARCHAR(255) | 電子郵件 |
| phone | VARCHAR(50) | 電話 |
| address | VARCHAR(255) | 地址 |
| linkedin_url | VARCHAR(255) | LinkedIn 網址 |
| github_url | VARCHAR(255) | GitHub 網址 |
| photo_url | VARCHAR(255) | 大頭照路徑 |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |

### system_settings 資料表

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | SERIAL | 主鍵 |
| setting_key | VARCHAR(100) | 設定鍵值 |
| setting_value | TEXT | 設定值 |
| description | TEXT | 描述 |
| created_at | TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | 更新時間 |

## 🛠 開發指南

### 本地開發

```bash
# 安裝後端依賴
cd backend
npm install

# 安裝前端依賴
cd ../frontend
npm install

# 啟動開發服務器
npm start
```

### 測試

```bash
# 後端測試
cd backend
npm test

# 前端測試
cd frontend
npm test
```

### 建構

```bash
# 後端建構
cd backend
npm run build

# 前端建構
cd frontend
npm run build
```

## 🔐 安全考量

- 環境變數儲存敏感資訊
- API 速率限制
- 檔案上傳大小限制
- GitHub Token 安全儲存
- CORS 設定
- Helmet 安全標頭

## 📈 擴展功能

未來可以考慮加入：

- 使用者權限管理
- 名片樣式模板選擇
- 訪問統計分析
- 自訂網域支援
- API 金鑰管理
- 多語言支援

## 🐛 故障排除

### 常見問題

1. **無法連接資料庫**
   - 檢查 PostgreSQL 服務是否啟動
   - 驗證資料庫連接字串

2. **GitHub 部署失敗**
   - 檢查 Personal Access Token 權限
   - 確認 Repository URL 正確

3. **圖片上傳失敗**
   - 檢查 uploads 目錄權限
   - 確認圖片格式和大小

### 日誌查看

```bash
# 查看所有服務日誌
docker-compose logs

# 查看特定服務日誌
docker-compose logs backend
docker-compose logs frontend
```

## 📞 支援

如有問題或建議，請：
1. 查看本文件的故障排除章節
2. 檢查 GitHub Issues
3. 聯絡系統管理員

---

**版本**: 1.0.0  
**更新日期**: 2025-06-18  
**相容性**: Node.js 16+, PostgreSQL 12+, Docker 20+