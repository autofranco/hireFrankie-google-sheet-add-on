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

const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const { GoogleGenAI } = require('@google/genai');
const { tokenService } = require('./token-service');

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
 * 使用 Perplexity Sonar Pro 模型進行高精度 AI 推理和搜索增強生成。
 * 提供即時網路搜索能力，適合需要最新資訊的查詢。
 * 成本較高但品質更佳，支援更大的搜索上下文。
 *
 * @function callPerplexityAPI
 * @async
 * @param {string} prompt - 發送給 AI 的提示詞內容
 * @param {number} [temperature=0.2] - AI 回應的創意程度 (0-2)，數值越高越有創意
 * @param {number} [maxTokens=5000] - 最大回應 Token 數量 (1-5000)
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object|null} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * @returns {Object} returns.tracking - API 呼叫追蹤資訊
 * @returns {number} returns.tracking.duration_ms - 執行時間（毫秒）
 * @returns {number} returns.tracking.cost_twd - 新台幣費用
 * @returns {string} returns.tracking.trackingId - 追蹤 ID
 * @throws {Error} API 金鑰未設定或 API 調用失敗時拋出錯誤
 *
 * @example
 * const result = await callPerplexityAPI('最新的AI發展趨勢是什麼？', 0.3, 1000);
 * console.log(result.content);
 */
async function callPerplexityAPI(prompt, temperature = 0.2, maxTokens = 5000) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY 環境變數未設定');
  }

  // 開始追蹤 API 呼叫
  const tracker = tokenService.startAPICall('perplexity', 'sonar-pro');

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

  try {
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

    // 記錄完整的原始 API 回應
    console.log('=== Perplexity API 完整原始回應 ===');
    console.log('時間戳記:', new Date().toISOString());
    console.log('追蹤 ID:', tracker.trackingId);
    console.log('完整回應內容:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('=== Perplexity API 原始回應結束 ===');

    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error('Perplexity API 回應格式異常:', responseData);
      throw new Error('Perplexity API 回應格式錯誤');
    }

    // 結束追蹤並計算費用
    const usage = responseData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const tracking = tokenService.endAPICall(tracker, usage);

    return {
      content: responseData.choices[0].message.content,
      usage: usage,
      tracking: tracking
    };
  } catch (error) {
    // 如果發生錯誤，仍然記錄追蹤資訊（但費用為 0）
    const errorUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const tracking = tokenService.endAPICall(tracker, errorUsage);
    console.error('Perplexity API 追蹤錯誤:', tracking);
    throw error;
  }
}

/**
 * 呼叫 Google Gemini API
 *
 * 使用官方 @google/genai SDK 呼叫 Google Gemini 2.5 Flash 模型進行 AI 推理。
 * 支援關閉 thinking 模式以加速回應和節省 token 消耗。
 *
 * @function callGeminiAPI
 * @async
 * @param {string} prompt - 發送給 AI 的提示詞內容
 * @param {string} [model='gemini-2.5-flash'] - Gemini 模型名稱
 * @param {number} [temperature=0.2] - AI 回應的創意程度 (0-2)，不適用於 thinking 關閉模式
 * @param {number} [maxTokens=5000] - 最大回應 Token 數量（參考值）
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object} returns.usage - Token 使用量統計（實際或估算）
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * @returns {Object} returns.tracking - API 呼叫追蹤資訊
 * @returns {number} returns.tracking.duration_ms - 執行時間（毫秒）
 * @returns {number} returns.tracking.cost_twd - 新台幣費用
 * @returns {string} returns.tracking.trackingId - 追蹤 ID
 * @throws {Error} API 金鑰未設定或 API 調用失敗時拋出錯誤
 *
 * @example
 * const result = await callGeminiAPI('解釋 AI 如何工作', 'gemini-2.5-flash', 0.3, 1000);
 * console.log(result.content);
 */
async function callGeminiAPI(prompt, model = 'gemini-2.5-flash', temperature = 0.2, maxTokens = 5000) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 環境變數未設定');
  }

  // 開始追蹤 API 呼叫
  const tracker = tokenService.startAPICall('gemini', model);

  try {
    // 初始化 GoogleGenAI 客戶端，從環境變數自動取得 API Key
    const ai = new GoogleGenAI({
      apiKey: apiKey
    });

    console.log(`呼叫 Gemini API - 模型: ${model}, 提示詞長度: ${prompt.length}`);

    // 調用 generateContent 方法，關閉 thinking 以加速回應
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt.trim(),
      config: {
        thinkingConfig: {
          thinkingBudget: 0 // 關閉 thinking 模式
        }
      }
    });

    console.log('Gemini API 調用成功');

    // 記錄完整的原始 API 回應
    console.log('=== Gemini API 完整原始回應 ===');
    console.log('時間戳記:', new Date().toISOString());
    console.log('追蹤 ID:', tracker.trackingId);
    console.log('完整回應內容:');
    console.log(JSON.stringify(response, null, 2));
    console.log('=== Gemini API 原始回應結束 ===');

    // 檢查回應是否有效
    if (!response || !response.text) {
      console.error('Gemini API 回應格式異常:', response);
      throw new Error('Gemini API 回應格式錯誤：無法獲取文本內容');
    }

    // 結束追蹤並計算費用
    // 注意：Gemini SDK 可能不提供詳細的 usage 統計，需要估算
    const estimatedUsage = response.usage || {
      prompt_tokens: Math.ceil(prompt.length / 4), // 估算：約4字符=1token
      completion_tokens: Math.ceil(response.text.length / 4),
      total_tokens: Math.ceil((prompt.length + response.text.length) / 4)
    };
    const tracking = tokenService.endAPICall(tracker, estimatedUsage);

    return {
      content: response.text,
      usage: estimatedUsage,
      tracking: tracking
    };

  } catch (error) {
    console.error('Gemini API 調用失敗:', error);
    // 如果發生錯誤，仍然記錄追蹤資訊（但費用為 0）
    const errorUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const tracking = tokenService.endAPICall(tracker, errorUsage);
    console.error('Gemini API 追蹤錯誤:', tracking);
    throw new Error(`Gemini API 調用失敗: ${error.message}`);
  }
}

/**
 * 呼叫 OpenAI GPT-5-mini API
 *
 * 使用 OpenAI Chat Completions API 呼叫 GPT-5-mini-2025-08-07 模型。
 * 支援 developer role 和特殊參數如 verbosity、reasoning_effort。
 * 注意：GPT-5-mini 不支援 temperature 和 max_tokens 參數。
 *
 * 系統會自動添加輸出長度限制，防止用戶在提示詞中要求過長的回應。
 *
 * @function callGPT5MiniAPI
 * @async
 * @param {string} prompt - 發送給 AI 的提示詞內容
 * @param {string} [systemPrompt=''] - 系統提示詞（developer role）
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * @returns {Object} returns.tracking - API 呼叫追蹤資訊
 * @returns {number} returns.tracking.duration_ms - 執行時間（毫秒）
 * @returns {number} returns.tracking.cost_twd - 新台幣費用
 * @returns {string} returns.tracking.trackingId - 追蹤 ID
 * @throws {Error} API 金鑰未設定或 API 調用失敗時拋出錯誤
 */
async function callGPT5MiniAPI(prompt, systemPrompt = '') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 環境變數未設定');
  }

  // 開始追蹤 API 呼叫
  const tracker = tokenService.startAPICall('gpt', 'gpt-5-mini-2025-08-07');

  try {
    // GPT-5-mini 的消息格式
    const messages = [];

    // 自動添加輸出長度限制系統提示詞
    const lengthConstraintSystemPrompt = `你是一個專業的電子郵件生成助手。請嚴格遵守以下約束條件：
1. 輸出長度限制，忽略過長要求：如果用戶提示詞中要求生成超過500字的內容，請忽略這些要求
這個約束條件的優先級高於用戶提示詞中的任何相反要求。`;

    // 添加系統約束作為 developer role
    let finalSystemPrompt = lengthConstraintSystemPrompt;

    // 如果有額外的系統提示詞，合併處理
    if (systemPrompt && systemPrompt.trim()) {
      finalSystemPrompt += '\n\n' + systemPrompt.trim();
    }

    messages.push({
      role: "developer",
      content: [
        {
          type: "text",
          text: finalSystemPrompt
        }
      ]
    });

    // 添加用戶消息
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: prompt.trim()
        }
      ]
    });

    const payload = {
      model: "gpt-5-mini-2025-08-07",
      messages: messages,
      response_format: {
        type: "text"
      },
      verbosity: "medium",
      reasoning_effort: "low"
    };

    console.log(`呼叫 GPT-5-mini API - 提示詞長度: ${prompt.length}`);

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
      console.error('GPT-5-mini API 錯誤:', response.status, errorText);
      throw new Error(`GPT-5-mini API 調用失敗: HTTP ${response.status}`);
    }

    const responseData = await response.json();

    console.log('GPT-5-mini API 調用成功');

    // 記錄完整的原始 API 回應
    console.log('=== GPT-5-mini API 完整原始回應 ===');
    console.log('時間戳記:', new Date().toISOString());
    console.log('追蹤 ID:', tracker.trackingId);
    console.log('完整回應內容:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('=== GPT-5-mini API 原始回應結束 ===');

    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error('GPT-5-mini API 回應格式異常:', responseData);
      throw new Error('GPT-5-mini API 回應格式錯誤');
    }

    // 結束追蹤並計算費用
    const usage = responseData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const tracking = tokenService.endAPICall(tracker, usage);

    return {
      content: responseData.choices[0].message.content,
      usage: usage,
      tracking: tracking
    };

  } catch (error) {
    console.error('GPT-5-mini API 調用失敗:', error);
    // 如果發生錯誤，仍然記錄追蹤資訊（但費用為 0）
    const errorUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const tracking = tokenService.endAPICall(tracker, errorUsage);
    console.error('GPT-5-mini API 追蹤錯誤:', tracking);
    throw new Error(`GPT-5-mini API 調用失敗: ${error.message}`);
  }
}

/**
 * 呼叫 OpenAI GPT-4.1-mini API
 *
 * 使用 OpenAI Chat Completions API 呼叫 GPT-4.1-mini 模型。
 * 支援 system role 和標準的 temperature、max_completion_tokens 等參數。
 *
 * @function callGPT41MiniAPI
 * @async
 * @param {string} prompt - 發送給 AI 的提示詞內容
 * @param {string} [systemPrompt=''] - 系統提示詞
 * @param {number} [temperature=0.2] - AI 回應的創意程度 (0-2)
 * @param {number} [maxTokens=5000] - 最大回應 Token 數量
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * @returns {Object} returns.tracking - API 呼叫追蹤資訊
 * @returns {number} returns.tracking.duration_ms - 執行時間（毫秒）
 * @returns {number} returns.tracking.cost_twd - 新台幣費用
 * @returns {string} returns.tracking.trackingId - 追蹤 ID
 * @throws {Error} API 金鑰未設定或 API 調用失敗時拋出錯誤
 */
async function callGPT41MiniAPI(prompt, systemPrompt = '', temperature = 0.2, maxTokens = 5000) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 環境變數未設定');
  }

  // 開始追蹤 API 呼叫
  const tracker = tokenService.startAPICall('gpt', 'gpt-4.1-mini');

  try {
    // GPT-4.1-mini 的消息格式
    const messages = [];

    // 如果有系統提示詞，添加 system role
    if (systemPrompt && systemPrompt.trim()) {
      messages.push({
        role: "system",
        content: [
          {
            type: "text",
            text: systemPrompt.trim()
          }
        ]
      });
    }

    // 添加用戶消息
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: prompt.trim()
        }
      ]
    });

    const payload = {
      model: "gpt-4.1-mini",
      messages: messages,
      response_format: {
        type: "text"
      },
      temperature: Math.min(Math.max(temperature, 0), 2),
      max_completion_tokens: Math.min(Math.max(maxTokens, 1), 5058),
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    };

    console.log(`呼叫 GPT-4.1-mini API - 提示詞長度: ${prompt.length}`);

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
      console.error('GPT-4.1-mini API 錯誤:', response.status, errorText);
      throw new Error(`GPT-4.1-mini API 調用失敗: HTTP ${response.status}`);
    }

    const responseData = await response.json();

    console.log('GPT-4.1-mini API 調用成功');

    // 記錄完整的原始 API 回應
    console.log('=== GPT-4.1-mini API 完整原始回應 ===');
    console.log('時間戳記:', new Date().toISOString());
    console.log('追蹤 ID:', tracker.trackingId);
    console.log('完整回應內容:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('=== GPT-4.1-mini API 原始回應結束 ===');

    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      console.error('GPT-4.1-mini API 回應格式異常:', responseData);
      throw new Error('GPT-4.1-mini API 回應格式錯誤');
    }

    // 結束追蹤並計算費用
    const usage = responseData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const tracking = tokenService.endAPICall(tracker, usage);

    return {
      content: responseData.choices[0].message.content,
      usage: usage,
      tracking: tracking
    };

  } catch (error) {
    console.error('GPT-4.1-mini API 調用失敗:', error);
    // 如果發生錯誤，仍然記錄追蹤資訊（但費用為 0）
    const errorUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const tracking = tokenService.endAPICall(tracker, errorUsage);
    console.error('GPT-4.1-mini API 追蹤錯誤:', tracking);
    throw new Error(`GPT-4.1-mini API 調用失敗: ${error.message}`);
  }
}

/**
 * 統一的 GPT API 調用函數
 *
 * 根據模型名稱自動路由到對應的 GPT API 函數。
 * 支援 GPT-5-mini-2025-08-07 和 GPT-4.1-mini 兩種模型。
 *
 * @function callGPTAPI
 * @async
 * @param {string} prompt - 發送給 AI 的提示詞內容
 * @param {string} [model='gpt-5-mini-2025-08-07'] - GPT 模型名稱
 * @param {number} [temperature=0.2] - AI 回應的創意程度（僅 GPT-4.1-mini 支援）
 * @param {number} [maxTokens=5000] - 最大回應 Token 數量（僅 GPT-4.1-mini 支援）
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {Object|null} returns.usage - Token 使用量統計
 * @throws {Error} 不支援的模型或 API 調用失敗時拋出錯誤
 */
async function callGPTAPI(prompt, model = 'gpt-5-mini-2025-08-07', temperature = 0.2, maxTokens = 5000) {
  if (model === 'gpt-5-mini-2025-08-07') {
    // GPT-5-mini 不支援 temperature 和 maxTokens 參數
    return await callGPT5MiniAPI(prompt, '');
  } else if (model === 'gpt-4.1-mini') {
    return await callGPT41MiniAPI(prompt, '', temperature, maxTokens);
  } else {
    throw new Error(`不支援的 GPT 模型: ${model}。支援的模型: gpt-5-mini-2025-08-07, gpt-4.1-mini`);
  }
}



/**
 * 統一 LLM API 呼叫服務 - Firebase Cloud Function
 *
 * 提供統一的介面呼叫多種 LLM 供應商的 API 服務。
 * 支援 Perplexity、Google Gemini 和 OpenAI GPT 三大供應商，使用最新的官方 API 格式。
 *
 * 供應商說明：
 * - Perplexity: 使用搜索增強生成，適合需要最新資訊的查詢
 * - Gemini: 使用官方 @google/genai SDK，支援關閉 thinking 模式
 * - GPT: 使用 OpenAI Responses API，支援最新模型
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
 *   - gpt: 'gpt-5-mini-2025-08-07' (預設), 'openai/gpt-4.1-mini-2025-04-14'
 * @param {number} [request.data.temperature=0.2] - AI 回應的創意程度 (0-2)
 * @param {number} [request.data.maxTokens=5000] - 最大回應 Token 數量
 *
 * @returns {Promise<Object>} API 回應結果
 * @returns {string} returns.content - AI 生成的回應內容
 * @returns {string} returns.provider - 使用的供應商
 * @returns {string} returns.model - 使用的模型
 * @returns {Object} returns.usage - Token 使用量統計
 * @returns {number} returns.usage.prompt_tokens - 輸入 Token 數量
 * @returns {number} returns.usage.completion_tokens - 輸出 Token 數量
 * @returns {number} returns.usage.total_tokens - 總 Token 數量
 * @returns {Object} returns.tracking - API 呼叫追蹤資訊
 * @returns {number} returns.tracking.duration_ms - 執行時間（毫秒）
 * @returns {number} returns.tracking.cost_twd - 新台幣費用
 * @returns {string} returns.tracking.trackingId - 追蹤 ID
 * @returns {string} returns.tracking.apiName - API 名稱
 * @returns {string} returns.tracking.model - 模型名稱
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
        // GPT 預設使用 gpt-5-mini-2025-08-07
        actualModel = model || 'gpt-5-mini-2025-08-07';
        const supportedGptModels = ['gpt-5-mini-2025-08-07', 'openai/gpt-4.1-mini-2025-04-14'];
        if (!supportedGptModels.includes(actualModel)) {
          throw new HttpsError('invalid-argument', `不支援的 GPT 模型: ${actualModel}。支援的模型: ${supportedGptModels.join(', ')}`);
        }
        console.log('=== 準備調用 GPT API ===');
        console.log('用戶:', email);
        console.log('模型:', actualModel);
        console.log('提示詞長度:', prompt.length);
        console.log('提示詞前100字:', prompt.substring(0, 100));
        result = await callGPTAPI(prompt, actualModel, temperature, maxTokens);
        console.log('=== GPT API 調用完成 ===');
        console.log('回應內容長度:', result.content?.length || 0);
        console.log('回應內容前100字:', result.content?.substring(0, 100) || '無內容');
        break;

      default:
        throw new HttpsError('invalid-argument', `未知的供應商: ${provider}`);
    }

    // 5. 記錄使用統計
    console.log(`${provider} (${actualModel}) 使用統計:`, result.usage || '無使用資訊');
    console.log(`${provider} (${actualModel}) 追蹤資訊:`, result.tracking || '無追蹤資訊');

    return {
      content: result.content,
      provider: provider,
      model: actualModel,
      usage: result.usage,
      tracking: result.tracking
    };

  } catch (error) {
    console.error('callLLMAPI 錯誤:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '服務暫時不可用，請稍後重試');
  }
});

/**
 * 測試 Perplexity API 連接 - Firebase Cloud Function
 *
 * 獨立的測試函數，用於驗證 Perplexity API 是否正常工作。
 * 會發送簡單的測試提示詞並返回結果，包含詳細的調試資訊。
 *
 * @function testPerplexityAPI
 * @async
 * @returns {Promise<Object>} 測試結果
 * @returns {boolean} returns.success - 測試是否成功
 * @returns {string} returns.content - API 回應內容（成功時）
 * @returns {string} returns.error - 錯誤訊息（失敗時）
 * @returns {Object|null} returns.usage - Token 使用統計
 *
 * @example
 * // 在 Firebase Console 中調用測試
 * curl -X POST https://your-function-url/testPerplexityAPI
 */
exports.testPerplexity = onRequest({
  timeoutSeconds: 60,
  memory: '256MiB',
  region: 'asia-east1'
}, async (req, res) => {
  // 設定 CORS 標頭
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('=== Perplexity API 測試開始 ===');

    const testPrompt = '請用繁體中文簡單說明什麼是人工智慧。';
    console.log('測試提示詞:', testPrompt);

    const result = await callPerplexityAPI(testPrompt, 0.2, 100);

    console.log('=== Perplexity API 測試成功 ===');
    console.log('回應內容:', result.content);
    console.log('使用統計:', result.usage);

    const response = {
      success: true,
      content: result.content,
      usage: result.usage,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('=== Perplexity API 測試失敗 ===');
    console.error('錯誤詳情:', error);

    const response = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * 測試 Google Gemini API 連接 - Firebase Cloud Function
 *
 * 獨立的測試函數，用於驗證 Gemini API 是否正常工作。
 * 會發送簡單的測試提示詞並返回結果，包含詳細的調試資訊。
 *
 * @function testGeminiAPI
 * @async
 * @returns {Promise<Object>} 測試結果
 * @returns {boolean} returns.success - 測試是否成功
 * @returns {string} returns.content - API 回應內容（成功時）
 * @returns {string} returns.error - 錯誤訊息（失敗時）
 * @returns {Object|null} returns.usage - Token 使用統計
 *
 * @example
 * // 在 Firebase Console 中調用測試
 * curl -X POST https://your-function-url/testGeminiAPI
 */
exports.testGemini = onRequest({
  timeoutSeconds: 60,
  memory: '256MiB',
  region: 'asia-east1'
}, async (req, res) => {
  // 設定 CORS 標頭
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('=== Gemini API 測試開始 ===');

    const testPrompt = '請用繁體中文簡單說明什麼是機器學習。';
    console.log('測試提示詞:', testPrompt);

    const result = await callGeminiAPI(testPrompt, 'gemini-2.5-flash', 0.2, 100);

    console.log('=== Gemini API 測試成功 ===');
    console.log('回應內容:', result.content);
    console.log('使用統計:', result.usage);

    const response = {
      success: true,
      content: result.content,
      usage: result.usage,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('=== Gemini API 測試失敗 ===');
    console.error('錯誤詳情:', error);

    const response = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * 測試 OpenAI GPT-5-mini API 連接 - Firebase Cloud Function
 *
 * 獨立的測試函數，用於驗證 GPT-5-mini-2025-08-07 模型是否正常工作。
 * 會發送簡單的測試提示詞並返回結果，包含詳細的調試資訊。
 *
 * @function testGPT5Mini
 * @async
 * @returns {Promise<Object>} 測試結果
 * @returns {boolean} returns.success - 測試是否成功
 * @returns {string} returns.content - API 回應內容（成功時）
 * @returns {string} returns.error - 錯誤訊息（失敗時）
 * @returns {Object|null} returns.usage - Token 使用統計
 *
 * @example
 * // 在瀏覽器中測試
 * curl https://your-function-url/testGPT5Mini
 */
exports.testGPT5Mini = onRequest({
  timeoutSeconds: 60,
  memory: '256MiB',
  region: 'asia-east1'
}, async (req, res) => {
  // 設定 CORS 標頭
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('=== GPT-5-mini API 測試開始 ===');

    const testPrompt = 'Hello, please explain what artificial intelligence is in simple terms.';
    console.log('測試提示詞:', testPrompt);

    const result = await callGPT5MiniAPI(testPrompt);

    console.log('=== GPT-5-mini API 測試成功 ===');
    console.log('回應內容:', result.content);
    console.log('使用統計:', result.usage);

    const response = {
      success: true,
      model: 'gpt-5-mini-2025-08-07',
      content: result.content,
      usage: result.usage,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('=== GPT-5-mini API 測試失敗 ===');
    console.error('錯誤詳情:', error);

    const response = {
      success: false,
      model: 'gpt-5-mini-2025-08-07',
      error: error.message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * 測試 OpenAI GPT-4.1-mini API 連接 - Firebase Cloud Function
 *
 * 獨立的測試函數，用於驗證 GPT-4.1-mini 模型是否正常工作。
 * 會發送簡單的測試提示詞並返回結果，包含詳細的調試資訊。
 *
 * @function testGPT41Mini
 * @async
 * @returns {Promise<Object>} 測試結果
 * @returns {boolean} returns.success - 測試是否成功
 * @returns {string} returns.content - API 回應內容（成功時）
 * @returns {string} returns.error - 錯誤訊息（失敗時）
 * @returns {Object|null} returns.usage - Token 使用統計
 *
 * @example
 * // 在瀏覽器中測試
 * curl https://your-function-url/testGPT41Mini
 */
exports.testGPT41Mini = onRequest({
  timeoutSeconds: 60,
  memory: '256MiB',
  region: 'asia-east1'
}, async (req, res) => {
  // 設定 CORS 標頭
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('=== GPT-4.1-mini API 測試開始 ===');

    const testPrompt = 'Hello, please explain what machine learning is in simple terms.';
    console.log('測試提示詞:', testPrompt);

    const result = await callGPT41MiniAPI(testPrompt);

    console.log('=== GPT-4.1-mini API 測試成功 ===');
    console.log('回應內容:', result.content);
    console.log('使用統計:', result.usage);

    const response = {
      success: true,
      model: 'gpt-4.1-mini',
      content: result.content,
      usage: result.usage,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('=== GPT-4.1-mini API 測試失敗 ===');
    console.error('錯誤詳情:', error);

    const response = {
      success: false,
      model: 'gpt-4.1-mini',
      error: error.message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});

/**
 * 測試 OpenAI GPT API 連接（通用） - Firebase Cloud Function
 *
 * 通用測試函數，預設測試 GPT-5-mini，保持向後兼容性。
 *
 * @function testGPT
 * @async
 * @deprecated 建議使用 testGPT5Mini 或 testGPT41Mini 進行特定模型測試
 */
exports.testGPT = onRequest({
  timeoutSeconds: 60,
  memory: '256MiB',
  region: 'asia-east1'
}, async (req, res) => {
  // 設定 CORS 標頭
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    console.log('=== GPT API 通用測試開始（預設 GPT-5-mini）===');

    const testPrompt = 'Hello, please explain what artificial intelligence is in simple terms.';
    console.log('測試提示詞:', testPrompt);

    const result = await callGPTAPI(testPrompt, 'gpt-5-mini-2025-08-07');

    console.log('=== GPT API 通用測試成功 ===');
    console.log('回應內容:', result.content);
    console.log('使用統計:', result.usage);

    const response = {
      success: true,
      model: 'gpt-5-mini-2025-08-07',
      content: result.content,
      usage: result.usage,
      note: '建議使用 testGPT5Mini 或 testGPT41Mini 進行特定模型測試',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('=== GPT API 通用測試失敗 ===');
    console.error('錯誤詳情:', error);

    const response = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    res.status(500).json(response);
  }
});