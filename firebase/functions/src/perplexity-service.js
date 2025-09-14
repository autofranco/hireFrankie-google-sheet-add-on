const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

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
    // 1. 驗證用戶認證
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '需要登入才能使用 AI 服務');
    }

    // 2. 驗證請求數據
    const {prompt, temperature = 0.2, maxTokens = 1000} = request.data;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new HttpsError('invalid-argument', '提示詞不能為空');
    }

    // 3. 檢查用戶付款狀態
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();
    
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '用戶資料不存在，請先完成註冊');
    }

    const userData = userDoc.data();
    if (userData.paymentStatus !== 'paid') {
      throw new HttpsError('permission-denied', '請先完成付款才能使用 AI 服務');
    }

    // 4. 呼叫 Perplexity API
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new HttpsError('internal', 'API 金鑰未設定，請聯繫管理員');
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

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
      throw new HttpsError('internal', `Perplexity API 錯誤 (${response.status})，請稍後重試`);
    }

    const responseData = await response.json();
    
    // 5. 驗證回應格式
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error('API 回應格式異常:', responseData);
      throw new HttpsError('internal', 'API 回應格式異常，請稍後重試');
    }

    // 6. 更新用戶使用量
    if (responseData.usage) {
      const inputTokens = responseData.usage.prompt_tokens || 0;
      const outputTokens = responseData.usage.completion_tokens || 0;
      await updateTokenUsage(request.auth.uid, 'sonar', inputTokens, outputTokens);
    }

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
    // 1. 驗證用戶認證
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '需要登入才能使用 AI Pro 服務');
    }

    // 2. 驗證請求數據
    const {prompt, temperature = 0.0, maxTokens = 500} = request.data;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new HttpsError('invalid-argument', '提示詞不能為空');
    }

    // 3. 檢查用戶付款狀態
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();
    
    if (!userDoc.exists) {
      throw new HttpsError('not-found', '用戶資料不存在，請先完成註冊');
    }

    const userData = userDoc.data();
    if (userData.paymentStatus !== 'paid') {
      throw new HttpsError('permission-denied', '請先完成付款才能使用 AI Pro 服務');
    }

    // 4. 呼叫 Perplexity API Pro
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new HttpsError('internal', 'API 金鑰未設定，請聯繫管理員');
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

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
      throw new HttpsError('internal', `Perplexity API Pro 錯誤 (${response.status})，請稍後重試`);
    }

    const responseData = await response.json();

    // 5. 驗證回應格式
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error('API Pro 回應格式異常:', responseData);
      throw new HttpsError('internal', 'API 回應格式異常，請稍後重試');
    }

    // 6. 更新用戶使用量
    if (responseData.usage) {
      const inputTokens = responseData.usage.prompt_tokens || 0;
      const outputTokens = responseData.usage.completion_tokens || 0;
      await updateTokenUsage(request.auth.uid, 'sonar-pro', inputTokens, outputTokens);
    }

    return {
      content: responseData.choices[0].message.content,
      usage: responseData.usage || null
    };

  } catch (error) {
    console.error('callPerplexityAPIPro 錯誤:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Pro 服務暫時不可用，請稍後重試');
  }
});

/**
 * 更新用戶 Token 使用量 (內部輔助函數)
 * 
 * 當 AI API 調用完成後，自動更新用戶在 Firestore 中的 Token 使用統計。
 * 使用原子性操作確保數據一致性。
 * 
 * @function updateTokenUsage
 * @async
 * @private
 * @param {string} userId - 用戶唯一識別碼
 * @param {string} model - AI 模型類型 ('sonar' 或 'sonar-pro')
 * @param {number} inputTokens - 輸入 Token 數量
 * @param {number} outputTokens - 輸出 Token 數量
 * 
 * @returns {Promise<void>} 無回傳值
 * 
 * @throws {Error} 當 Firestore 更新失敗時拋出
 * 
 * @example
 * // 內部使用 - 在 API 調用後自動執行
 * await updateTokenUsage('user123', 'sonar-pro', 150, 300);
 */
async function updateTokenUsage(userId, model, inputTokens, outputTokens) {
  const userRef = admin.firestore().collection('users').doc(userId);
  const modelKey = model === 'sonar-pro' ? 'sonarPro' : 'sonar';

  await userRef.update({
    [`usage.currentMonth.${modelKey}.inputTokens`]: admin.firestore.FieldValue.increment(inputTokens || 0),
    [`usage.currentMonth.${modelKey}.outputTokens`]: admin.firestore.FieldValue.increment(outputTokens || 0),
    'usage.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
  });
}