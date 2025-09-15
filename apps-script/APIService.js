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

// Token 使用量追蹤器
const TokenTracker = {
  // 統計資料
  stats: {
    sonar: { inputTokens: 0, outputTokens: 0 },
    sonarPro: { inputTokens: 0, outputTokens: 0 }
  },
  
  // 詳細步驟統計
  stepStats: {
    seminarBrief: { cost: 0, time: 0, startTime: null },
    leads: [] // 每筆 lead 的詳細統計
  },
  
  // 總執行時間
  totalStartTime: null,
  
  // 價格 (美金/百萬tokens)
  pricing: {
    sonar: { input: 1, output: 1 },
    sonarPro: { input: 3, output: 15 }
  },
  
  // 匯率
  exchangeRate: 30, // 1美金 = 30台幣
  
  /**
   * 重置統計
   */
  reset() {
    this.stats.sonar = { inputTokens: 0, outputTokens: 0 };
    this.stats.sonarPro = { inputTokens: 0, outputTokens: 0 };
    this.stepStats.seminarBrief = { cost: 0, time: 0, startTime: null };
    this.stepStats.leads = [];
    this.totalStartTime = Date.now();
  },

  /**
   * 計算成本 (通用函數)
   * 根據輸入輸出 token 數量和模型類型計算台幣成本
   * 
   * @function calculateStepCost
   * @param {number} inputTokens - 輸入 token 數量
   * @param {number} outputTokens - 輸出 token 數量  
   * @param {string} model - 模型類型 ('sonar' 或 'sonar-pro')
   * @returns {number} 計算出的台幣成本
   */
  calculateStepCost(inputTokens, outputTokens, model = 'sonar-pro') {
    const modelKey = model === 'sonar-pro' ? 'sonarPro' : 'sonar';
    const inputCost = (inputTokens / 1000000) * this.pricing[modelKey].input * this.exchangeRate;
    const outputCost = (outputTokens / 1000000) * this.pricing[modelKey].output * this.exchangeRate;
    return inputCost + outputCost;
  },

  /**
   * 開始 Seminar Brief 統計
   * 初始化研習活動簡介生成的統計追蹤
   * 
   * @function startSeminarBrief
   * @returns {void}
   */
  startSeminarBrief() {
    this.stepStats.seminarBrief.startTime = Date.now();
  },

  /**
   * 結束 Seminar Brief 統計
   * 記錄研習活動簡介生成的 token 使用量和成本
   * 
   * @function endSeminarBrief
   * @param {number} inputTokens - 輸入 token 數量
   * @param {number} outputTokens - 輸出 token 數量
   * @param {string} model - 使用的模型類型
   * @returns {void}
   */
  endSeminarBrief(inputTokens, outputTokens, model = 'sonar-pro') {
    const endTime = Date.now();
    const duration = (endTime - this.stepStats.seminarBrief.startTime) / 1000;
    
    this.stepStats.seminarBrief.time = duration;
    this.stepStats.seminarBrief.cost = this.calculateStepCost(inputTokens, outputTokens, model);
  },

  /**
   * 開始處理 Lead 統計
   * 初始化特定潛在客戶的處理統計追蹤
   * 
   * @function startLead
   * @param {number} leadIndex - 潛在客戶的行索引
   * @returns {void}
   */
  startLead(leadIndex) {
    const leadStat = {
      index: leadIndex,
      leadProfile: { cost: 0, time: 0, startTime: null },
      mailAngle: { cost: 0, time: 0, startTime: null },
      firstMail: { cost: 0, time: 0, startTime: null }
    };
    this.stepStats.leads.push(leadStat);
    return leadStat;
  },

  /**
   * 開始步驟統計
   * 開始追蹤特定 Lead 的特定處理步驟時間
   * 
   * @function startStep
   * @param {number} leadIndex - 潛在客戶的行索引
   * @param {string} stepName - 步驟名稱 ('leadProfile', 'mailAngle', 'firstMail')
   * @returns {void}
   */
  startStep(leadIndex, stepName) {
    const lead = this.stepStats.leads.find(l => l.index === leadIndex);
    if (lead && lead[stepName]) {
      lead[stepName].startTime = Date.now();
    }
  },

  /**
   * 結束步驟統計
   * 記錄特定 Lead 特定步驟的時間和成本統計
   * 
   * @function endStep
   * @param {number} leadIndex - 潛在客戶的行索引
   * @param {string} stepName - 步驟名稱
   * @param {number} inputTokens - 輸入 token 數量
   * @param {number} outputTokens - 輸出 token 數量
   * @param {string} model - 使用的模型類型
   * @returns {void}
   */
  endStep(leadIndex, stepName, inputTokens, outputTokens, model = 'sonar-pro') {
    const lead = this.stepStats.leads.find(l => l.index === leadIndex);
    if (!lead || !lead[stepName]) return;

    const endTime = Date.now();
    const duration = (endTime - lead[stepName].startTime) / 1000;
    
    lead[stepName].time = duration;
    lead[stepName].cost = this.calculateStepCost(inputTokens, outputTokens, model);
  },
  
  /**
   * 記錄 token 使用量
   */
  recordUsage(model, inputTokens, outputTokens) {
    if (model === 'sonar') {
      this.stats.sonar.inputTokens += inputTokens;
      this.stats.sonar.outputTokens += outputTokens;
    } else if (model === 'sonar-pro') {
      this.stats.sonarPro.inputTokens += inputTokens;
      this.stats.sonarPro.outputTokens += outputTokens;
    }
    
    console.log(`記錄 ${model} 使用: input=${inputTokens}, output=${outputTokens} tokens`);
  },
  
  /**
   * 計算成本 (台幣)
   */
  calculateCosts() {
    const sonarInputCost = (this.stats.sonar.inputTokens / 1000000) * this.pricing.sonar.input * this.exchangeRate;
    const sonarOutputCost = (this.stats.sonar.outputTokens / 1000000) * this.pricing.sonar.output * this.exchangeRate;
    const sonarTotalCost = sonarInputCost + sonarOutputCost;
    
    const sonarProInputCost = (this.stats.sonarPro.inputTokens / 1000000) * this.pricing.sonarPro.input * this.exchangeRate;
    const sonarProOutputCost = (this.stats.sonarPro.outputTokens / 1000000) * this.pricing.sonarPro.output * this.exchangeRate;
    const sonarProTotalCost = sonarProInputCost + sonarProOutputCost;
    
    return {
      sonar: {
        inputTokens: this.stats.sonar.inputTokens,
        outputTokens: this.stats.sonar.outputTokens,
        inputCost: sonarInputCost,
        outputCost: sonarOutputCost,
        totalCost: sonarTotalCost
      },
      sonarPro: {
        inputTokens: this.stats.sonarPro.inputTokens,
        outputTokens: this.stats.sonarPro.outputTokens,
        inputCost: sonarProInputCost,
        outputCost: sonarProOutputCost,
        totalCost: sonarProTotalCost
      },
      grandTotal: sonarTotalCost + sonarProTotalCost
    };
  },
  
  /**
   * 顯示詳細統計總結
   */
  showSummary() {
    const costs = this.calculateCosts();
    const totalTime = this.totalStartTime ? (Date.now() - this.totalStartTime) / 1000 : 0;
    
    console.log('\n=== 📊 詳細執行統計 ===');
    
    // Seminar Brief 統計
    if (this.stepStats.seminarBrief.cost > 0) {
      console.log(`🎯 Seminar Brief 生成: NT$${this.stepStats.seminarBrief.cost.toFixed(2)} (${this.stepStats.seminarBrief.time.toFixed(1)}秒)`);
      console.log('');
    }
    
    // Lead 處理統計
    if (this.stepStats.leads.length > 0) {
      console.log(`📋 處理 ${this.stepStats.leads.length} 筆 Lead:`);
      this.stepStats.leads.forEach(lead => {
        const leadProfileText = lead.leadProfile.cost > 0 ? `Lead Profile NT$${lead.leadProfile.cost.toFixed(2)} (${lead.leadProfile.time.toFixed(1)}秒)` : '';
        const mailAngleText = lead.mailAngle.cost > 0 ? `Mail Angle NT$${lead.mailAngle.cost.toFixed(2)} (${lead.mailAngle.time.toFixed(1)}秒)` : '';
        const firstMailText = lead.firstMail.cost > 0 ? `1st Mail NT$${lead.firstMail.cost.toFixed(2)} (${lead.firstMail.time.toFixed(1)}秒)` : '';
        
        const parts = [leadProfileText, mailAngleText, firstMailText].filter(p => p);
        if (parts.length > 0) {
          console.log(`Lead ${lead.index}: ${parts.join(', ')}`);
        }
      });
      console.log('');
    }
    
    // 總結統計
    console.log('💰 總結:');
    if (this.stepStats.leads.length > 0) {
      console.log(`- 處理 Lead 數量: ${this.stepStats.leads.length}筆`);
      // 修正：平均成本應該是總成本除以 lead 數量（包含分攤的 seminar brief 成本）
      const avgCost = costs.grandTotal / this.stepStats.leads.length;
      const avgTime = totalTime / this.stepStats.leads.length;
      console.log(`- 平均每筆 Lead: NT$${avgCost.toFixed(2)} (${avgTime.toFixed(1)}秒)`);
    }
    console.log(`- 總執行時間: ${totalTime.toFixed(1)}秒`);
    console.log(`- 總成本: NT$${costs.grandTotal.toFixed(2)}`);
    
    // 原有的模型統計（簡化版）
    if (costs.sonar.inputTokens > 0 || costs.sonar.outputTokens > 0 || 
        costs.sonarPro.inputTokens > 0 || costs.sonarPro.outputTokens > 0) {
      console.log('');
      console.log('📊 模型使用統計:');
      if (costs.sonar.totalCost > 0) {
        console.log(`- Sonar: ${costs.sonar.inputTokens + costs.sonar.outputTokens} tokens, NT$${costs.sonar.totalCost.toFixed(2)}`);
      }
      if (costs.sonarPro.totalCost > 0) {
        console.log(`- Sonar Pro: ${costs.sonarPro.inputTokens + costs.sonarPro.outputTokens} tokens, NT$${costs.sonarPro.totalCost.toFixed(2)}`);
      }
    }
    
    console.log('=====================================\n');
    
    return costs;
  }
};

const APIService = {
  

  /**
   * 呼叫 Perplexity API (透過 Firebase Cloud Functions)
   * 
   * @function callPerplexityAPI
   * @param {string} prompt - API 請求的提示詞內容
   * @param {number} [temperature=0.2] - AI 回應的創意程度
   * @param {number} [maxTokens=1000] - 最大回應 Token 數量
   * @returns {string} AI 生成的回應內容
   */
  callPerplexityAPI(prompt, temperature = 0.2, maxTokens = 1000) {
    // 检查 prompt 是否为空或无效
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('提示詞不能為空');
    }

    try {
      console.log('呼叫 Firebase Cloud Function: callPerplexityAPI');
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

      // 追蹤 token 使用量
      if (responseData.result.usage) {
        const inputTokens = responseData.result.usage.prompt_tokens || 0;
        const outputTokens = responseData.result.usage.completion_tokens || 0;
        TokenTracker.recordUsage('sonar', inputTokens, outputTokens);
        
        // 檢查是否有進行中的 lead 步驟統計 (sonar 主要用於 mailAngle 和 firstMail)
        for (const lead of TokenTracker.stepStats.leads) {
          if (lead.mailAngle.startTime && !lead.mailAngle.time) {
            TokenTracker.endStep(lead.index, 'mailAngle', inputTokens, outputTokens, 'sonar');
            break;
          } else if (lead.firstMail.startTime && !lead.firstMail.time) {
            TokenTracker.endStep(lead.index, 'firstMail', inputTokens, outputTokens, 'sonar');
            break;
          }
        }
      }

      return responseData.result.content;

    } catch (error) {
      console.error('callPerplexityAPI 錯誤:', error);
      throw new Error(`AI 服務調用失敗: ${error.message}`);
    }
  },

  /**
   * 呼叫 Perplexity API (Sonar Pro 模型，透過 Firebase Cloud Functions)
   * 使用最佳設定避免幻覺並控制成本，主要用於 Lead Profile 生成
   * 
   * @function callPerplexityAPIWithSonarPro
   * @param {string} prompt - API 請求的提示詞內容
   * @param {number} [temperature=0.0] - AI 回應的創意程度 (Pro 模型建議使用較低值)
   * @param {number} [maxTokens=500] - 最大回應 Token 數量
   * @returns {string} AI 生成的回應內容
   */
  callPerplexityAPIWithSonarPro(prompt, temperature = 0.0, maxTokens = 500) {
    // 检查 prompt 是否为空或无效
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('提示詞不能為空');
    }

    try {
      console.log('呼叫 Firebase Cloud Function: callPerplexityAPIPro');
      console.log('提示詞:', prompt.substring(0, 100) + '...');
      
      // 獲取用戶的 Auth Token (需要用戶先登入)
      const user = Session.getActiveUser();
      if (!user.getEmail()) {
        throw new Error('請先登入 Google 帳號才能使用 AI Pro 服務');
      }

      // 調用 Firebase Cloud Function
      const payload = {
        email: user.getEmail(),
        prompt: prompt.trim(),
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

      const functionUrl = `${FIREBASE_CONFIG.functionsUrl}/callPerplexityAPIPro`;
      const response = UrlFetchApp.fetch(functionUrl, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      console.log('Firebase Function Pro 回應狀態:', responseCode);
      console.log('Firebase Function Pro 回應內容:', responseText.substring(0, 200) + '...');

      if (responseCode !== 200) {
        let errorMessage = `HTTP ${responseCode}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          errorMessage = responseText;
        }
        throw new Error(`Firebase Function Pro 錯誤: ${errorMessage}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Firebase Function Pro 回應格式錯誤: ' + responseText);
      }

      if (!responseData.result || !responseData.result.content) {
        throw new Error('Firebase Function Pro 回應格式異常: ' + responseText);
      }

      // 追蹤 token 使用量
      if (responseData.result.usage) {
        const inputTokens = responseData.result.usage.prompt_tokens || 0;
        const outputTokens = responseData.result.usage.completion_tokens || 0;
        TokenTracker.recordUsage('sonar-pro', inputTokens, outputTokens);
        
        // 檢查是否有進行中的 seminar brief 統計
        if (TokenTracker.stepStats.seminarBrief.startTime) {
          TokenTracker.endSeminarBrief(inputTokens, outputTokens, 'sonar-pro');
        }
        
        // 檢查是否有進行中的 lead 步驟統計
        for (const lead of TokenTracker.stepStats.leads) {
          if (lead.leadProfile.startTime && !lead.leadProfile.time) {
            TokenTracker.endStep(lead.index, 'leadProfile', inputTokens, outputTokens, 'sonar-pro');
            break;
          } else if (lead.mailAngle.startTime && !lead.mailAngle.time) {
            TokenTracker.endStep(lead.index, 'mailAngle', inputTokens, outputTokens, 'sonar-pro');
            break;
          } else if (lead.firstMail.startTime && !lead.firstMail.time) {
            TokenTracker.endStep(lead.index, 'firstMail', inputTokens, outputTokens, 'sonar-pro');
            break;
          }
        }
      }

      return responseData.result.content;

    } catch (error) {
      console.error('callPerplexityAPIWithSonarPro 錯誤:', error);
      throw new Error(`AI Pro 服務調用失敗: ${error.message}`);
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
  }
};

// 全局函数包装器（为了向后兼容）

/**
 * 呼叫 Perplexity API (Sonar 模型) - 全域函數包裝器
 * 
 * @function callPerplexityAPI
 * @param {string} prompt - API 請求的提示詞
 * @returns {string} API 回應內容
 */
function callPerplexityAPI(prompt) {
  return APIService.callPerplexityAPI(prompt);
}

/**
 * 呼叫 Perplexity API (Sonar Pro 模型) - 全域函數包裝器
 * 
 * @function callPerplexityAPIWithSonarPro
 * @param {string} prompt - API 請求的提示詞
 * @returns {string} API 回應內容
 */
function callPerplexityAPIWithSonarPro(prompt) {
  return APIService.callPerplexityAPIWithSonarPro(prompt);
}

// TokenTracker 全域函數包裝器
/**
 * 重置 token 統計 - 全域函數包裝器
 * 
 * @function resetTokenStats
 * @returns {void}
 */
function resetTokenStats() {
  return TokenTracker.reset();
}

/**
 * 顯示 token 使用統計總結 - 全域函數包裝器
 * 
 * @function showTokenSummary
 * @returns {void}
 */
function showTokenSummary() {
  return TokenTracker.showSummary();
}

/**
 * 創建用戶 - 全域函數包裝器
 * 
 * @function createUser
 * @param {Object} userData - 用戶數據
 * @returns {Object} 用戶創建結果
 */
function createUser(userData) {
  return APIService.createUser(userData);
}