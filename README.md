# GitHub-based 數位名片

一個可部署於 GitHub Pages 的網頁名片系統，支援 NFC 和 QR 碼快速開啟，並自動觸發 .vcf 聯絡人下載。

## 🎯 功能特色

- 📱 **行動裝置優化**：支援 NFC 或 QR 碼快速開啟
- 📇 **聯絡人加入**：一鍵下載 .vcf 檔案，並提供操作指引協助用戶完成聯絡人加入
- 🖼 **個人化展示**：大頭照、社群連結、職稱資訊與動態個人簡介
- 🌐 **GitHub Pages 部署**：無需伺服器，直接部署至 GitHub Pages
- 📱 **跨平台相容**：Android 和 iOS 均可正常使用

## 📦 專案結構

```
├── index.html              # 主網頁入口 (含聯絡人加入功能防呆)
├── contact.vcf             # vCard 聯絡人檔案 (需自訂)
├── nfc-generator.html      # NFC 內容產生工具
├── assets/
│   ├── photo.jpg           # 個人頭像 (已優化)
│   ├── moda-logo.svg       # MODA 官方標誌
│   └── COPYRIGHT.txt       # 版權聲明文件
├── CLAUDE.md               # Claude Code 專案指引
├── NFC-GUIDE.md            # NFC 設定使用指南
├── PHOTO-GUIDE.md          # 大頭貼優化指南
├── VCARD-GUIDE.md          # vCard 編碼相容性指南
├── LICENSE                 # 授權條款
└── README.md               # 專案說明文件
```

## 🚀 部署方式

1. Fork 此專案
2. 在 GitHub Repository 設定中開啟 GitHub Pages
3. 選擇 main branch 作為來源
4. 訪問 `https://yourusername.github.io/repository-name/`

## 📱 使用方式

1. **網頁訪問**：直接開啟 GitHub Pages 網址
2. **NFC 卡片**：將網址寫入 NFC 卡片，靠近手機即可開啟
3. **QR 碼掃描**：名片頁面自動生成 QR 碼，用手機相機掃描即可快速開啟
4. **加入聯絡人**：點擊「加入聯絡人」按鈕，系統會下載 .vcf 檔案並顯示後續操作指引

## 📟 NFC 設定指南

### 支援規格
- **Android**: NFC Forum Type 2-4, ISO14443 Type A/B
- **iOS**: NFC Forum Type 2-5, ISO14443 Type A (iPhone 7+)
- **建議晶片**: NTAG213/215/216
- **記錄格式**: NDEF (NFC Data Exchange Format)

### 快速設定
1. 下載 NFC Tools App (Android/iOS)
2. 選擇「新增記錄」→「URL/URI」
3. **重要**: 輸入完整網址，必須包含 `https://`
4. 將 NFC 卡片靠近手機完成寫入
5. 測試確認能正確開啟瀏覽器

詳細設定步驟請參考 [NFC-GUIDE.md](NFC-GUIDE.md)
### 🏷️ NFC 內容產生工具
使用內建的 [NFC 產生器](nfc-generator.html) 可以：
- **自動產生正確格式**: 自動添加 `https://` 協議
- **支援多種 App**: NFC Tools 和 TagWriter 專用格式
- **容量分析**: 計算需求與晶片建議
- **一鍵複製**: 直接複製到 NFC App 使用

## 🔧 自訂設定

1. **更換頭像**：參考 [PHOTO-GUIDE.md](PHOTO-GUIDE.md) 優化您的照片後替換 `assets/photo.jpg`
2. **修改個人資訊**：編輯 `index.html` 中的姓名、職稱、聯絡方式
3. **更新聯絡人檔案**：修改 `contact.vcf` 中的詳細資訊
4. **設定 NFC 卡片**：使用 [NFC 產生器](nfc-generator.html) 產生正確的寫入內容
5. **調整配色**：如需要可修改 CSS 中的色彩方案

## ⚠️ 重要提醒

- **URL 格式**：NFC 卡片寫入時必須使用完整格式：`https://yourusername.github.io/project/`
- **iOS 中文相容**：已優化 vCard 檔案以解決 iOS 中文亂碼問題，參考 [VCARD-GUIDE.md](VCARD-GUIDE.md)
- **Android 聯絡人加入**：Android 瀏覽器基於安全考量會先下載 .vcf 檔案，系統會自動顯示操作指引協助完成聯絡人加入
- **測試驗證**：每次部署或修改後，請重新測試 NFC 和 QR 碼功能
- **瀏覽器相容**：確保在不同裝置上都能正確觸發瀏覽器開啟

## 📧 聯絡資訊

如有問題或建議，歡迎開啟 Issue 或 Pull Request。
