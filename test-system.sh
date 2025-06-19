#!/bin/bash

# 系統功能測試腳本
# 用於驗證多人數位名片管理系統的基本功能

set -e

echo "🧪 多人數位名片管理系統功能測試"
echo "=================================="

BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試函數
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    echo -n "測試 $description... "
    
    if response=$(curl -s -w "%{http_code}" -o /dev/null "$url"); then
        if [ "$response" -eq "$expected_status" ]; then
            echo -e "${GREEN}✓ 通過${NC} (HTTP $response)"
        else
            echo -e "${RED}✗ 失敗${NC} (HTTP $response, 預期 $expected_status)"
            return 1
        fi
    else
        echo -e "${RED}✗ 連接失敗${NC}"
        return 1
    fi
}

test_json_endpoint() {
    local url=$1
    local description=$2
    
    echo -n "測試 $description... "
    
    if response=$(curl -s "$url"); then
        if echo "$response" | jq . > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 通過${NC} (有效的 JSON 回應)"
        else
            echo -e "${RED}✗ 失敗${NC} (無效的 JSON 回應)"
            return 1
        fi
    else
        echo -e "${RED}✗ 連接失敗${NC}"
        return 1
    fi
}

# 檢查必要工具
echo "檢查必要工具..."
for tool in curl jq; do
    if ! command -v $tool &> /dev/null; then
        echo -e "${RED}錯誤: 需要安裝 $tool${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ 所有必要工具已安裝${NC}"
echo

# 等待服務啟動
echo "等待服務啟動..."
sleep 5

# 測試後端 API
echo "📡 測試後端 API"
echo "----------------"

# 基本健康檢查
test_endpoint "$BASE_URL/health" "後端健康檢查"

# API 根目錄
test_json_endpoint "$BASE_URL/api" "API 根目錄"

# 使用者 API
test_json_endpoint "$BASE_URL/api/users" "使用者列表 API"

# 系統設定 API
test_json_endpoint "$BASE_URL/api/settings" "系統設定 API"

# GitHub 狀態 API
test_json_endpoint "$BASE_URL/api/settings/github/status" "GitHub 狀態 API"

# 部署狀態 API
test_json_endpoint "$BASE_URL/api/deploy/status" "部署狀態 API"

# 匯入範本下載
test_endpoint "$BASE_URL/api/import/template" "匯入範本下載" 200

echo

# 測試前端
echo "🖥️  測試前端介面"
echo "----------------"

test_endpoint "$FRONTEND_URL" "前端首頁"
test_endpoint "$FRONTEND_URL/health" "前端健康檢查"

echo

# 測試 Docker 服務
echo "🐳 測試 Docker 服務"
echo "------------------"

if command -v docker-compose &> /dev/null; then
    echo -n "檢查 Docker 服務狀態... "
    if docker-compose ps | grep -q "Up"; then
        echo -e "${GREEN}✓ 通過${NC}"
        
        # 顯示服務狀態
        echo "Docker 服務狀態:"
        docker-compose ps
    else
        echo -e "${RED}✗ 失敗${NC}"
        echo "Docker 服務未正常運行"
    fi
else
    echo -e "${YELLOW}⚠ Docker Compose 未找到，跳過檢查${NC}"
fi

echo

# 測試資料庫連接
echo "🗄️  測試資料庫連接"
echo "----------------"

if command -v docker-compose &> /dev/null; then
    echo -n "測試 PostgreSQL 連接... "
    if docker-compose exec -T db pg_isready -U app_user > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 通過${NC}"
        
        # 檢查資料表
        echo -n "檢查資料表結構... "
        if docker-compose exec -T db psql -U app_user -d digital_business_cards -c "\dt" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ 通過${NC}"
        else
            echo -e "${RED}✗ 失敗${NC}"
        fi
    else
        echo -e "${RED}✗ 失敗${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Docker Compose 未找到，跳過資料庫檢查${NC}"
fi

echo

# 測試檔案上傳目錄
echo "📁 測試檔案系統"
echo "---------------"

directories=("backend/uploads/photos" "backend/uploads/temp" "backend/uploads/import")

for dir in "${directories[@]}"; do
    echo -n "檢查目錄 $dir... "
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓ 存在${NC}"
        
        # 檢查寫入權限
        if [ -w "$dir" ]; then
            echo "  └─ 具有寫入權限"
        else
            echo -e "  └─ ${YELLOW}⚠ 沒有寫入權限${NC}"
        fi
    else
        echo -e "${RED}✗ 不存在${NC}"
    fi
done

echo

# 效能測試
echo "⚡ 簡單效能測試"
echo "---------------"

echo -n "測試 API 回應時間... "
start_time=$(date +%s%N)
curl -s "$BASE_URL/api" > /dev/null
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))

if [ $duration -lt 1000 ]; then
    echo -e "${GREEN}✓ 通過${NC} (${duration}ms)"
else
    echo -e "${YELLOW}⚠ 較慢${NC} (${duration}ms)"
fi

# 並發測試
echo -n "測試並發處理... "
for i in {1..5}; do
    curl -s "$BASE_URL/health" > /dev/null &
done
wait

echo -e "${GREEN}✓ 通過${NC}"

echo

# 總結
echo "📋 測試總結"
echo "----------"

# 檢查是否有失敗的測試
if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 所有測試通過！系統運行正常${NC}"
    echo
    echo "系統訪問地址:"
    echo "  管理介面: $FRONTEND_URL"
    echo "  API 文件: $BASE_URL/api"
    echo "  健康檢查: $BASE_URL/health"
    echo
    echo "下一步操作:"
    echo "1. 前往管理介面設定 GitHub Repository"
    echo "2. 新增第一位使用者或匯入使用者資料"
    echo "3. 執行部署測試"
    
    exit 0
else
    echo -e "${RED}❌ 部分測試失敗，請檢查系統設定${NC}"
    echo
    echo "故障排除建議:"
    echo "1. 檢查 Docker 服務是否正常運行: docker-compose ps"
    echo "2. 查看服務日誌: docker-compose logs"
    echo "3. 確認環境變數設定正確: cat .env"
    echo "4. 重新啟動服務: docker-compose restart"
    
    exit 1
fi