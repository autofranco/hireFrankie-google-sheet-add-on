const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// 動態導入 node-fetch (ESM 模組)
let fetch;
async function loadFetch() {
  if (!fetch) {
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;
  }
  return fetch;
}

/**
 * 呼叫 Perplexity API (Sonar 模型)
 * 
 * 使用 Perplexity 的 Sonar 模型進行 AI 推理，主要用於生成 Mail Angle 和 First Mail。
 * 成本較低，適合一般文本生成任務。只有 paid 用戶可以使用此服務。
 * 
 * @function callPerplexityAPI
 * @async
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.auth - Firebase Auth 認證資訊
 * @param {string} request.auth.uid - 用戶唯一識別碼
 * @param {Object} request.data - 請求數據
 * @param {string} request.data.prompt - 發送給 AI 的提示詞內容
 * @param {number} [request.data.temperature=0.2] - AI 回應的創意程度 (0-2，數字越高越創意)
 * @param {number} [request.data.maxTokens=1000] - 最大回應 Token 數量 (1-2000)
 * 
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object|null} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * 
 * @throws {HttpsError} unauthenticated - 用戶未登入
 * @throws {HttpsError} invalid-argument - 提示詞為空或無效
 * @throws {HttpsError} not-found - 用戶資料不存在
 * @throws {HttpsError} permission-denied - 用戶未付費
 * @throws {HttpsError} internal - API 金鑰未設定或服務錯誤
 * 
 * @example
 * // 在 Apps Script 中調用
 * const callPerplexityAPI = firebase.functions().httpsCallable('callPerplexityAPI');
 * const result = await callPerplexityAPI({
 *   prompt: "請用繁體中文撰寫一封專業的商務信件開場白",
 *   temperature: 0.2,
 *   maxTokens: 500
 * });
 * console.log('AI 回應:', result.data.content);
 * console.log('使用 Token:', result.data.usage.total_tokens);
 */
exports.callPerplexityAPI = onCall({
  timeoutSeconds: 60,
  memory: '256MiB'
}, async (request) => {
  try {
    // 1. 從 Apps Script 獲取用戶資訊
    const {email, prompt, temperature = 0.2, maxTokens = 1000} = request.data;
    
    if (!email) {
      throw new HttpsError('invalid-argument', '請提供用戶 email 地址');
    }

    // 2. 驗證請求數據
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new HttpsError('invalid-argument', '提示詞不能為空');
    }

    // 3. 付費狀態檢查已在 Apps Script 端完成，此處專注於 AI API 調用
    console.log(`Sonar API 調用 - 用戶: ${email}`);

    // 4. 呼叫 Perplexity API
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new HttpsError('internal', '服務配置錯誤，請聯繫管理員');
    }

    const payload = {
      model: "sonar",
      messages: [{
        role: "user",
        content: prompt.trim()
      }],
      temperature: Math.min(Math.max(temperature, 0), 2), // 限制範圍 0-2
      max_tokens: Math.min(Math.max(maxTokens, 1), 2000)  // 限制範圍 1-2000
    };

    const fetchFn = await loadFetch();
    const response = await fetchFn('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API 錯誤:', response.status, errorText);
      throw new HttpsError('internal', '內容生成服務暫時不可用，請稍後重試');
    }

    const responseData = await response.json();
    
    // 5. 驗證回應格式
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error('API 回應格式異常:', responseData);
      throw new HttpsError('internal', '內容生成失敗，請稍後重試');
    }

    // 6. Token 使用量統計已移到 Apps Script 端處理
    console.log('Token 使用量:', responseData.usage || null);

    return {
      content: responseData.choices[0].message.content,
      usage: responseData.usage || null
    };

  } catch (error) {
    console.error('callPerplexityAPI 錯誤:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '服務暫時不可用，請稍後重試');
  }
});

/**
 * 呼叫 Perplexity API (Sonar Pro 模型)
 * 
 * 使用 Perplexity 的 Sonar Pro 模型進行高精度 AI 推理，主要用於生成 Lead Profile。
 * 成本較高但品質更佳，支援更大的搜索上下文。只有 paid 用戶可以使用此服務。
 * 
 * @function callPerplexityAPIPro
 * @async
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.auth - Firebase Auth 認證資訊
 * @param {string} request.auth.uid - 用戶唯一識別碼
 * @param {Object} request.data - 請求數據
 * @param {string} request.data.prompt - 發送給 AI 的提示詞內容
 * @param {number} [request.data.temperature=0.0] - AI 回應的創意程度 (0-2，Pro 模型建議使用較低值)
 * @param {number} [request.data.maxTokens=500] - 最大回應 Token 數量 (1-1000)
 * 
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object|null} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * 
 * @throws {HttpsError} unauthenticated - 用戶未登入
 * @throws {HttpsError} invalid-argument - 提示詞為空或無效
 * @throws {HttpsError} not-found - 用戶資料不存在
 * @throws {HttpsError} permission-denied - 用戶未付費
 * @throws {HttpsError} internal - API 金鑰未設定或服務錯誤
 * 
 * @example
 * // 在 Apps Script 中調用 - 用於生成詳細的 Lead Profile
 * const callPerplexityAPIPro = firebase.functions().httpsCallable('callPerplexityAPIPro');
 * const result = await callPerplexityAPIPro({
 *   prompt: "請分析以下公司的業務狀況和潛在需求...",
 *   temperature: 0.0,
 *   maxTokens: 500
 * });
 * console.log('Lead Profile:', result.data.content);
 */
exports.callPerplexityAPIPro = onCall({
  timeoutSeconds: 90,
  memory: '512MiB'
}, async (request) => {
  try {
    // 1. 從 Apps Script 獲取用戶資訊
    const {email, prompt, temperature = 0.0, maxTokens = 500} = request.data;
    
    if (!email) {
      throw new HttpsError('invalid-argument', '請提供用戶 email 地址');
    }

    // 2. 驗證請求數據
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new HttpsError('invalid-argument', '提示詞不能為空');
    }

    // 3. 付費狀態檢查已在 Apps Script 端完成，此處專注於 AI API 調用
    console.log(`Sonar Pro API 調用 - 用戶: ${email}`);

    // 4. 呼叫 Perplexity API Pro
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new HttpsError('internal', '服務配置錯誤，請聯繫管理員');
    }

    const payload = {
      model: "sonar-pro",
      messages: [{
        role: "user",
        content: prompt.trim()
      }],
      temperature: Math.min(Math.max(temperature, 0), 2),
      max_tokens: Math.min(Math.max(maxTokens, 1), 1000),
      search_context_size: "high" // Pro 模型專用參數
    };

    const fetchFn = await loadFetch();
    const response = await fetchFn('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API Pro 錯誤:', response.status, errorText);
      throw new HttpsError('internal', '內容生成服務暫時不可用，請稍後重試');
    }

    const responseData = await response.json();

    // 5. 驗證回應格式
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error('API Pro 回應格式異常:', responseData);
      throw new HttpsError('internal', '內容生成失敗，請稍後重試');
    }

    // 6. Token 使用量統計已移到 Apps Script 端處理
    console.log('Pro Token 使用量:', responseData.usage || null);

    return {
      content: responseData.choices[0].message.content,
      usage: responseData.usage || null
    };

  } catch (error) {
    console.error('callPerplexityAPIPro 錯誤:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '內容生成服務暫時不可用，請稍後重試');
  }
});

/**
 * Token 使用量統計已移到 Apps Script 端的 TokenTracker 處理
 * 此函數已停用
 */