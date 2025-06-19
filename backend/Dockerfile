# Node.js 後端 API 服務 Dockerfile
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 安裝系統依賴 (用於 sharp 圖片處理)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝 Node.js 依賴
RUN npm ci --only=production && npm cache clean --force

# 複製應用程式代碼
COPY . .

# 建立上傳目錄
RUN mkdir -p uploads/photos uploads/temp

# 設定檔案權限
RUN chown -R node:node /app
USER node

# 暴露端口
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 啟動應用程式
CMD ["npm", "start"]