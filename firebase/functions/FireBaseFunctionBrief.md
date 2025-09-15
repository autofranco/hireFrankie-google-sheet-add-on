# Firebase Functions 功能說明文檔

## 架構概覽

HireFrankie Firebase Functions 提供 AI 驅動的潛在客戶開發和電子郵件生成服務，採用 Firebase Functions v2 架構，部署在 `asia-east1` 區域。

### 技術棧
- **Runtime**: Node.js 20
- **Framework**: Firebase Functions v2
- **Authentication**: Google Sheets JWT
- **AI Service**: Perplexity API (Sonar & Sonar Pro)
- **User Management**: Google Sheets
- **Region**: asia-east1 (亞洲東部，接近台灣)

---

## 文件結構

### 核心文件
- **index.js** - 主入口文件，函數導出和全域配置
- **src/perplexity-service.js** - Perplexity AI API 服務
- **src/user-service.js** - 用戶管理服務
- **package.json** - 依賴管理和腳本配置
- **build.js** - 構建腳本

### 配置文件
- **firebase.json** - Firebase 專案配置
- **firestore.rules** - Firestore 安全規則（已不使用）
- **firestore.indexes.json** - Firestore 索引配置（已不使用）

---

## 主要服務詳解

### 1. index.js - 主入口文件

**目的**: Firebase Functions 的主入口點，負責函數導出和全域配置

#### 全域配置
```javascript
setGlobalOptions({
  region: 'asia-east1'
});
```

#### 導出的 Cloud Functions

##### Perplexity AI Functions
- `callPerplexityAPI` - Sonar 模型 API
- `callPerplexityAPIPro` - Sonar Pro 模型 API

##### 用戶管理 Functions
- `createUser` - 創建或更新用戶
- `updateUserUsage` - 更新 Token 使用量
- `getUserInfo` - 獲取用戶資訊

##### 系統監控 Functions
- `healthCheck` - 健康狀態檢查

#### healthCheck Function
- **類型**: HTTP Request Function
- **用途**: 系統健康狀態監控
- **Input**: HTTP GET/POST 請求
- **Output**: JSON 健康狀態報告
- **特性**:
  - CORS 支援
  - 服務狀態檢查
  - 版本資訊回報

---

### 2. src/perplexity-service.js - AI 服務

**目的**: 提供 Perplexity AI API 的封裝服務，支援兩種模型

#### callPerplexityAPI Function

##### 基本資訊
- **模型**: Sonar
- **用途**: 一般文本生成（Mail Angle, First Mail）
- **成本**: 較低
- **超時**: 60 秒
- **記憶體**: 256MiB

##### Input 參數
```javascript
{
  email: string,           // 用戶 email（付費驗證用）
  prompt: string,          // AI 提示詞
  temperature?: number,    // 創意程度 (0-2，預設 0.2)
  maxTokens?: number      // 最大 Token 數 (1-2000，預設 1000)
}
```

##### Output 格式
```javascript
{
  content: string,        // AI 生成的內容
  usage: {               // Token 使用統計
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number
  }
}
```

##### 處理流程
1. **用戶驗證**: 檢查 email 參數
2. **請求驗證**: 驗證 prompt 不為空
3. **付費檢查**: 透過 Google Sheets 檢查付費狀態
4. **API 調用**: 呼叫 Perplexity Sonar API
5. **回應處理**: 格式化並回傳結果

##### 錯誤處理
- `invalid-argument`: 參數錯誤
- `permission-denied`: 用戶未付費
- `internal`: API 錯誤或系統問題

---

#### callPerplexityAPIPro Function

##### 基本資訊
- **模型**: Sonar Pro
- **用途**: 高精度分析（Lead Profile 生成）
- **成本**: 較高
- **超時**: 90 秒
- **記憶體**: 512MiB

##### 特殊參數
```javascript
{
  search_context_size: "high"  // Pro 模型專用參數
}
```

##### 與標準版差異
- 更大的搜索上下文
- 更高的回應品質
- 更長的處理時間
- 更高的成本

---

### 3. src/user-service.js - 用戶管理服務

**目的**: 處理用戶註冊、認證和使用量統計，已完全遷移至 Google Sheets 架構

#### 技術特性
- **數據存儲**: 純 Google Sheets
- **認證方式**: JWT Service Account
- **付費檢查**: 實時 Google Sheets 查詢
- **架構**: 已移除所有 Firestore 依賴

#### createUser Function

##### 用途
創建或更新用戶資料到 Google Sheets

##### Input 參數
```javascript
{
  email: string,          // 用戶 email
  name?: string,          // 用戶姓名（選填）
  source?: string         // 註冊來源（選填）
}
```

##### Output 格式
```javascript
{
  success: boolean,
  message: string,
  userData: {
    email: string,
    paymentStatus: string,
    createdAt: string,
    isNewUser: boolean
  }
}
```

##### 處理流程
1. **參數驗證**: 檢查 email 格式和必要參數
2. **Google Sheets 連接**: 使用 JWT 認證連接表單
3. **用戶檢查**: 查詢是否為現有用戶
4. **數據處理**:
   - 新用戶: 添加新記錄
   - 現有用戶: 更新最後活動時間
5. **回應生成**: 回傳處理結果

---

#### updateUserUsage Function

##### 用途
更新用戶的 Token 使用量統計

##### Input 參數
```javascript
{
  email: string,
  usage: {
    model: string,         // 'sonar' 或 'sonar-pro'
    inputTokens: number,
    outputTokens: number,
    totalTokens: number,
    cost: number           // 台幣成本
  }
}
```

##### 處理邏輯
1. 驗證用戶存在性
2. 累加使用量統計
3. 更新 Google Sheets 記錄
4. 計算總成本

---

#### getUserInfo Function

##### 用途
獲取用戶詳細資訊和使用統計

##### Output 格式
```javascript
{
  email: string,
  paymentStatus: string,
  totalUsage: {
    sonar: {
      inputTokens: number,
      outputTokens: number,
      totalCost: number
    },
    sonarPro: {
      inputTokens: number,
      outputTokens: number,
      totalCost: number
    }
  },
  lastActivity: string
}
```

---

## Google Sheets 整合

### 用戶管理表單結構
```
Column A: Email
Column B: Payment Status (paid/unpaid)
Column C: Created Date
Column D: Last Activity
Column E: Total Sonar Tokens
Column F: Total Sonar Pro Tokens
Column G: Total Cost (TWD)
```

### JWT 認證配置
使用環境變數 `PAID_USERS_SHEET_CONFIG` 存儲：
```javascript
{
  client_email: string,
  private_key: string,
  sheet_id: string
}
```

---

## 付費驗證機制

### 驗證流程
1. **實時查詢**: 每次 API 調用都查詢 Google Sheets
2. **狀態檢查**: 檢查 `paymentStatus` 欄位為 `'paid'`
3. **權限控制**: 只有付費用戶可調用 AI API
4. **錯誤處理**: 未付費用戶收到 `permission-denied` 錯誤

### 管理員操作
- 直接在 Google Sheets 中編輯付費狀態
- 即時生效，無需重新部署
- 支援批量管理

---

## API 成本控制

### Token 追蹤
- **即時統計**: 每次 API 調用記錄 Token 使用量
- **成本計算**: 自動轉換為台幣成本
- **累計統計**: 維護用戶總使用量

### 價格設定 (美金/百萬 Tokens)
- **Sonar**: Input $1, Output $1
- **Sonar Pro**: Input $3, Output $15
- **匯率**: 1 USD = 30 TWD

---

## 部署和監控

### 部署配置
```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "region": "asia-east1"
  }
}
```

### 環境變數
- `PERPLEXITY_API_KEY`: Perplexity API 金鑰
- `PAID_USERS_SHEET_CONFIG`: Google Sheets 認證配置

### 監控端點
- **健康檢查**: `/healthCheck`
- **回應格式**: JSON 狀態報告
- **監控項目**: API 狀態、服務可用性、版本資訊

---

## 錯誤處理和日誌

### 統一錯誤格式
```javascript
{
  code: string,           // 錯誤代碼
  message: string,        // 錯誤訊息
  details?: object        // 詳細資訊
}
```

### 常見錯誤代碼
- `invalid-argument`: 參數錯誤
- `permission-denied`: 權限不足
- `not-found`: 資源不存在
- `internal`: 系統內部錯誤

### 日誌記錄
- 所有 API 調用都有完整日誌
- 錯誤情況包含詳細堆棧資訊
- 付費狀態檢查結果記錄

---

## 安全性

### 認證機制
- Firebase Functions 內建認證
- Google Sheets JWT 認證
- 即時付費狀態驗證

### 數據保護
- 敏感資訊使用環境變數
- API 金鑰安全存儲
- 用戶資料僅存儲必要資訊

### 訪問控制
- 區域限制部署
- CORS 設定適當
- 錯誤訊息不洩露敏感資訊

---

## 效能優化

### 函數配置
- 適當的記憶體分配
- 合理的超時設定
- 區域就近部署

### 快取策略
- Google Sheets 認證快取
- API 回應結果快取
- 環境變數一次性讀取

### 成本控制
- Token 使用量即時追蹤
- 按需分配資源
- 自動錯誤重試機制

這個 Firebase Functions 架構提供了穩定、安全、高效的 AI 驅動服務，支援完整的用戶管理和成本控制機制。