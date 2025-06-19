# React 前端管理介面 Dockerfile
FROM node:18-alpine as build

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production && npm cache clean --force

# 複製應用程式代碼
COPY . .

# 建構應用程式
RUN npm run build

# 使用 nginx 提供靜態檔案服務
FROM nginx:alpine

# 複製建構後的檔案到 nginx
COPY --from=build /app/build /usr/share/nginx/html

# 複製 nginx 設定
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 3000

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]