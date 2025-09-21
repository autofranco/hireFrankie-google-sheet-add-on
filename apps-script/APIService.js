/**
 * API 服务 - 處理所有外部 API 调用
 * 已遷移至 Firebase Cloud Functions 架構
 */

// Firebase 配置
const FIREBASE_CONFIG = {
  projectId: 'auto-lead-warmer-mvp',
  region: 'asia-east1',
  functionsUrl: 'https://asia-east1-auto-lead-warmer-mvp.cloudfunctions.net'
};

// Token 計算已移到 Firebase Cloud Functions

const APIService = {

  /**
   * 呼叫統一 LLM API (透過 Firebase Cloud Functions)
   *
   * @function callLLMAPI
   * @param {string} prompt - API 請求的提示詞內容
   * @param {string} [provider='perplexity'] - LLM 供應商 ('perplexity' | 'gemini' | 'gpt')
   * @param {string} [model] - AI 模型名稱，依供應商而定
   * @param {number} [temperature=0.2] - AI 回應的創意程度
   * @param {number} [maxTokens=1000] - 最大回應 Token 數量
   * @returns {Object} AI 回應結果，包含 content、provider、model、usage 等資訊
   */
  callLLMAPI(prompt, provider = 'perplexity', model = null, temperature = 0.2, maxTokens = 1000) {
    // 检查 prompt 是否为空或无效
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('提示詞不能為空');
    }

    try {
      console.log('呼叫 Firebase Cloud Function: callLLMAPI');
      console.log('供應商:', provider);
      console.log('模型:', model || '預設');
      console.log('提示詞:', prompt.substring(0, 100) + '...');

      // 獲取用戶的 Auth Token (需要用戶先登入)
      const user = Session.getActiveUser();
      if (!user.getEmail()) {
        throw new Error('請先登入 Google 帳號才能使用 AI 服務');
      }

      // 調用 Firebase Cloud Function
      const payload = {
        email: user.getEmail(),
        prompt: prompt.trim(),
        provider: provider,
        model: model,
        temperature: temperature,
        maxTokens: maxTokens
      };

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          data: payload
        }),
        muteHttpExceptions: true
      };

      const functionUrl = `${FIREBASE_CONFIG.functionsUrl}/callLLMAPI`;
      const response = UrlFetchApp.fetch(functionUrl, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      console.log('Firebase Function 回應狀態:', responseCode);
      console.log('Firebase Function 完整回應內容:', responseText);

      if (responseCode !== 200) {
        let errorMessage = `HTTP ${responseCode}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          errorMessage = responseText;
        }
        // 在 console.log 顯示完整錯誤供開發者調試
        console.error('Firebase Function 回應格式異常:', responseCode);
        console.error('Firebase Function 回應內容:', responseText);

        // 對用戶顯示友善的錯誤訊息
        throw new Error('AI 服務暫時不可用，請稍後重試');
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error('AI 服務回應格式異常，請稍後重試');
      }

      if (!responseData.result || !responseData.result.content) {
        // 在 console.log 顯示完整錯誤供開發者調試
        console.error('Firebase Function 回應格式異常:', responseCode);
        console.error('Firebase Function 回應內容:', responseText);

        // 對用戶顯示友善的錯誤訊息
        throw new Error('AI 服務暫時不可用，請稍後重試');
      }

      // 記錄詳細的使用統計和追蹤資訊
      const result = responseData.result;

      // 顯示詳細的 API 調用統計
      if (result.usage && result.tracking) {
        console.log(`\n=== ${result.provider}/${result.model} API 調用統計 ===`);
        console.log(`Input tokens: ${result.usage.prompt_tokens?.toLocaleString() || 0}`);
        console.log(`Output tokens: ${result.usage.completion_tokens?.toLocaleString() || 0}`);
        console.log(`Total tokens: ${result.usage.total_tokens?.toLocaleString() || 0}`);
        console.log(`Cost: NT$${result.tracking.cost_twd?.toFixed(4) || 0}`);
        console.log(`Duration: ${(result.tracking.duration_ms / 1000)?.toFixed(2) || 0}秒`);
        console.log(`Tracking ID: ${result.tracking.trackingId || 'N/A'}`);
        console.log('================================\n');
      } else {
        console.log(`${result.provider} (${result.model}) 基本統計:`,
          `content=${result.content?.length || 0} chars`);
      }

      return result;

    } catch (error) {
      console.error('callLLMAPI 錯誤:', error);
      const errorMessage = error.message || error.toString() || '未知錯誤';
      throw new Error(`AI 服務調用失敗: ${errorMessage}`);
    }
  },


  /**
   * 創建或初始化用戶（透過 Firebase Cloud Functions）
   * 
   * @function createUser
   * @param {Object} userData - 用戶數據
   * @param {string} [userData.displayName] - 用戶顯示名稱
   * @returns {Object} 用戶創建結果
   */
  createUser(userData = {}) {
    try {
      console.log('呼叫 Firebase Cloud Function: createUser');

      // 獲取當前用戶
      const user = Session.getActiveUser();
      const userEmail = user.getEmail();

      if (!userEmail || userEmail.trim() === '') {
        throw new Error('請先登入 Google 帳號才能初始化用戶資料');
      }

      console.log('當前用戶:', userEmail);

      // 調用 Firebase Cloud Function
      const payload = {
        email: userEmail,
        ...userData
      };

      console.log('準備發送的 payload:', JSON.stringify(payload));

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          data: payload
        }),
        muteHttpExceptions: true
      };

      console.log('完整請求結構:', JSON.stringify({ data: payload }));

      const functionUrl = `${FIREBASE_CONFIG.functionsUrl}/createUser`;
      const response = UrlFetchApp.fetch(functionUrl, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      console.log('Firebase Function 回應狀態:', responseCode);
      console.log('Firebase Function 回應內容:', responseText);

      if (responseCode !== 200) {
        let errorMessage = `HTTP ${responseCode}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          errorMessage = responseText;
        }
        // 在 console.log 顯示完整錯誤供開發者調試
        console.error('Firebase Function 回應格式異常:', responseCode);
        console.error('Firebase Function 回應內容:', responseText);

        // 對用戶顯示友善的錯誤訊息
        throw new Error('AI 服務暫時不可用，請稍後重試');
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error('AI 服務回應格式異常，請稍後重試');
      }

      if (!responseData.result) {
        // 在 console.log 顯示完整錯誤供開發者調試
        console.error('Firebase Function 回應格式異常:', responseCode);
        console.error('Firebase Function 回應內容:', responseText);

        // 對用戶顯示友善的錯誤訊息
        throw new Error('AI 服務暫時不可用，請稍後重試');
      }

      console.log('用戶創建成功:', responseData.result);
      return responseData.result;

    } catch (error) {
      console.error('createUser 錯誤:', error);
      throw new Error(`用戶初始化失敗: ${error.message}`);
    }
  },

  /**
   * 檢查用戶付費狀態
   * 使用 Firebase Cloud Functions 檢查用戶是否有付費權限
   *
   * @function checkUserPaymentStatus
   * @returns {boolean} 用戶是否已付費
   * @throws {Error} 檢查失敗時拋出錯誤
   */
  checkUserPaymentStatus() {
    try {
      console.log('檢查用戶付費狀態...');

      // 獲取當前用戶
      const user = Session.getActiveUser();
      const userEmail = user.getEmail();

      if (!userEmail || userEmail.trim() === '') {
        throw new Error('無法取得用戶 Email，請確保已登入 Google 帳號');
      }

      console.log('檢查用戶:', userEmail);

      // 調用 Firebase Cloud Function 檢查付費狀態
      const payload = {
        email: userEmail
      };

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify({
          data: payload
        }),
        muteHttpExceptions: true
      };

      const functionUrl = `${FIREBASE_CONFIG.functionsUrl}/getUserInfo`;
      const response = UrlFetchApp.fetch(functionUrl, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      console.log('付費狀態檢查回應狀態:', responseCode);

      if (responseCode !== 200) {
        let errorMessage = `HTTP ${responseCode}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          errorMessage = responseText;
        }
        throw new Error(`付費狀態檢查失敗: ${errorMessage}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error('付費狀態回應格式錯誤: ' + responseText);
      }

      if (!responseData.result) {
        throw new Error('付費狀態回應格式異常: ' + responseText);
      }

      const paymentStatus = responseData.result.paymentStatus;
      const isPaid = paymentStatus === 'paid';

      console.log(`用戶 ${userEmail} 付費狀態: ${paymentStatus}`);

      if (!isPaid) {
        throw new Error(`用戶尚未付費，無法使用 AI 服務。請聯繫管理員開通付費權限。`);
      }

      return true;

    } catch (error) {
      console.error('檢查付費狀態錯誤:', error);
      throw error;
    }
  },

  /**
   * 批次呼叫多個 LLM API (透過 Firebase Cloud Functions)
   * 使用 UrlFetchApp.fetchAll() 實現真正的並行處理
   *
   * @function callLLMAPIBatch
   * @param {Array} requests - API 請求陣列，每個元素包含 prompt, provider, model 等參數
   * @returns {Array} API 回應結果陣列
   */
  callLLMAPIBatch(requests) {
    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      throw new Error('批次請求陣列不能為空');
    }

    try {
      console.log(`開始批次呼叫 ${requests.length} 個 LLM API...`);

      // 獲取用戶的 Auth Token
      const user = Session.getActiveUser();
      if (!user.getEmail()) {
        throw new Error('請先登入 Google 帳號才能使用 AI 服務');
      }

      const userEmail = user.getEmail();

      // 準備所有 HTTP 請求
      const httpRequests = requests.map((request, index) => {
        // 檢查單個請求的有效性
        if (!request.prompt || typeof request.prompt !== 'string' || request.prompt.trim().length === 0) {
          throw new Error(`第 ${index + 1} 個請求的提示詞不能為空`);
        }

        const payload = {
          email: userEmail,
          prompt: request.prompt.trim(),
          provider: request.provider || 'perplexity',
          model: request.model || null,
          temperature: request.temperature || 0.2,
          maxTokens: request.maxTokens || 1000
        };

        return {
          url: `${FIREBASE_CONFIG.functionsUrl}/callLLMAPI`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            data: payload
          }),
          muteHttpExceptions: true
        };
      });

      console.log(`準備同時發送 ${httpRequests.length} 個 HTTP 請求...`);

      // 使用 fetchAll 同時發送所有請求 - 這是真正的並行！
      const startTime = new Date().getTime();
      const responses = UrlFetchApp.fetchAll(httpRequests);
      const endTime = new Date().getTime();

      console.log(`批次 API 調用完成，耗時 ${(endTime - startTime) / 1000} 秒`);

      // 處理所有回應
      const results = responses.map((response, index) => {
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();

        console.log(`API ${index + 1} 回應狀態: ${responseCode}`);

        if (responseCode !== 200) {
          let errorMessage = `HTTP ${responseCode}`;
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error?.message || errorMessage;
          } catch (e) {
            errorMessage = responseText;
          }

          console.error(`API ${index + 1} 失敗:`, errorMessage);
          return {
            success: false,
            error: errorMessage,
            index: index
          };
        }

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error(`API ${index + 1} 回應格式錯誤:`, responseText);
          return {
            success: false,
            error: 'AI 服務回應格式異常',
            index: index
          };
        }

        if (!responseData.result || !responseData.result.content) {
          console.error(`API ${index + 1} 回應內容異常:`, responseText);
          return {
            success: false,
            error: 'AI 服務暫時不可用',
            index: index
          };
        }

        const result = responseData.result;

        // 記錄統計資訊
        if (result.usage && result.tracking) {
          console.log(`API ${index + 1} - ${result.provider}/${result.model}:`);
          console.log(`  Input: ${result.usage.prompt_tokens || 0}, Output: ${result.usage.completion_tokens || 0}`);
          console.log(`  Cost: NT$${result.tracking.cost_twd?.toFixed(4) || 0}, Duration: ${(result.tracking.duration_ms / 1000)?.toFixed(2) || 0}秒`);
        }

        return {
          success: true,
          result: result,
          index: index
        };
      });

      // 統計成功和失敗數量
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      console.log(`批次處理完成: 成功 ${successCount}，失敗 ${errorCount}`);

      return results;

    } catch (error) {
      console.error('callLLMAPIBatch 錯誤:', error);
      const errorMessage = error.message || error.toString() || '未知錯誤';
      throw new Error(`批次 AI 服務調用失敗: ${errorMessage}`);
    }
  }
};

