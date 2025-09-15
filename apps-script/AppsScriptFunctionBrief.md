# Apps Script 功能說明文檔

## 檔案結構概覽

### 核心文件
- **Code.js** - 主入口文件，選單設置和事件處理
- **Config.js** - 配置和常數定義
- **APIService.js** - API 調用和 Token 追蹤服務
- **SheetService.js** - Google Sheets 操作服務
- **EmailService.js** - 郵件發送和排程服務

### 處理服務
- **ProcessingService.js** - 主要業務邏輯處理
- **RowProcessor.js** - 單行數據處理邏輯
- **ContentGenerator.js** - AI 內容生成服務
- **UserInfoService.js** - 用戶資訊管理

### 功能模組
- **EditHandler.js** - 表格編輯事件處理
- **SendNowHandler.js** - 立即發送功能處理
- **ReplyDetectionService.js** - 郵件回覆檢測
- **TriggerManager.js** - 時間觸發器管理
- **MenuService.js** - 選單功能服務
- **Utils.js** - 通用工具函數

---

## 主要文件功能詳解

### 1. Code.js - 主入口文件

**目的**: Google Apps Script 的主入口點，設置用戶界面和核心事件處理

#### 核心函數

##### onOpen()
- **功能**: 當 Google Sheets 開啟時自動執行，建立自訂選單
- **Input**: 無
- **Output**: 無
- **必要性**: 必要 - 用戶界面入口

##### setupHeadersAndFormat()
- **功能**: 結合初始設置和格式化功能的組合函數
- **Input**: 無
- **Output**: 無
- **流程**:
  1. 執行 SheetService.setupHeaders()
  2. 等待 1 秒
  3. 執行 SheetService.formatAllLeadRows()
  4. 顯示完成提示
- **必要性**: 必要 - 簡化用戶操作

##### onEdit(e)
- **功能**: 處理表格編輯事件
- **Input**: GoogleAppsScript.Events.SheetsOnEdit - 編輯事件物件
- **Output**: 無
- **必要性**: 必要 - 自動化觸發機制

---

### 2. Config.js - 配置文件

**目的**: 集中管理所有配置和常數定義

#### 核心常數

##### SHEET_NAME
- **值**: '工作表1'
- **用途**: 主工作表名稱

##### COLUMNS
- **功能**: 定義所有欄位的索引位置
- **必要性**: 必要 - 確保欄位操作一致性

##### VALIDATION_RULES
- **功能**: 定義數據驗證規則
- **必要性**: 必要 - 數據品質控制

---

### 3. APIService.js - API 服務

**目的**: 處理所有外部 API 調用和 Token 使用量追蹤

#### 核心組件

##### TokenTracker
- **功能**: 追蹤 AI API Token 使用量和成本
- **子功能**:
  - `reset()`: 重置統計數據
  - `calculateCost()`: 計算成本
  - `addUsage()`: 記錄使用量
  - `getReport()`: 生成使用報告
- **必要性**: 必要 - 成本控制和監控

##### APIService
- **功能**: Firebase Cloud Functions API 調用服務
- **主要方法**:
  - `callPerplexityAPI(prompt)`: 調用 Sonar 模型
  - `callPerplexityAPIWithSonarPro(prompt)`: 調用 Sonar Pro 模型
  - `createUser(email)`: 創建用戶
  - `updateUserUsage(email, usage)`: 更新使用量
- **必要性**: 必要 - AI 功能核心

---

### 4. SheetService.js - 表格服務

**目的**: 統一管理所有 Google Sheets 操作

#### 核心函數

##### setupHeaders()
- **功能**: 設置表頭和基本格式
- **Input**: 無
- **Output**: 無
- **必要性**: 必要 - 初始化工作表

##### formatAllLeadRows()
- **功能**: 格式化所有潛在客戶行
- **Input**: 無
- **Output**: 無
- **流程**: 設置列寬、邊框、背景色、字體等
- **必要性**: 重要 - 改善用戶體驗

##### updateStatus(sheet, rowIndex, status)
- **功能**: 更新指定行的狀態
- **Input**:
  - sheet: 工作表物件
  - rowIndex: 行索引
  - status: 新狀態
- **Output**: 無
- **必要性**: 必要 - 狀態管理

##### setupSendNowButton(sheet, rowIndex)
- **功能**: 設置 Send Now 復選框
- **Input**: sheet, rowIndex
- **Output**: 無
- **必要性**: 必要 - 用戶交互功能

---

### 5. EmailService.js - 郵件服務

**目的**: 處理所有郵件發送相關功能

#### 核心函數

##### scheduleEmails(email, firstName, followUpMails, schedules, rowIndex)
- **功能**: 設定郵件發送排程（Sheet-only 模式）
- **Input**:
  - email: 收件人郵件
  - firstName: 收件人姓名
  - followUpMails: 後續郵件內容陣列
  - schedules: 排程時間陣列
  - rowIndex: 行索引
- **Output**: 無
- **必要性**: 必要 - 郵件排程核心

##### sendImmediateEmail(email, firstName, subject, content, rowIndex, emailType)
- **功能**: 立即發送郵件（Send Now 功能）
- **Input**: 郵件參數和類型
- **Output**: 無
- **流程**:
  1. 調用 sendEmail 發送郵件
  2. 更新排程狀態（加刪除線）
  3. 檢查是否需要生成下一封郵件
  4. 更新 info 欄位
- **必要性**: 必要 - 即時發送功能

##### sendEmail(email, firstName, content, subject, rowIndex, emailType)
- **功能**: 核心郵件發送功能
- **Input**: 郵件詳細參數
- **Output**: 無
- **必要性**: 必要 - 郵件發送核心

##### checkAndSendMails()
- **功能**: 全域郵件檢查和發送（每小時執行）
- **Input**: 無
- **Output**: {checked: number, sent: number}
- **流程**:
  1. 掃描所有 Running 狀態的行
  2. 檢查排程時間是否到達
  3. 發送到期郵件
  4. 更新狀態和統計
- **必要性**: 必要 - 自動化發送核心

##### generateNextMailIfNeeded(rowIndex, currentMailType, firstName)
- **功能**: 檢查並生成下一封郵件
- **Input**:
  - rowIndex: 行索引
  - currentMailType: 當前郵件類型
  - firstName: 用戶姓名
- **Output**: 無
- **必要性**: 必要 - 自動化內容生成

---

### 6. ProcessingService.js - 處理服務

**目的**: 主要業務邏輯處理和工作流程控制

#### 核心函數

##### runAutoLeadWarmer()
- **功能**: 主要處理入口函數
- **Input**: 無
- **Output**: 無
- **必要性**: 必要 - 系統主要功能

##### processNextAvailableRow()
- **功能**: 處理下一個可用行
- **Input**: 無
- **Output**: boolean - 是否找到並處理了行
- **必要性**: 必要 - 逐行處理邏輯

---

### 7. ContentGenerator.js - 內容生成服務

**目的**: 使用 AI 生成郵件內容和 Lead Profile

#### 核心函數

##### generateLeadsProfile(name, title, company, email)
- **功能**: 生成潛在客戶檔案
- **Input**: 客戶基本資訊
- **Output**: string - 生成的檔案內容
- **必要性**: 必要 - AI 內容生成核心

##### generateMailAngles(leadsProfile, name)
- **功能**: 生成三個郵件角度
- **Input**:
  - leadsProfile: 客戶檔案
  - name: 客戶姓名
- **Output**: Array<string> - 三個郵件角度
- **必要性**: 必要 - 郵件策略生成

##### generateFirstMail(leadsProfile, mailAngle, name)
- **功能**: 生成第一封郵件
- **Input**: 客戶檔案、郵件角度、姓名
- **Output**: string - 郵件內容
- **必要性**: 必要 - 首次接觸郵件

##### generateSingleFollowUpMail(leadsProfile, mailAngle, firstName, mailNumber)
- **功能**: 生成單一後續郵件
- **Input**:
  - leadsProfile: 客戶檔案
  - mailAngle: 郵件角度
  - firstName: 姓名
  - mailNumber: 郵件編號 (2 或 3)
- **Output**: string - 郵件內容
- **必要性**: 必要 - 後續郵件生成

---

### 8. Utils.js - 工具函數

**目的**: 提供通用的輔助功能

#### 核心函數

##### parseEmailContent(content)
- **功能**: 解析郵件內容，分離主旨和內容
- **Input**: string - 原始內容
- **Output**: {subject: string, body: string}
- **必要性**: 必要 - 內容格式化

##### parseScheduleTime(timeString)
- **功能**: 解析排程時間字符串
- **Input**: string - 時間字符串
- **Output**: Date - 解析後的時間物件
- **必要性**: 必要 - 時間處理

##### generateUniqueId()
- **功能**: 生成唯一 ID
- **Input**: 無
- **Output**: string - 唯一標識符
- **必要性**: 必要 - 唯一標識生成

##### formatTaiwanTime(date)
- **功能**: 格式化台灣時間
- **Input**: Date - 時間物件
- **Output**: string - 格式化的時間字符串
- **必要性**: 重要 - 本地化時間顯示

---

### 9. 其他重要服務

#### ReplyDetectionService.js
- **目的**: 檢測郵件回覆並更新狀態
- **核心函數**: `checkAllRunningLeadsForReplies()`
- **必要性**: 重要 - 自動化回覆處理

#### TriggerManager.js
- **目的**: 管理時間觸發器
- **核心功能**: 創建、刪除、清理觸發器
- **必要性**: 必要 - 自動化排程管理

#### MenuService.js
- **目的**: 選單功能實現
- **核心功能**: 手動測試、統計查看等
- **必要性**: 重要 - 調試和監控功能

---

## 系統架構總結

### 數據流程
1. **用戶輸入** → Config.js (驗證) → RowProcessor.js (處理)
2. **內容生成** → ContentGenerator.js → APIService.js → Firebase Functions
3. **郵件處理** → EmailService.js → Gmail API
4. **狀態管理** → SheetService.js → Google Sheets

### 依賴關係
- 所有服務都依賴 Config.js 的配置
- APIService.js 是 AI 功能的核心依賴
- SheetService.js 是數據操作的核心依賴
- EmailService.js 整合了內容生成和郵件發送

### 必要性分級
- **必要**: Code.js, Config.js, APIService.js, SheetService.js, EmailService.js
- **重要**: ContentGenerator.js, ProcessingService.js, Utils.js
- **輔助**: MenuService.js, ReplyDetectionService.js, TriggerManager.js

這個系統實現了完整的潛在客戶自動化郵件流程，從內容生成到排程發送，再到回覆檢測，形成了一個完整的銷售自動化工具。