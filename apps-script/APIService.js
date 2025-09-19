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
   * 呼叫 Perplexity API (透過 Firebase Cloud Functions)
   *
   * @function callPerplexityAPI
   * @param {string} prompt - API 請求的提示詞內容
   * @param {string} [model='sonar-pro'] - AI 模型類型 ('sonar' 或 'sonar-pro')
   * @param {number} [temperature=0.2] - AI 回應的創意程度
   * @param {number} [maxTokens=1000] - 最大回應 Token 數量
   * @returns {string} AI 生成的回應內容
   */
  callPerplexityAPI(prompt, model = 'sonar-pro', temperature = 0.2, maxTokens = 1000) {
    // 检查 prompt 是否为空或无效
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('提示詞不能為空');
    }

    try {
      console.log('呼叫 Firebase Cloud Function: callPerplexityAPI');
      console.log('模型:', model);
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

      const functionUrl = `${FIREBASE_CONFIG.functionsUrl}/callPerplexityAPI`;
      const response = UrlFetchApp.fetch(functionUrl, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      console.log('Firebase Function 回應狀態:', responseCode);
      console.log('Firebase Function 回應內容:', responseText.substring(0, 200) + '...');

      if (responseCode !== 200) {
        let errorMessage = `HTTP ${responseCode}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          errorMessage = responseText;
        }
        throw new Error(`Firebase Function 錯誤: ${errorMessage}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Firebase Function 回應格式錯誤: ' + responseText);
      }

      if (!responseData.result || !responseData.result.content) {
        throw new Error('Firebase Function 回應格式異常: ' + responseText);
      }

      // Token 追蹤已移到 Firebase Cloud Functions 自動處理

      return responseData.result.content;

    } catch (error) {
      console.error('callPerplexityAPI 錯誤:', error);
      throw new Error(`AI 服務調用失敗: ${error.message}`);
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
        throw new Error(`Firebase Function 錯誤: ${errorMessage}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Firebase Function 回應格式錯誤: ' + responseText);
      }

      if (!responseData.result) {
        throw new Error('Firebase Function 回應格式異常: ' + responseText);
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
  }
};

