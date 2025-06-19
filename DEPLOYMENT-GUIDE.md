# 部署指南

本文件提供多人數位名片管理系統的完整部署指南。

## 📋 部署前準備

### 系統需求

- **作業系統**: Linux/macOS/Windows (支援 Docker)
- **記憶體**: 最少 2GB RAM
- **硬碟空間**: 最少 5GB 可用空間
- **Docker**: 版本 20.0+ 
- **Docker Compose**: 版本 2.0+

### 必要的外部服務

1. **GitHub Repository**
   - 建立公開的 GitHub Repository
   - 啟用 GitHub Pages 功能

2. **GitHub Personal Access Token**
   - 具備 `repo` 完整權限
   - 建議設定過期時間

## 🚀 生產環境部署

### 1. 伺服器準備

```bash
# 更新系統套件
sudo apt update && sudo apt upgrade -y

# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安裝 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 建立專案目錄
sudo mkdir -p /opt/digital-business-cards
sudo chown $USER:$USER /opt/digital-business-cards
cd /opt/digital-business-cards
```

### 2. 下載原始碼

```bash
# 下載專案檔案
git clone <repository-url> .

# 或上傳檔案到伺服器
# scp -r ./project/* user@server:/opt/digital-business-cards/
```

### 3. 環境設定

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯環境變數
sudo nano .env
```

**生產環境環境變數設定**:

```env
# 環境設定
NODE_ENV=production

# 資料庫設定 (使用強密碼)
DB_PASSWORD=your_super_secure_password_here_2024

# 安全設定 (使用隨機產生的金鑰)
JWT_SECRET=your_random_jwt_secret_key_minimum_32_characters
SESSION_SECRET=your_random_session_secret_key_here

# GitHub 設定 (將在系統中設定)
GITHUB_TOKEN=
GITHUB_REPO_URL=

# Nginx 設定
NGINX_PORT=80
NGINX_SSL_PORT=443

# 安全設定
CORS_ORIGIN=https://yourdomain.com
```

### 4. SSL 憑證設定 (可選)

```bash
# 建立 SSL 目錄
mkdir -p nginx/ssl

# 使用 Let's Encrypt (推薦)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com

# 複製憑證到專案目錄
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chown $USER:$USER nginx/ssl/*
```

### 5. 啟動系統

```bash
# 啟動生產環境 (包含 Nginx)
docker-compose --profile production up -d

# 檢查服務狀態
docker-compose ps

# 檢查日誌
docker-compose logs --tail=50
```

### 6. 資料庫初始化

```bash
# 確認資料庫連接
docker-compose exec db psql -U app_user -d digital_business_cards -c "\dt"

# 如需手動初始化資料庫
docker-compose exec db psql -U app_user -d digital_business_cards -f /docker-entrypoint-initdb.d/01-schema.sql
```

### 7. 系統驗證

```bash
# 檢查健康狀態
curl http://localhost/health

# 檢查 API
curl http://localhost/api

# 檢查前端
curl http://localhost/
```

## 🔧 系統管理

### 服務管理

```bash
# 停止服務
docker-compose down

# 重啟服務
docker-compose restart

# 更新服務
docker-compose pull
docker-compose up -d

# 查看資源使用情況
docker stats
```

### 資料備份

```bash
# 建立備份腳本
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/digital-business-cards"
DATE=$(date +%Y%m%d_%H%M%S)

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 備份資料庫
docker-compose exec -T db pg_dump -U app_user digital_business_cards > $BACKUP_DIR/db_$DATE.sql

# 備份上傳檔案
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C . backend/uploads

# 保留最近 30 天的備份
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# 設定定時備份 (每日凌晨 2 點)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/digital-business-cards/backup.sh >> /var/log/backup.log 2>&1") | crontab -
```

### 資料還原

```bash
# 還原資料庫
docker-compose exec -T db psql -U app_user digital_business_cards < /path/to/backup.sql

# 還原上傳檔案
tar -xzf /path/to/uploads_backup.tar.gz
```

### 日誌管理

```bash
# 即時查看日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# 設定日誌輪轉
sudo nano /etc/docker/daemon.json
```

**Docker 日誌設定**:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

## 📊 監控與維護

### 健康檢查

```bash
# 建立監控腳本
cat > health_check.sh << 'EOF'
#!/bin/bash

# 檢查服務狀態
if ! curl -f http://localhost/health > /dev/null 2>&1; then
    echo "Health check failed at $(date)"
    # 可以加入警報通知
    # 重啟服務
    docker-compose restart
fi
EOF

chmod +x health_check.sh

# 每 5 分鐘檢查一次
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/digital-business-cards/health_check.sh") | crontab -
```

### 效能監控

```bash
# 安裝監控工具
sudo apt install htop iotop nethogs

# 監控 Docker 資源使用
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

# 監控磁碟空間
df -h
du -sh /var/lib/docker/
```

### 系統更新

```bash
# 建立更新腳本
cat > update.sh << 'EOF'
#!/bin/bash
echo "Starting system update..."

# 備份
./backup.sh

# 停止服務
docker-compose down

# 更新系統套件
sudo apt update && sudo apt upgrade -y

# 更新 Docker 映像
docker-compose pull

# 清理舊映像
docker image prune -f

# 重新啟動服務
docker-compose --profile production up -d

# 驗證服務
sleep 30
curl -f http://localhost/health || echo "Health check failed!"

echo "Update completed at $(date)"
EOF

chmod +x update.sh
```

## 🔐 安全設定

### 防火牆設定

```bash
# 安裝並設定 ufw
sudo apt install ufw

# 預設拒絕所有連入
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允許必要的服務
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 啟用防火牆
sudo ufw enable
sudo ufw status
```

### SSL 憑證自動更新

```bash
# 設定 Let's Encrypt 自動更新
cat > ssl_renew.sh << 'EOF'
#!/bin/bash
sudo certbot renew --quiet

# 複製新憑證
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/digital-business-cards/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/digital-business-cards/nginx/ssl/
sudo chown $USER:$USER /opt/digital-business-cards/nginx/ssl/*

# 重新載入 Nginx
docker-compose exec nginx nginx -s reload
EOF

chmod +x ssl_renew.sh

# 每月執行一次
(crontab -l 2>/dev/null; echo "0 0 1 * * /opt/digital-business-cards/ssl_renew.sh") | crontab -
```

### 安全強化

```bash
# 限制 Docker daemon 訪問
sudo usermod -aG docker $USER

# 設定檔案權限
chmod 600 .env
chmod 600 nginx/ssl/*

# 定期更新密碼
# 建議每 90 天更新資料庫密碼和 JWT 金鑰
```

## 🚨 故障排除

### 常見問題

1. **服務無法啟動**
   ```bash
   # 檢查端口衝突
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :443
   
   # 檢查 Docker 服務
   sudo systemctl status docker
   ```

2. **資料庫連接失敗**
   ```bash
   # 檢查資料庫狀態
   docker-compose exec db pg_isready -U app_user
   
   # 檢查連接字串
   docker-compose exec backend env | grep DB_
   ```

3. **記憶體不足**
   ```bash
   # 檢查記憶體使用
   free -h
   docker stats
   
   # 清理 Docker 資源
   docker system prune -a
   ```

### 緊急回復

```bash
# 快速重啟所有服務
docker-compose down && docker-compose --profile production up -d

# 回復到最近的備份
./restore.sh /opt/backups/digital-business-cards/latest_backup.sql

# 檢查系統狀態
./health_check.sh
```

## 📝 部署檢查清單

### 部署前
- [ ] 確認伺服器規格符合需求
- [ ] 安裝 Docker 和 Docker Compose
- [ ] 建立 GitHub Repository 和 Token
- [ ] 準備 SSL 憑證 (如需要)
- [ ] 設定網域名稱 (如需要)

### 部署中
- [ ] 上傳專案檔案
- [ ] 設定環境變數
- [ ] 設定 SSL 憑證
- [ ] 啟動服務
- [ ] 初始化資料庫
- [ ] 驗證系統功能

### 部署後
- [ ] 設定備份策略
- [ ] 設定監控和警報
- [ ] 設定防火牆規則
- [ ] 設定 SSL 自動更新
- [ ] 測試所有功能
- [ ] 建立維護文件

---

**重要提醒**: 
- 定期更新系統和憑證
- 監控系統資源使用情況
- 保持備份策略的有效性
- 及時應用安全補丁