# Apps Script - Auto Lead Warmer

> Google Apps Script 潛在客戶自動化追蹤系統開發指南

## 📋 項目概述

Auto Lead Warmer 是一個基於 Google Apps Script 的 Add-on，為研習活動主辦方提供參與者後續追蹤自動化服務。系統通過 AI 分析生成個人化追蹤郵件，提升轉換效率。

### 核心功能
- 🎯 AI 驅動的潛在客戶畫像生成
- 📧 個人化追蹤郵件自動撰寫
- ⏰ 智能排程和自動發送
- 📊 郵件回覆檢測和狀態追蹤
- 🔄 完整的工作流程管理

### 技術棧
- **平台**: Google Apps Script (V8 Runtime)
- **API 整合**: Gmail API, Sheets API v4
- **AI 服務**: Firebase Functions (Perplexity, Gemini, OpenAI)
- **數據存儲**: Google Sheets
- **權限模式**: `spreadsheets` + `gmail.send/readonly`

---

## 🏗️ 架構設計

### 分層架構
```
┌─────────────────────────────────────────┐
│              User Interface             │
│           (Google Sheets UI)            │
├─────────────────────────────────────────┤
│            Business Logic               │
│        (Processing Services)            │
├─────────────────────────────────────────┤
│             Data Layer                  │
│    (SheetService + Config Management)   │
├─────────────────────────────────────────┤
│           External Services             │
│      (Firebase Functions + Gmail)       │
└─────────────────────────────────────────┘
```

### 權限策略
- **spreadsheets**: 完整的 Google Sheets 操作權限
- **gmail.send/readonly**: 郵件發送和回覆檢測
- **script.external_request**: Firebase Functions API 調用
- **userinfo.email**: 用戶身份驗證

---

## 📁 文件結構

### 🔧 核心文件
```
apps-script/
├── Code.js                    # 主入口和選單設置
├── Config.js                  # 配置常數和欄位定義
├── appsscript.json           # 權限和服務配置
└── CLAUDE.md                 # 本開發文檔
```

### 🎯 業務邏輯
```
├── ProcessingService.js      # 主要業務流程控制
├── RowProcessor.js          # 單行數據處理邏輯
├── ContentGenerator.js      # AI 內容生成服務
└── UserInfoService.js       # 用戶資訊管理
```

### 🔗 API 服務
```
├── APIService.js            # 外部 API 調用封裝
├── SheetService.js          # Google Sheets 操作
├── EmailService.js          # 郵件發送和排程
└── ReplyDetectionService.js # 郵件回覆檢測
```

### 🎛️ 功能模組
```
├── EditHandler.js           # 表格編輯事件處理
├── SendNowHandler.js        # 立即發送功能
├── TriggerManager.js        # 時間觸發器管理
├── MenuService.js           # 選單功能服務
└── Utils.js                 # 通用工具函數
```

---

## ⚙️ 開發設置

### 環境準備
```bash
# 安裝 clasp CLI
npm install -g @google/clasp

# 登入 Google 帳戶
clasp login

# 克隆項目到本地
clasp clone [SCRIPT_ID]
```

### 本地開發
```bash
# 推送代碼到 Apps Script
clasp push

# 強制推送（包含新文件）
clasp push --force

# 開啟線上編輯器
clasp open
```

### 權限配置
> 重要：修改權限後需要重新授權

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/spreadsheets"
  ]
}
```

---

## 🔄 核心工作流程

### 1. 初始設置流程
```javascript
setupHeadersAndFormat()
  ↓
SheetService.setupHeaders() // 設置表頭
  ↓
SheetService.formatAllLeadRows() // 格式化
  ↓
UserInfoService.createUserInfoSheet() // 創建用戶資訊表
```

### 2. 主要處理流程
```javascript
runAutoLeadWarmer()
  ↓
ProcessingService.processNewLeads()
  ↓
RowProcessor.processRow() // 針對每一行
  ↓
generateLeadsProfile() → generateMailAngles() → generateEmails()
  ↓
EmailService.scheduleEmails() // 設置排程
```

### 3. 郵件發送流程
```javascript
[定時觸發] sendScheduledEmails()
  ↓
EmailService.checkAndSendEmails()
  ↓
Gmail API 發送 + 狀態更新
  ↓
ReplyDetectionService.checkReplies() // 檢查回覆
```

---

## 🛠️ 開發最佳實踐

### Claude 開發注意事項

#### ✅ 推薦做法
```javascript
// 1. 使用服務模組化設計
const result = ContentGenerator.generateLeadsProfile(url, position);

// 2. 統一錯誤處理
try {
  // 業務邏輯
} catch (error) {
  console.error('操作失敗:', error);
  SpreadsheetApp.getUi().alert('錯誤', error.message);
}

// 3. 常數配置使用
const statusCell = sheet.getRange(rowIndex, COLUMNS.STATUS + 1);

// 4. 狀態管理
SheetService.updateStatus(rowIndex, 'Processing');
```

#### ❌ 避免做法
```javascript
// ❌ 直接操作 SpreadsheetApp 而不通過服務
SpreadsheetApp.getActiveSheet().getRange(1,1).setValue();

// ❌ 硬編碼配置
const column = 5; // 應該使用 COLUMNS.LEADS_PROFILE

// ❌ 忽略權限檢查
Sheets.Spreadsheets.batchUpdate(); // 需要 spreadsheets 權限

// ❌ 不處理異步操作
APIService.callLLMAPI(); // 應該等待結果
```

### 調試技巧
```javascript
// 1. 使用 console.log 追蹤執行流程
console.log('步驟1: 開始處理行', rowIndex);

// 2. 檢查數據完整性
if (!leadsProfile || leadsProfile.trim() === '') {
  throw new Error('Leads Profile 生成失敗');
}

// 3. 分段測試
const isDevelopment = false; // 設置為 true 進行測試
```

### 性能優化
```javascript
// 1. 批量操作
const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();

// 2. 減少 API 調用
SpreadsheetApp.flush(); // 控制刷新時機

// 3. 緩存常用數據
const userInfo = UserInfoService.getUserInfo(); // 一次獲取
```

---

## 🔍 測試和調試

### 手動測試流程
1. **初始設置測試**: 確認表頭設置和格式化
2. **API 測試**: 驗證 Firebase Functions 連接
3. **郵件測試**: 使用測試郵箱驗證發送功能
4. **觸發器測試**: 檢查定時任務執行

### 常見問題排除

#### 權限問題
```
錯誤: 權限不足
解決: 檢查 appsscript.json 權限配置，重新授權
```

#### API 調用失敗
```
錯誤: Firebase Functions 調用超時
解決: 檢查網路連接和 API 金鑰配置
```

#### 觸發器問題
```
錯誤: 郵件未按時發送
解決: 檢查觸發器設置和 GMT 時區配置
```

---

## 📊 監控和維護

### 日誌檢查
```javascript
// Apps Script 執行記錄
console.log() 輸出 → Stackdriver Logging

// 錯誤追蹤
catch (error) {
  console.error('詳細錯誤:', error);
}
```

### 性能監控
- 檢查 API 調用次數和響應時間
- 監控觸發器執行頻率
- 追蹤用戶操作統計

### 定期維護
- 清理過期的觸發器
- 更新 API 金鑰和權限
- 檢查第三方服務狀態

---

## 🚀 部署指南

### 發布流程
1. **代碼審查**: 確認所有功能正常
2. **權限檢查**: 驗證 appsscript.json 配置
3. **推送部署**: `clasp push --force`
4. **用戶測試**: 在實際環境中測試核心功能

### 版本管理
```bash
# 創建版本
clasp version "v1.2.0 - 新增 aspect1/aspect2 功能"

# 部署特定版本
clasp deploy --versionNumber 10
```

---

## 🔧 服務層詳解

### SheetService.js - 工作表操作核心
```javascript
// 主要功能
- getMainSheet(): 獲取主工作表
- setupHeaders(): 設置表頭和格式
- updateStatus(): 更新行狀態
- formatAllLeadRows(): 格式化所有行
- setupColumnWidths(): 設置列寬
```

### ContentGenerator.js - AI 內容生成
```javascript
// 核心功能
- generateLeadsProfile(): 生成客戶畫像
- generateMailAngles(): 生成郵件切入點
- parseMailAngles(): 解析 AI 回應
- generateSingleFollowUpMail(): 生成追蹤郵件
```

### ProcessingService.js - 業務流程控制
```javascript
// 主要職責
- processNewLeads(): 處理新潛客
- checkStopSignal(): 檢查停止信號
- 錯誤處理和狀態管理
```

### EmailService.js - 郵件發送管理
```javascript
// 核心功能
- scheduleEmails(): 設置郵件排程
- checkAndSendEmails(): 檢查並發送郵件
- sendSingleEmail(): 發送單封郵件
- generateNextMailContent(): 生成下一封郵件
```

---

## 📚 相關資源

### 官方文檔
- [Google Apps Script 文檔](https://developers.google.com/apps-script)
- [Gmail API 文檔](https://developers.google.com/gmail/api)
- [Sheets API 文檔](https://developers.google.com/sheets/api)

### 內部文檔
- `../spec.md` - 產品需求規格
- `../firebase/CLAUDE.md` - 後端服務文檔

### 開發工具
- [clasp CLI](https://github.com/google/clasp) - 本地開發工具
- [Google Apps Script IDE](https://script.google.com) - 線上編輯器

---

## 🎯 專案配置詳解

### COLUMNS 常數配置
```javascript
const COLUMNS = {
  EMAIL: 0,         // A: Email Address*
  FIRST_NAME: 1,    // B: First Name*
  COMPANY_URL: 2,   // C: Company url*
  POSITION: 3,      // D: Position*
  LEADS_PROFILE: 4, // E: Leads Profile
  MAIL_ANGLE_1: 5,  // F: 1st mail angle
  FOLLOW_UP_1: 6,   // G: 1st follow up mail
  SCHEDULE_1: 7,    // H: 1st mail schedule
  // ... 更多欄位定義
};
```

### 用戶資訊欄位
```javascript
const USER_INFO_FIELDS = {
  GREETING: { row: 2, col: 2, label: 'Email Greeting' },
  NAME: { row: 3, col: 2, label: 'Name' },
  COMPANY: { row: 4, col: 2, label: 'Company' },
  TITLE: { row: 5, col: 2, label: 'Title' },
  CONTACT: { row: 6, col: 2, label: 'Contact' },
  SEMINAR_INFO: { row: 7, col: 2, label: 'Seminar Info' },
  SEMINAR_BRIEF: { row: 8, col: 2, label: 'Seminar Brief' }
};
```

---

## ⚡ 進階功能

### 批量操作優化
```javascript
// 使用 Sheets API 進行批量更新
const requests = [];
requests.push({
  "updateDimensionProperties": {
    "range": {
      "sheetId": sheetId,
      "dimension": "ROWS",
      "startIndex": rowIndex - 1,
      "endIndex": rowIndex
    },
    "properties": {
      "pixelSize": 200
    },
    "fields": "pixelSize"
  }
});

Sheets.Spreadsheets.batchUpdate(resource, spreadsheetId);
```

### 觸發器管理
```javascript
// 創建時間觸發器
const trigger = ScriptApp.newTrigger('sendScheduledEmails')
  .timeBased()
  .everyMinutes(10)
  .create();

// 清理觸發器
const triggers = ScriptApp.getProjectTriggers();
triggers.forEach(trigger => {
  if (trigger.getHandlerFunction() === 'sendScheduledEmails') {
    ScriptApp.deleteTrigger(trigger);
  }
});
```

### 數據驗證設置
```javascript
// 設置下拉選單驗證
const rule = SpreadsheetApp.newDataValidation()
  .requireValueInList(['New', 'Processing', 'Running', 'Stopped', 'Error'])
  .setAllowInvalid(false)
  .build();

cell.setDataValidation(rule);
```

---

*最後更新: 2025-09-21*
*版本: v1.2.0*