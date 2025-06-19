-- 多人數位名片管理系統資料庫架構
-- 建立時間: 2025-06-18

-- 建立資料庫 (如果需要)
-- CREATE DATABASE digital_business_cards;

-- 使用者資料表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,  -- 員工編號，唯一值，將作為 URL 路徑
    full_name VARCHAR(100) NOT NULL,          -- 姓名
    title VARCHAR(100) NOT NULL,              -- 職稱
    department VARCHAR(100) NOT NULL,         -- 部門
    unit VARCHAR(100) NOT NULL,               -- 單位
    email VARCHAR(255) NOT NULL,              -- 電子郵件
    phone VARCHAR(50),                        -- 電話
    address VARCHAR(255),                     -- 地址
    linkedin_url VARCHAR(255),                -- LinkedIn 網址 (可選)
    github_url VARCHAR(255),                  -- GitHub 網址 (可選)
    photo_url VARCHAR(255),                   -- 處理後的大頭照相對路徑
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 建立時間
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- 更新時間
);

-- 系統設定表
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_full_name ON users(full_name);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_unit ON users(unit);

-- 建立更新時間自動更新的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入預設系統設定
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('github_repository_url', '', 'GitHub Repository URL for deployment'),
('github_access_token', '', 'GitHub Personal Access Token for deployment'),
('deployment_enabled', 'false', 'Whether deployment functionality is enabled');

-- 插入測試資料 (可選)
INSERT INTO users (
    employee_id, full_name, title, department, unit, email, phone, address, 
    linkedin_url, github_url, photo_url
) VALUES (
    'E001', 
    '吳勝繙', 
    '科長', 
    '數位發展部', 
    '數位發展部', 
    'iim0663418@moda.gov.tw', 
    '+886-2-2380-0411', 
    '台北市中正區延平南路143號', 
    'https://www.linkedin.com/in/%E5%90%B3-%E5%8B%9D%E7%B9%99-87a45a206/', 
    'https://github.com/iim0663418',
    'assets/photo.jpg'
);

-- 建立檢視表以簡化查詢
CREATE VIEW user_summary AS
SELECT 
    id,
    employee_id,
    full_name,
    title,
    department,
    unit,
    email,
    phone,
    CASE 
        WHEN photo_url IS NOT NULL THEN true 
        ELSE false 
    END as has_photo,
    created_at,
    updated_at
FROM users
ORDER BY created_at DESC;

-- 權限設定 (根據實際需求調整)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;