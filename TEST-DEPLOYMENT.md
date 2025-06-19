# 測試部署文件

本文件提供完整的測試部署流程，用於驗證多人數位名片管理系統的所有功能。

## 📋 測試環境準備

### 系統需求

- **作業系統**: Linux/macOS/Windows (支援 Docker)
- **記憶體**: 最少 4GB RAM (測試環境)
- **硬碟空間**: 最少 2GB 可用空間
- **Docker**: 版本 20.0+
- **Docker Compose**: 版本 2.0+
- **測試工具**: curl, jq (用於 API 測試)

### 測試用 GitHub Repository

在開始測試前，需要準備：

1. **測試用 GitHub Repository**
   ```bash
   # 建立測試用 Repository
   # Repository 名稱建議: digital-cards-test
   # 設定為 Public Repository
   ```

2. **GitHub Personal Access Token**
   ```bash
   # 前往 https://github.com/settings/tokens/new
   # 勾選權限: repo (Full control of private repositories)
   # 複製生成的 token
   ```

## 🚀 快速測試部署

### Step 1: 下載與設定

```bash
# 1. 下載專案 (假設已有專案檔案)
cd /path/to/project

# 2. 設定測試環境變數
cp .env.example .env.test

# 3. 編輯測試環境變數
cat > .env.test << 'EOF'
# 測試環境設定
NODE_ENV=development
API_URL=http://localhost:3000

# 資料庫設定
DB_PASSWORD=test_password_2024

# 安全設定 (測試用)
JWT_SECRET=test_jwt_secret_key_for_testing_minimum_32_chars
SESSION_SECRET=test_session_secret_for_testing

# GitHub 設定 (稍後在系統中設定)
GITHUB_TOKEN=
GITHUB_REPO_URL=

# 其他設定
CORS_ORIGIN=http://localhost:3001
UPLOAD_MAX_SIZE=50MB
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,gif
EOF

# 4. 使用測試環境變數
cp .env.test .env
```

### Step 2: 啟動測試環境

```bash
# 1. 啟動測試環境
docker-compose up -d

# 2. 等待服務完全啟動
echo "等待服務啟動..."
sleep 30

# 3. 檢查服務狀態
docker-compose ps

# 4. 執行自動測試腳本
./test-system.sh
```

### Step 3: 手動功能測試

如果自動測試通過，繼續進行手動功能測試：

```bash
# 檢查服務可訪問性
curl http://localhost:3000/health
curl http://localhost:3001/health

# 檢查 API 端點
curl http://localhost:3000/api
```

## 🧪 詳細功能測試

### 1. 後端 API 測試

#### 1.1 基礎 API 測試

```bash
#!/bin/bash

echo "=== 後端 API 功能測試 ==="

BASE_URL="http://localhost:3000"

# 健康檢查
echo "1. 健康檢查測試"
curl -s "$BASE_URL/health" | jq .

# API 根目錄
echo "2. API 根目錄測試"
curl -s "$BASE_URL/api" | jq .

# 使用者列表 (應該是空的)
echo "3. 使用者列表測試"
curl -s "$BASE_URL/api/users" | jq .

# 系統設定
echo "4. 系統設定測試"
curl -s "$BASE_URL/api/settings" | jq .

# GitHub 狀態
echo "5. GitHub 狀態測試"
curl -s "$BASE_URL/api/settings/github/status" | jq .
```

#### 1.2 使用者管理 API 測試

```bash
#!/bin/bash

echo "=== 使用者管理 API 測試 ==="

BASE_URL="http://localhost:3000"

# 建立測試使用者
echo "1. 建立測試使用者"
curl -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "TEST001",
    "full_name": "測試使用者一",
    "title": "測試工程師",
    "department": "測試部門",
    "unit": "測試單位",
    "email": "test001@example.com",
    "phone": "+886-2-1234-5678",
    "address": "台北市測試區測試路123號",
    "linkedin_url": "https://www.linkedin.com/in/test001",
    "github_url": "https://github.com/test001"
  }' | jq .

# 取得使用者列表
echo "2. 取得使用者列表"
curl -s "$BASE_URL/api/users" | jq .

# 取得特定使用者
echo "3. 取得特定使用者"
curl -s "$BASE_URL/api/users/TEST001" | jq .

# 更新使用者
echo "4. 更新使用者資料"
curl -X PUT "$BASE_URL/api/users/TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "高級測試工程師",
    "phone": "+886-2-1234-5679"
  }' | jq .

# 建立第二個測試使用者
echo "5. 建立第二個測試使用者"
curl -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "TEST002",
    "full_name": "測試使用者二",
    "title": "測試專員",
    "department": "測試部門",
    "unit": "測試單位",
    "email": "test002@example.com"
  }' | jq .
```

#### 1.3 檔案上傳測試

```bash
#!/bin/bash

echo "=== 檔案上傳功能測試 ==="

BASE_URL="http://localhost:3000"

# 建立測試圖片
echo "1. 建立測試圖片"
# 使用 ImageMagick 建立測試圖片 (如果可用)
if command -v convert &> /dev/null; then
    convert -size 400x400 xc:lightblue -pointsize 30 -gravity center \
            -annotate 0 "TEST\nIMAGE" test-image.jpg
    echo "測試圖片已建立: test-image.jpg"
else
    echo "警告: ImageMagick 未安裝，請手動準備測試圖片"
    echo "可以下載任意圖片並重命名為 test-image.jpg"
fi

# 上傳圖片 (如果圖片存在)
if [ -f "test-image.jpg" ]; then
    echo "2. 上傳測試圖片"
    curl -X POST "$BASE_URL/api/upload/photo" \
      -F "photo=@test-image.jpg" \
      -F "employee_id=TEST001" | jq .
else
    echo "2. 跳過圖片上傳測試 (無測試圖片)"
fi
```

#### 1.4 範本生成測試

```bash
#!/bin/bash

echo "=== 範本生成功能測試 ==="

BASE_URL="http://localhost:3000"

# 生成 HTML 範本
echo "1. 生成 HTML 範本"
curl -s "$BASE_URL/api/template/generate/TEST001" > test-card.html
if [ -s test-card.html ]; then
    echo "✓ HTML 範本生成成功: test-card.html"
    head -10 test-card.html
else
    echo "✗ HTML 範本生成失敗"
fi

# 生成 vCard
echo "2. 生成 vCard"
curl -s "$BASE_URL/api/template/vcard/TEST001" > test-contact.vcf
if [ -s test-contact.vcf ]; then
    echo "✓ vCard 生成成功: test-contact.vcf"
    cat test-contact.vcf
else
    echo "✗ vCard 生成失敗"
fi

# 預覽名片 (檢查狀態碼)
echo "3. 預覽名片測試"
status=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/template/preview/TEST001")
if [ "$status" -eq 200 ]; then
    echo "✓ 名片預覽功能正常"
else
    echo "✗ 名片預覽功能異常 (HTTP $status)"
fi
```

### 2. 前端介面測試

#### 2.1 前端可訪問性測試

```bash
#!/bin/bash

echo "=== 前端介面測試 ==="

FRONTEND_URL="http://localhost:3001"

# 前端首頁
echo "1. 前端首頁測試"
status=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL/")
if [ "$status" -eq 200 ]; then
    echo "✓ 前端首頁可正常訪問"
else
    echo "✗ 前端首頁訪問異常 (HTTP $status)"
fi

# 前端健康檢查
echo "2. 前端健康檢查"
curl -s "$FRONTEND_URL/health"

# 測試主要頁面路由
routes=("/" "/users" "/import" "/deploy" "/settings")
for route in "${routes[@]}"; do
    echo "測試路由: $route"
    status=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL$route")
    if [ "$status" -eq 200 ]; then
        echo "  ✓ 路由 $route 正常"
    else
        echo "  ✗ 路由 $route 異常 (HTTP $status)"
    fi
done
```

#### 2.2 瀏覽器功能測試

**手動測試清單:**

1. **開啟管理介面**
   ```
   瀏覽器訪問: http://localhost:3001
   預期結果: 顯示管理介面登入頁面或儀表板
   ```

2. **儀表板功能**
   - [ ] 統計數據顯示正確
   - [ ] 系統狀態顯示正確
   - [ ] 快速操作按鈕可點擊

3. **使用者管理**
   - [ ] 使用者列表顯示剛建立的測試使用者
   - [ ] 搜尋功能正常
   - [ ] 分頁功能正常
   - [ ] 編輯按鈕可正常跳轉

4. **新增/編輯使用者**
   - [ ] 表單驗證正常
   - [ ] 檔案上傳功能正常
   - [ ] 預覽功能正常
   - [ ] 儲存功能正常

### 3. 批次匯入測試

#### 3.1 建立測試匯入檔案

```bash
#!/bin/bash

echo "=== 建立測試匯入檔案 ==="

# 建立測試 CSV 檔案
cat > test-import.csv << 'EOF'
employee_id,full_name,title,department,unit,email,phone,address,linkedin_url,github_url
BATCH001,批次使用者一,軟體工程師,資訊部,開發組,batch001@example.com,+886-2-2222-1111,台北市信義區信義路五段7號,,
BATCH002,批次使用者二,專案經理,專案部,管理組,batch002@example.com,+886-2-2222-1112,台北市大安區敦化南路一段100號,https://linkedin.com/in/batch002,https://github.com/batch002
BATCH003,批次使用者三,UI設計師,設計部,介面組,batch003@example.com,+886-2-2222-1113,台北市松山區南京東路四段2號,,
EOF

echo "測試 CSV 檔案已建立: test-import.csv"
```

#### 3.2 測試批次匯入 API

```bash
#!/bin/bash

echo "=== 批次匯入功能測試 ==="

BASE_URL="http://localhost:3000"

# 下載匯入範本
echo "1. 下載匯入範本"
curl -s "$BASE_URL/api/import/template" -o downloaded-template.xlsx
if [ -s downloaded-template.xlsx ]; then
    echo "✓ 範本下載成功: downloaded-template.xlsx"
else
    echo "✗ 範本下載失敗"
fi

# 預覽匯入檔案
echo "2. 預覽匯入檔案"
if [ -f "test-import.csv" ]; then
    curl -X POST "$BASE_URL/api/import/preview" \
      -F "file=@test-import.csv" | jq .
else
    echo "✗ 測試匯入檔案不存在"
fi

# 執行匯入
echo "3. 執行批次匯入"
if [ -f "test-import.csv" ]; then
    curl -X POST "$BASE_URL/api/import/users" \
      -F "file=@test-import.csv" \
      -F "update_existing=false" | jq .
else
    echo "✗ 測試匯入檔案不存在"
fi

# 驗證匯入結果
echo "4. 驗證匯入結果"
curl -s "$BASE_URL/api/users" | jq '.users | length'
curl -s "$BASE_URL/api/users" | jq '.users[] | .employee_id'
```

### 4. GitHub 整合測試

#### 4.1 GitHub 設定測試

```bash
#!/bin/bash

echo "=== GitHub 整合測試 ==="

BASE_URL="http://localhost:3000"

# 檢查 GitHub 狀態
echo "1. 檢查 GitHub 初始狀態"
curl -s "$BASE_URL/api/settings/github/status" | jq .

echo ""
echo "2. 手動設定 GitHub (請在管理介面完成以下設定):"
echo "   - Repository URL: https://github.com/your-username/digital-cards-test"
echo "   - Personal Access Token: ghp_your_token_here"
echo ""
echo "請前往 http://localhost:3001/settings 完成 GitHub 設定"
echo "設定完成後按 Enter 繼續..."
read -r

# 再次檢查 GitHub 狀態
echo "3. 檢查 GitHub 設定後狀態"
curl -s "$BASE_URL/api/settings/github/status" | jq .

# 測試 GitHub 連接
echo "4. 測試 GitHub 連接"
curl -X POST "$BASE_URL/api/settings/github/test" | jq .
```

#### 4.2 部署功能測試

```bash
#!/bin/bash

echo "=== 部署功能測試 ==="

BASE_URL="http://localhost:3000"

# 檢查部署狀態
echo "1. 檢查部署狀態"
curl -s "$BASE_URL/api/deploy/status" | jq .

# 預覽部署內容
echo "2. 預覽部署內容"
curl -s "$BASE_URL/api/deploy/preview" | jq .

# 測試連接
echo "3. 測試 GitHub 連接"
curl -X POST "$BASE_URL/api/deploy/test-connection" | jq .

echo ""
echo "4. 手動執行部署測試:"
echo "請前往 http://localhost:3001/deploy 頁面執行部署"
echo "部署完成後按 Enter 繼續..."
read -r

# 檢查部署後狀態
echo "5. 檢查部署後狀態"
curl -s "$BASE_URL/api/deploy/status" | jq .
```

### 5. 端到端測試

#### 5.1 完整流程測試腳本

```bash
#!/bin/bash

echo "=== 端到端完整流程測試 ==="

BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

# 步驟 1: 檢查系統就緒
echo "步驟 1: 檢查系統就緒狀態"
./test-system.sh

# 步驟 2: 建立測試資料
echo "步驟 2: 建立測試使用者"
curl -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "E2E001",
    "full_name": "端到端測試用戶",
    "title": "測試主管",
    "department": "品質保證部",
    "unit": "自動化測試組",
    "email": "e2e001@example.com",
    "phone": "+886-2-3333-4444",
    "address": "台北市中山區中山北路二段39號"
  }' > /dev/null

# 步驟 3: 驗證 API 功能
echo "步驟 3: 驗證 API 功能"
user_count=$(curl -s "$BASE_URL/api/users" | jq '.pagination.total')
if [ "$user_count" -gt 0 ]; then
    echo "✓ 使用者資料建立成功 (總計: $user_count)"
else
    echo "✗ 使用者資料建立失敗"
    exit 1
fi

# 步驟 4: 測試範本生成
echo "步驟 4: 測試範本生成"
curl -s "$BASE_URL/api/template/generate/E2E001" > e2e-test-card.html
if [ -s e2e-test-card.html ]; then
    echo "✓ HTML 範本生成成功"
else
    echo "✗ HTML 範本生成失敗"
    exit 1
fi

# 步驟 5: 測試 vCard 生成
echo "步驟 5: 測試 vCard 生成"
curl -s "$BASE_URL/api/template/vcard/E2E001" > e2e-test-contact.vcf
if [ -s e2e-test-contact.vcf ]; then
    echo "✓ vCard 生成成功"
else
    echo "✗ vCard 生成失敗"
    exit 1
fi

# 步驟 6: 檢查前端介面
echo "步驟 6: 檢查前端介面"
frontend_status=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL/")
if [ "$frontend_status" -eq 200 ]; then
    echo "✓ 前端介面正常運行"
else
    echo "✗ 前端介面異常"
    exit 1
fi

echo ""
echo "🎉 端到端測試完成！"
echo ""
echo "手動驗證項目:"
echo "1. 前往 $FRONTEND_URL 檢查管理介面"
echo "2. 驗證使用者列表中包含測試使用者"
echo "3. 測試編輯使用者功能"
echo "4. 設定 GitHub 並執行部署測試"
echo "5. 驗證生成的名片網頁是否正常"
```

## 📊 測試報告生成

### 自動測試報告

```bash
#!/bin/bash

echo "=== 生成測試報告 ==="

REPORT_FILE="test-report-$(date +%Y%m%d_%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# 測試報告

**測試時間**: $(date)
**測試環境**: Docker Compose
**測試者**: $(whoami)

## 測試結果摘要

EOF

# 執行各項測試並記錄結果
echo "### 1. 系統基礎測試" >> "$REPORT_FILE"
if ./test-system.sh >> "$REPORT_FILE" 2>&1; then
    echo "**結果**: ✅ 通過" >> "$REPORT_FILE"
else
    echo "**結果**: ❌ 失敗" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "### 2. API 功能測試" >> "$REPORT_FILE"
user_count=$(curl -s "http://localhost:3000/api/users" | jq '.pagination.total' 2>/dev/null)
if [ "$user_count" -ge 0 ]; then
    echo "**結果**: ✅ 通過 (使用者數量: $user_count)" >> "$REPORT_FILE"
else
    echo "**結果**: ❌ 失敗" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "### 3. 前端介面測試" >> "$REPORT_FILE"
frontend_status=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:3001/" 2>/dev/null)
if [ "$frontend_status" -eq 200 ]; then
    echo "**結果**: ✅ 通過" >> "$REPORT_FILE"
else
    echo "**結果**: ❌ 失敗 (HTTP $frontend_status)" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "## 詳細測試日誌" >> "$REPORT_FILE"
echo "\`\`\`" >> "$REPORT_FILE"
docker-compose logs --tail=20 >> "$REPORT_FILE" 2>&1
echo "\`\`\`" >> "$REPORT_FILE"

echo "測試報告已生成: $REPORT_FILE"
```

## 🧹 測試清理

### 清理測試資料

```bash
#!/bin/bash

echo "=== 清理測試環境 ==="

# 1. 停止服務
echo "1. 停止 Docker 服務"
docker-compose down

# 2. 清理測試檔案
echo "2. 清理測試檔案"
rm -f test-*.jpg test-*.html test-*.vcf test-*.csv *.xlsx

# 3. 清理 Docker 資源
echo "3. 清理 Docker 資源"
docker system prune -f

# 4. 清理 Docker 卷 (可選，會刪除所有資料)
read -p "是否要清理 Docker 卷？這會刪除所有資料 (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down -v
    docker volume prune -f
    echo "Docker 卷已清理"
fi

echo "測試環境清理完成"
```

## 📋 測試檢查清單

### 功能測試檢查清單

#### 後端 API
- [ ] 健康檢查端點正常回應
- [ ] 使用者 CRUD API 功能正常
- [ ] 檔案上傳 API 功能正常
- [ ] 批次匯入 API 功能正常
- [ ] 系統設定 API 功能正常
- [ ] 部署 API 功能正常
- [ ] 範本生成 API 功能正常

#### 前端介面
- [ ] 儀表板顯示正常
- [ ] 使用者管理頁面功能正常
- [ ] 新增/編輯使用者表單功能正常
- [ ] 批次匯入頁面功能正常
- [ ] 系統設定頁面功能正常
- [ ] 部署管理頁面功能正常

#### 整合功能
- [ ] GitHub 設定與連接測試
- [ ] 圖片上傳與處理
- [ ] 範本渲染功能
- [ ] 批次匯入完整流程
- [ ] 部署到 GitHub Pages

#### 效能與安全
- [ ] API 回應時間合理 (<1000ms)
- [ ] 檔案上傳大小限制生效
- [ ] 輸入驗證功能正常
- [ ] 錯誤處理機制正常

### 部署測試檢查清單

#### 環境設定
- [ ] Docker 服務啟動成功
- [ ] 資料庫連接正常
- [ ] 環境變數設定正確
- [ ] 網路連接正常

#### 服務運行
- [ ] 後端服務健康檢查通過
- [ ] 前端服務可正常訪問
- [ ] 資料庫服務運行正常
- [ ] Nginx 代理設定正確 (如使用)

#### 功能驗證
- [ ] 完整的使用者管理流程
- [ ] GitHub 整合功能
- [ ] 檔案處理功能
- [ ] 部署功能

---

**注意事項**:
- 測試過程中如遇到問題，請檢查 Docker 日誌: `docker-compose logs`
- 確保測試用 GitHub Repository 為空或專用於測試
- 測試完成後記得清理測試資料
- 建議在隔離的測試環境中進行測試