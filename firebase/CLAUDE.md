# Firebase Functions - HireFrankie Backend

> AI 驅動的潛在客戶分析和內容生成後端服務

## 📋 項目概述

HireFrankie Firebase Functions 為 Auto Lead Warmer 系統提供強大的後端 AI 服務，包括多 LLM 供應商支持、用戶管理、Token 追蹤等核心功能。

### 核心服務
- 🤖 多 LLM API 統一調用 (Perplexity, Gemini, OpenAI)
- 👥 用戶認證和使用量管理
- 📊 Token 消耗統計和成本追蹤
- 🔒 安全的 API 金鑰管理
- 🌏 區域化部署 (asia-east1)

### 技術架構
- **Runtime**: Node.js 20
- **Framework**: Firebase Functions v2
- **Authentication**: Apps Script JWT + 用戶驗證
- **Storage**: Google Sheets (用戶數據)
- **Monitoring**: Firebase Console + Stackdriver

---

## 🏗️ 系統架構

### 服務分層
```
┌─────────────────────────────────────────┐
│           Apps Script Client            │
│        (Frontend/Google Sheets)         │
├─────────────────────────────────────────┤
│          Firebase Functions             │
│            (API Gateway)                │
├─────────────────────────────────────────┤
│           LLM Services                  │
│   Perplexity | Gemini | OpenAI         │
├─────────────────────────────────────────┤
│           User Management               │
│         (Google Sheets DB)              │
└─────────────────────────────────────────┘
```

### API 架構模式
```javascript
// 統一調用入口
exports.callLLMAPI = onCall({
  region: 'asia-east1',
  memory: '256MiB',
  timeoutSeconds: 120
}, async (request) => {
  // 用戶驗證 → 供應商路由 → API 調用 → 使用量追蹤
});
```

---

## 📁 項目結構

### 🔧 核心文件
```
firebase/
├── firebase.json             # Firebase 項目配置
├── .firebaserc              # 部署目標配置
├── firestore.rules          # Firestore 安全規則（未使用）
└── firestore.indexes.json   # Firestore 索引（未使用）
```

### 🎯 Functions 目錄
```
functions/
├── index.js                 # 主入口和函數導出
├── package.json             # 依賴管理和腳本
├── build.js                 # 構建腳本
├── .env                     # 環境變數配置
├── .mocharc.json           # 測試配置
└── CLAUDE.md               # 本開發文檔
```

### 🧩 核心服務模組
```
src/
├── llm-service.js           # LLM API 統一調用服務
├── user-service.js          # 用戶管理和認證
├── token-service.js         # Token 計算和追蹤
└── cost-service.js          # 成本分析和報告
```

---

## ⚙️ 開發環境設置

### 環境準備
```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入 Firebase
firebase login

# 初始化項目
firebase init functions

# 切換到 functions 目錄
cd functions
```

### 本地開發
```bash
# 安裝依賴
npm install

# 本地模擬器運行
npm run serve

# 運行測試
npm test

# 測試覆蓋率
npm run test:coverage
```

### 環境變數配置
```bash
# 設置 API 金鑰
firebase functions:config:set \
  perplexity.api_key="YOUR_KEY" \
  gemini.api_key="YOUR_KEY" \
  openai.api_key="YOUR_KEY"
```

---

## 🔌 API 服務詳解

### 1. 統一 LLM API 調用
```javascript
/**
 * 主要入口點 - 統一 LLM API 調用
 * @param {Object} request.data
 * @param {string} request.data.prompt - AI 提示詞
 * @param {string} request.data.provider - 供應商 (perplexity|gemini|gpt)
 * @param {string} request.data.model - 模型名稱
 * @param {number} request.data.temperature - 創意程度 (0-2)
 * @param {number} request.data.maxTokens - 最大 Token 數
 */
exports.callLLMAPI = onCall({...}, async (request) => {
  // 實現統一的 LLM 調用邏輯
});
```

### 2. 供應商特定服務

#### Perplexity API
```javascript
// 搜索增強生成，適合需要最新資訊的查詢
async function callPerplexityAPI(prompt, temperature = 0.2, maxTokens = 5000) {
  // 使用 Sonar Pro 模型進行高精度推理
  // 支援即時網路搜索
}
```

#### Google Gemini API
```javascript
// 使用官方 @google/genai SDK
async function callGeminiAPI(prompt, model = 'gemini-2.5-flash') {
  // 關閉 thinking 模式以加速回應
  // 支援多模態輸入
}
```

#### OpenAI API
```javascript
// 支援 GPT-5-mini 和 GPT-4.1-mini
async function callGPTAPI(prompt, model = 'gpt-5-mini-2025-08-07') {
  // 自動路由到對應的 API 實現
  // 處理不同模型的參數限制
}
```

### 3. 用戶管理服務
```javascript
/**
 * 用戶認證和付費狀態檢查
 */
exports.createUser = onCall({...}, async (request) => {
  // 創建新用戶記錄
});

exports.getUserInfo = onCall({...}, async (request) => {
  // 獲取用戶資訊和使用量
});

exports.updateUserUsage = onCall({...}, async (request) => {
  // 更新用戶 Token 使用量
});
```

### 4. 測試服務
```javascript
// 各供應商連接測試
exports.testPerplexity = onCall({...}, testConnection);
exports.testGemini = onCall({...}, testConnection);
exports.testGPT5Mini = onCall({...}, testConnection);
```

---

## 🔒 安全和權限管理

### 環境變數安全
```javascript
// 使用 Firebase Config 管理敏感資訊
const apiKey = process.env.PERPLEXITY_API_KEY;
if (!apiKey) {
  throw new Error('API_KEY 環境變數未設定');
}
```

### 用戶認證流程
```javascript
// 1. 驗證來源（Apps Script）
const { auth } = context;
if (!auth || !auth.uid) {
  throw new HttpsError('unauthenticated', '用戶未登入');
}

// 2. 檢查付費狀態
const userInfo = await getUserPaymentStatus(email);
if (!userInfo.isPaid) {
  throw new HttpsError('permission-denied', '需要付費訂閱');
}
```

### API 調用限制
```javascript
// Rate Limiting 和使用量控制
const dailyLimit = 10000; // Tokens per day
if (currentUsage + requestTokens > dailyLimit) {
  throw new HttpsError('resource-exhausted', '每日使用量已達上限');
}
```

---

## 📊 監控和日誌

### 日誌策略
```javascript
// 結構化日誌記錄
console.log('=== LLM API 調用開始 ===');
console.log('用戶:', email);
console.log('供應商:', provider);
console.log('模型:', model);
console.log('提示詞長度:', prompt.length);

// 性能監控
const startTime = Date.now();
const result = await apiCall();
const duration = Date.now() - startTime;
console.log(`API 調用耗時: ${duration}ms`);
```

### 錯誤處理
```javascript
try {
  const result = await callLLMAPI(prompt, provider, model);
  return result;
} catch (error) {
  console.error(`${provider} API 調用失敗:`, error);

  // 分類錯誤類型
  if (error.status === 429) {
    throw new HttpsError('resource-exhausted', 'API 調用頻率超限');
  } else if (error.status === 401) {
    throw new HttpsError('permission-denied', 'API 金鑰無效');
  } else {
    throw new HttpsError('internal', '服務暫時不可用');
  }
}
```

### 使用量統計
```javascript
// Token 消耗追蹤
const tokenUsage = {
  provider: provider,
  model: model,
  promptTokens: result.usage?.prompt_tokens || 0,
  completionTokens: result.usage?.completion_tokens || 0,
  totalTokens: result.usage?.total_tokens || 0,
  timestamp: new Date().toISOString()
};

await updateUserUsage(email, tokenUsage);
```

---

## 🚀 部署和維護

### 部署流程
```bash
# 1. 構建項目
npm run build

# 2. 部署到 Firebase
firebase deploy --only functions

# 3. 檢查部署狀態
firebase functions:log

# 4. 監控性能
firebase console
```

### 環境管理
```bash
# 開發環境
firebase use development
firebase deploy --only functions

# 生產環境
firebase use production
firebase deploy --only functions
```

### 版本管理
```javascript
// package.json 版本追蹤
{
  "name": "functions",
  "version": "1.2.0",
  "engines": {
    "node": "20"
  }
}
```

---

## 🛠️ Claude 開發最佳實踐

### ✅ 推薦做法

#### 錯誤處理
```javascript
// 完整的錯誤處理鏈
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  console.error('API 調用失敗:', error);
  return { success: false, error: error.message };
}
```

#### 異步操作
```javascript
// 正確的異步處理
const result = await Promise.all([
  callPerplexityAPI(prompt1),
  callGeminiAPI(prompt2),
  callGPTAPI(prompt3)
]);
```

#### 資源管理
```javascript
// 適當的記憶體和超時設置
exports.heavyTask = onCall({
  memory: '512MiB',
  timeoutSeconds: 300,
  region: 'asia-east1'
}, async (request) => {
  // 處理大型任務
});
```

### ❌ 避免做法

```javascript
// ❌ 硬編碼 API 金鑰
const apiKey = "sk-12345...";

// ❌ 忽略錯誤處理
const result = callAPI(); // 可能導致 Functions 崩潰

// ❌ 超出時間限制
// 不要在單個 Function 中執行超過 9 分鐘的任務

// ❌ 忽略記憶體限制
// 避免在 256MB 限制下處理大型數據集
```

### 性能優化
```javascript
// 1. 善用緩存
const cache = new Map();
if (cache.has(key)) {
  return cache.get(key);
}

// 2. 批量處理
const batch = requests.slice(0, 10); // 限制並發數量

// 3. 早期返回
if (!isValid(input)) {
  return { error: 'Invalid input' };
}
```

---

## 🧪 測試策略

### 單元測試
```bash
# 運行所有測試
npm test

# 監控模式
npm run test:watch

# 覆蓋率報告
npm run test:coverage
```

### 集成測試
```javascript
// 測試 LLM API 集成
describe('LLM API Integration', () => {
  it('should call Perplexity API successfully', async () => {
    const result = await callPerplexityAPI('test prompt');
    expect(result).to.have.property('content');
  });
});
```

### 負載測試
```javascript
// 測試 API 負載能力
const concurrentRequests = 10;
const promises = Array(concurrentRequests).fill(null).map(() =>
  callLLMAPI('test', 'perplexity', 'sonar-pro')
);
const results = await Promise.all(promises);
```

---

## 📈 成本優化

### Token 使用優化
```javascript
// 1. 智能提示詞截斷
const truncatedPrompt = prompt.length > 4000 ?
  prompt.substring(0, 4000) + '...' : prompt;

// 2. 模型選擇策略
const model = complexity > 0.8 ? 'sonar-pro' : 'sonar';

// 3. 緩存常用結果
const cacheKey = `${provider}_${hashPrompt(prompt)}`;
```

### 供應商成本分析
```javascript
// 成本比較和路由
const costPerToken = {
  'perplexity-sonar': 0.0001,
  'gemini-2.5-flash': 0.00005,
  'gpt-5-mini': 0.00015
};

// 選擇最經濟的供應商
const optimal = findOptimalProvider(prompt, requirements);
```

---

## 🔧 LLM 服務實現詳解

### Perplexity API 整合
```javascript
async function callPerplexityAPI(prompt, temperature = 0.2, maxTokens = 5000) {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  const requestBody = {
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that provides accurate information.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: temperature,
    max_tokens: maxTokens,
    return_citations: true,
    search_domain_filter: ["perplexity.ai"],
    return_images: false,
    return_related_questions: false
  };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  return await response.json();
}
```

### Gemini API 整合
```javascript
async function callGeminiAPI(prompt, model = 'gemini-2.5-flash') {
  const { GoogleGenerativeAI } = require('@google/genai');
  const apiKey = process.env.GEMINI_API_KEY;

  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({
    model: model,
    systemInstruction: {
      parts: [{
        text: "You are a helpful assistant. Respond in Traditional Chinese unless otherwise specified."
      }]
    }
  });

  const result = await generativeModel.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }]
  });

  return {
    content: result.response.text(),
    usage: {
      prompt_tokens: result.response.usageMetadata?.promptTokenCount || 0,
      completion_tokens: result.response.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: result.response.usageMetadata?.totalTokenCount || 0
    }
  };
}
```

### OpenAI GPT API 整合
```javascript
async function callGPTAPI(prompt, model = 'gpt-5-mini-2025-08-07', temperature, maxTokens) {
  const apiKey = process.env.OPENAI_API_KEY;

  const requestBody = {
    model: model,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Always respond in Traditional Chinese unless specifically asked otherwise.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  // GPT-5-mini 特殊處理
  if (model === 'gpt-5-mini-2025-08-07') {
    // GPT-5-mini 不支援 temperature 和 top_p 參數
    if (maxTokens) {
      requestBody.max_completion_tokens = maxTokens;
    }
  } else {
    // 其他 GPT 模型支援完整參數
    if (temperature !== undefined) {
      requestBody.temperature = temperature;
    }
    if (maxTokens) {
      requestBody.max_completion_tokens = maxTokens;
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  return await response.json();
}
```

---

## 📚 相關資源

### 官方文檔
- [Firebase Functions 文檔](https://firebase.google.com/docs/functions)
- [Google Cloud Functions 文檔](https://cloud.google.com/functions/docs)
- [Node.js Runtime 文檔](https://firebase.google.com/docs/functions/manage-functions#set_nodejs_version)

### API 文檔
- [Perplexity API](https://docs.perplexity.ai/)
- [Google Gemini API](https://ai.google.dev/docs)
- [OpenAI API](https://platform.openai.com/docs)

### 內部文檔
- `../apps-script/CLAUDE.md` - 前端開發文檔
- `../spec.md` - 產品需求規格

---

## 🔍 故障排除

### 常見問題

#### 部署失敗
```bash
# 檢查 Node.js 版本
node --version  # 應該是 v20.x

# 清除依賴重新安裝
rm -rf node_modules package-lock.json
npm install
```

#### API 調用超時
```javascript
// 增加超時時間
exports.longRunningTask = onCall({
  timeoutSeconds: 300  // 5 分鐘
}, async (request) => {
  // 長時間運行的任務
});
```

#### 記憶體不足
```javascript
// 增加記憶體配置
exports.memoryIntensiveTask = onCall({
  memory: '1GiB'  // 最大 8GiB
}, async (request) => {
  // 記憶體密集型任務
});
```

#### API 金鑰問題
```bash
# 檢查環境變數
firebase functions:config:get

# 重新設置 API 金鑰
firebase functions:config:set openai.api_key="新的金鑰"
```

---

## 🚦 開發工作流程

### 本地開發循環
```bash
# 1. 啟動模擬器
npm run serve

# 2. 測試功能
curl -X POST http://localhost:5001/PROJECT_ID/asia-east1/callLLMAPI \
  -H "Content-Type: application/json" \
  -d '{"data": {"prompt": "test", "provider": "gemini"}}'

# 3. 查看日誌
firebase emulators:logs

# 4. 修改代碼並重新啟動
```

### 部署檢查清單
- [ ] 所有測試通過
- [ ] 環境變數已設置
- [ ] 記憶體和超時設置合理
- [ ] 錯誤處理完善
- [ ] 日誌記錄充分
- [ ] 成本控制機制已實現

---

*最後更新: 2025-09-21*
*版本: v1.2.0*