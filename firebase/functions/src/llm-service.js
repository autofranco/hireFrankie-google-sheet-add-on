/**
 * 統一 LLM API 服務
 *
 * 整合 Perplexity、Gemini 和 GPT 等多種 LLM 供應商的 API 服務。
 * 提供統一的介面讓 Apps Script 透過單一 Firebase Cloud Function 呼叫所有 LLM 服務。
 *
 * @fileoverview Unified LLM API service for multiple AI providers
 * @version 1.0.0
 * @author HireFrankie Team
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');

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
 * 呼叫 Perplexity API (Sonar Pro 模型)
 *
 * 內部函數，使用 Perplexity 的 Sonar Pro 模型進行高精度 AI 推理。
 * 成本較高但品質更佳，支援更大的搜索上下文。
 *
 * @function callPerplexityAPI
 * @async
 * @param {string} prompt - 發送給 AI 的提示詞內容
 * @param {number} [temperature=0.0] - AI 回應的創意程度 (0-2)
 * @param {number} [maxTokens=500] - 最大回應 Token 數量 (1-1000)
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object|null} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * @throws {Error} API 調用失敗時拋出錯誤
 */
async function callPerplexityAPI(prompt, temperature = 0.2, maxTokens = 5000) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY 環境變數未設定');
  }

  const payload = {
    model: "sonar-pro",
    messages: [{
      role: "user",
      content: prompt.trim()
    }],
    temperature: Math.min(Math.max(temperature, 0), 2),
    max_tokens: Math.min(Math.max(maxTokens, 1), 5000),
    top_p: 1,
    search_context_size: "high"
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
    throw new Error(`Perplexity API 調用失敗: HTTP ${response.status}`);
  }

  const responseData = await response.json();

  if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
    console.error('Perplexity API 回應格式異常:', responseData);
    throw new Error('Perplexity API 回應格式錯誤');
  }

  return {
    content: responseData.choices[0].message.content,
    usage: responseData.usage || null
  };
}

/**
 * 呼叫 Gemini API
 *
 * 內部函數，使用 Google Gemini 模型進行 AI 推理。
 * 使用 OpenAI 兼容格式，支援多種 Gemini 模型，預設使用 gemini-2.5-flash。
 *
 * @function callGeminiAPI
 * @async
 * @param {string} prompt - 發送給 AI 的提示詞內容
 * @param {string} [model='gemini-2.5-flash'] - Gemini 模型名稱
 * @param {number} [temperature=0.2] - AI 回應的創意程度 (0-2)
 * @param {number} [maxTokens=5000] - 最大回應 Token 數量
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object|null} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * @throws {Error} API 調用失敗時拋出錯誤
 */
async function callGeminiAPI(prompt, model = 'gemini-2.5-flash', temperature = 0.2, maxTokens = 5000) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 環境變數未設定');
  }

  // 使用 OpenAI 兼容格式
  const payload = {
    model: model,
    messages: [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": prompt.trim()}
    ],
    temperature: Math.min(Math.max(temperature, 0), 2),
    max_tokens: Math.min(Math.max(maxTokens, 1), 8192),
    top_p: 1
  };

  const fetchFn = await loadFetch();
  const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API 錯誤:', response.status, errorText);
    throw new Error(`Gemini API 調用失敗: HTTP ${response.status}`);
  }

  const responseData = await response.json();

  if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
    console.error('Gemini API 回應格式異常:', responseData);
    throw new Error('Gemini API 回應格式錯誤');
  }

  return {
    content: responseData.choices[0].message.content,
    usage: responseData.usage || null
  };
}

/**
 * 呼叫 OpenAI GPT API
 *
 * 內部函數，使用 OpenAI GPT 模型進行 AI 推理。
 * 支援 GPT-4-mini 和 GPT-5-mini 模型，預設使用 gpt-5-mini。
 *
 * @function callGPTAPI
 * @async
 * @param {string} prompt - 發送給 AI 的提示詞內容
 * @param {string} [model='gpt-5-mini'] - GPT 模型名稱 ('gpt-4-mini' | 'gpt-5-mini')
 * @param {number} [temperature=0.2] - AI 回應的創意程度 (0-2)
 * @param {number} [maxTokens=1000] - 最大回應 Token 數量
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object|null} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * @throws {Error} API 調用失敗時拋出錯誤
 */
async function callGPTAPI(prompt, model = 'gpt-5-mini', temperature = 0.2, maxTokens = 5000) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 環境變數未設定');
  }

  // GPT-5-mini 有特殊參數限制
  const payload = {
    model: model,
    messages: [{
      role: "user",
      content: prompt.trim()
    }],
    max_completion_tokens: Math.min(Math.max(maxTokens, 1), 5000)
  };

  // GPT-5-mini 只支援 temperature=1 或不設定，其他模型可以設定
  if (model !== 'gpt-5-mini') {
    payload.temperature = Math.min(Math.max(temperature, 0), 2);
    payload.top_p = 1;
  }
  // GPT-5-mini 使用固定 temperature=1（預設值），不傳遞此參數

  const fetchFn = await loadFetch();
  const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API 錯誤:', response.status, errorText);
    throw new Error(`OpenAI API 調用失敗: HTTP ${response.status}`);
  }

  const responseData = await response.json();

  if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
    console.error('OpenAI API 回應格式異常:', responseData);
    throw new Error('OpenAI API 回應格式錯誤');
  }

  return {
    content: responseData.choices[0].message.content,
    usage: responseData.usage || null
  };
}

/**
 * 統一 LLM API 呼叫服務 - Firebase Cloud Function
 *
 * 提供統一的介面呼叫多種 LLM 供應商的 API 服務。
 * 支援 Perplexity、Gemini 和 GPT 三大供應商，依據參數路由到對應的內部服務。
 *
 * @function callLLMAPI
 * @async
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.data - 請求數據
 * @param {string} request.data.email - 用戶 email 地址
 * @param {string} request.data.prompt - 發送給 AI 的提示詞內容
 * @param {string} [request.data.provider='perplexity'] - LLM 供應商 ('perplexity' | 'gemini' | 'gpt')
 * @param {string} [request.data.model] - 模型名稱，依供應商而定：
 *   - perplexity: 固定使用 'sonar-pro'
 *   - gemini: 'gemini-2.5-flash' (預設)
 *   - gpt: 'gpt-4.1-mini', 'gpt-5-mini' (預設 'gpt-5-mini')
 * @param {number} [request.data.temperature=0.2] - AI 回應的創意程度 (0-2)
 * @param {number} [request.data.maxTokens=5000] - 最大回應 Token 數量
 *
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {string} returns.provider - 使用的供應商
 * @returns {string} returns.model - 使用的模型
 * @returns {Object|null} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 *
 * @throws {HttpsError} invalid-argument - 提示詞為空或無效、供應商不支援
 * @throws {HttpsError} internal - API 金鑰未設定或服務錯誤
 *
 * @example
 * // 在 Apps Script 中調用 Perplexity
 * const result = await callLLMAPI({
 *   email: 'user@example.com',
 *   prompt: '請用繁體中文撰寫一封專業的商務信件開場白',
 *   provider: 'perplexity',
 *   temperature: 0.0,
 *   maxTokens: 500
 * });
 *
 * @example
 * // 在 Apps Script 中調用 Gemini
 * const result = await callLLMAPI({
 *   email: 'user@example.com',
 *   prompt: '分析以下公司的業務狀況...',
 *   provider: 'gemini',
 *   model: 'gemini-2.5-flash',
 *   temperature: 0.2,
 *   maxTokens: 1000
 * });
 *
 * @example
 * // 在 Apps Script 中調用 GPT
 * const result = await callLLMAPI({
 *   email: 'user@example.com',
 *   prompt: '請幫我寫一個營銷計劃...',
 *   provider: 'gpt',
 *   model: 'gpt-4-mini',
 *   temperature: 0.3,
 *   maxTokens: 2000
 * });
 */
exports.callLLMAPI = onCall({
  timeoutSeconds: 120,
  memory: '512MiB',
  region: 'asia-east1'
}, async (request) => {
  try {
    // 1. 從 Apps Script 獲取用戶資訊和請求參數
    const {
      email,
      prompt,
      provider = 'perplexity',
      model,
      temperature = 0.2,
      maxTokens = 5000
    } = request.data;

    if (!email) {
      throw new HttpsError('invalid-argument', '請提供用戶 email 地址');
    }

    // 2. 驗證請求數據
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new HttpsError('invalid-argument', '提示詞不能為空');
    }

    // 3. 驗證供應商
    const supportedProviders = ['perplexity', 'gemini', 'gpt'];
    if (!supportedProviders.includes(provider)) {
      throw new HttpsError('invalid-argument', `不支援的供應商: ${provider}。支援的供應商: ${supportedProviders.join(', ')}`);
    }

    console.log(`LLM API 調用 - 用戶: ${email}, 供應商: ${provider}, 模型: ${model || '預設'}`);

    let result;
    let actualModel;

    // 4. 根據供應商路由到對應的內部服務
    switch (provider) {
      case 'perplexity':
        // Perplexity 固定使用 sonar-pro
        actualModel = 'sonar-pro';
        result = await callPerplexityAPI(prompt, temperature, maxTokens);
        break;

      case 'gemini':
        // Gemini 預設使用 gemini-2.5-flash
        actualModel = model || 'gemini-2.5-flash';
        result = await callGeminiAPI(prompt, actualModel, temperature, maxTokens);
        break;

      case 'gpt':
        // GPT 預設使用 gpt-5-mini
        actualModel = model || 'gpt-5-mini';
        const supportedGptModels = ['gpt-4-mini', 'gpt-5-mini'];
        if (!supportedGptModels.includes(actualModel)) {
          throw new HttpsError('invalid-argument', `不支援的 GPT 模型: ${actualModel}。支援的模型: ${supportedGptModels.join(', ')}`);
        }
        result = await callGPTAPI(prompt, actualModel, temperature, maxTokens);
        break;

      default:
        throw new HttpsError('invalid-argument', `未知的供應商: ${provider}`);
    }

    // 5. 記錄使用統計
    console.log(`${provider} (${actualModel}) 使用統計:`, result.usage || '無使用資訊');

    return {
      content: result.content,
      provider: provider,
      model: actualModel,
      usage: result.usage
    };

  } catch (error) {
    console.error('callLLMAPI 錯誤:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '服務暫時不可用，請稍後重試');
  }
});