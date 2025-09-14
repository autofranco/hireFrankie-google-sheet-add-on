# Firebase Functions 測試

這個資料夾包含 Firebase Cloud Functions 的邏輯測試。

## 測試結構

```
test/
├── README.md              # 測試說明文件（本文件）
├── setup.js               # 測試環境設定（暫未使用）
├── simple.test.js         # 核心邏輯測試
└── .mocharc.json          # Mocha 配置文件
```

## 執行測試

### 安裝測試依賴
```bash
cd firebase/functions
npm install
```

### 執行測試
```bash
npm test
```

### 監視模式執行測試
```bash
npm run test:watch
```

### 執行測試並生成覆蓋率報告
```bash
npm run test:coverage
```

## 測試框架

- **Mocha**: 測試運行器
- **Chai**: 斷言庫

## 測試覆蓋範圍

### simple.test.js - 核心邏輯測試
- ✅ 參數驗證 - model 類型驗證
- ✅ 參數驗證 - token 數量驗證  
- ✅ 參數驗證 - 參數範圍限制
- ✅ 資料結構驗證 - 用戶資料結構
- ✅ 資料結構驗證 - 模型名稱轉換
- ✅ Health Check 邏輯 - 正常回應格式
- ✅ Health Check 邏輯 - 錯誤回應格式
- ✅ API Payload 構建 - Perplexity API 參數
- ✅ 錯誤代碼映射

## 測試策略

這些測試專注於：
- **核心業務邏輯驗證**：驗證參數驗證、資料轉換等核心邏輯
- **純函數測試**：不依賴外部服務的函數邏輯
- **邊界條件測試**：參數範圍、錯誤情況等
- **資料格式驗證**：API payload 格式、回應結構等

## 測試優勢

1. **快速執行**：無外部依賴，測試執行速度極快
2. **穩定可靠**：不依賴網路或外部服務狀態
3. **邊界覆蓋**：專注於邏輯邊界和錯誤情況
4. **易於維護**：測試結構簡單，易於理解和修改

## 擴展測試

如需新增新的邏輯測試：

1. 在 `simple.test.js` 中新增 describe 區塊
2. 專注於純邏輯驗證，避免外部依賴
3. 測試邊界條件和錯誤處理
4. 保持測試簡單快速

## 集成測試建議

對於需要完整集成測試的場景，建議：
- 使用 Firebase Functions 模擬器
- 設置測試專用的 Firebase 專案
- 使用真實的 Firestore 模擬器進行資料庫操作測試