/**
 * API 服务 - 處理所有外部 API 调用
 */

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
    console.log('=== Token 使用量統計已重置 ===');
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
   * 测试基本网络连接
   */
  testNetworkConnection() {
    try {
      console.log('测试基本网络连接...');
      
      const response = UrlFetchApp.fetch('https://www.google.com', {
        method: 'GET',
        muteHttpExceptions: true
      });
      
      console.log('Google 连接测试 - 状态码:', response.getResponseCode());
      
      if (response.getResponseCode() === 200) {
        SpreadsheetApp.getUi().alert('✅ 網路連接正常！\n可以存取外部網站。');
      } else {
        SpreadsheetApp.getUi().alert('❌ 網路連接異常\n狀態碼: ' + response.getResponseCode());
      }
      
    } catch (error) {
      console.error('网络连接测试失败:', error);
      SpreadsheetApp.getUi().alert('❌ 網路連接測試失敗：\n' + error.message);
    }
  },

  /**
   * 测试 API 连接
   */
  testAPIConnection() {
    try {
      const testPrompt = "请用繁体中文回答：什么是人工智慧？请简短回答。";
      console.log('测试提示词:', testPrompt);
      
      const result = this.callPerplexityAPI(testPrompt);
      console.log('API 测试成功:', result);
      
      SpreadsheetApp.getUi().alert('API 連接測試成功！\n\n回應內容：\n' + 
        result.substring(0, 200) + (result.length > 200 ? '...' : ''));
      
    } catch (error) {
      console.error('API 测试失败:', error);
      SpreadsheetApp.getUi().alert('API 連接測試失敗：\n' + error.message);
    }
  },

  /**
   * 呼叫 Perplexity API
   */
  callPerplexityAPI(prompt) {
    // 检查 prompt 是否为空或无效
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('提示詞不能為空');
    }
    
    // 检查 API Key 是否设定
    if (!PERPLEXITY_API_KEY) {
      throw new Error('請先設定 Perplexity API Key');
    }
    
    const payload = {
      model: "sonar",
      messages: [
        {
          role: "user",
          content: prompt.trim()
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    console.log('发送 API 请求:', JSON.stringify(payload, null, 2));
    
    const response = UrlFetchApp.fetch(PERPLEXITY_API_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('API 回应状态:', responseCode);
    console.log('API 回应内容:', responseText);
    
    if (responseCode !== 200) {
      let errorMessage = `HTTP ${responseCode}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        errorMessage = responseText;
      }
      throw new Error(`Perplexity API 錯誤: ${errorMessage}`);
    }
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error('API 回應格式錯誤: ' + responseText);
    }
    
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      throw new Error('API 回應格式異常: ' + responseText);
    }
    
    // 追蹤 token 使用量
    if (responseData.usage) {
      const inputTokens = responseData.usage.prompt_tokens || 0;
      const outputTokens = responseData.usage.completion_tokens || 0;
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
    
    return responseData.choices[0].message.content;
  },

  /**
   * 呼叫 Perplexity API (Sonar Pro 模型，用於 Lead Profile)
   * 使用最佳設定避免幻覺並控制成本
   */
  callPerplexityAPIWithSonarPro(prompt) {
    // 检查 prompt 是否为空或无效
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('提示詞不能為空');
    }
    
    // 检查 API Key 是否设定
    if (!PERPLEXITY_API_KEY) {
      throw new Error('請先設定 Perplexity API Key');
    }
    
    const payload = {
      model: "sonar-pro",
      messages: [
        {
          role: "user",
          content: prompt.trim()
        }
      ],
      temperature: 0.0,
      max_tokens: 500,
      search_context_size: "high"
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    console.log('发送 Sonar Pro API 请求:', JSON.stringify(payload, null, 2));
    
    const response = UrlFetchApp.fetch(PERPLEXITY_API_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('Sonar Pro API 回应状态:', responseCode);
    console.log('Sonar Pro API 回应内容:', responseText);
    
    if (responseCode !== 200) {
      let errorMessage = `HTTP ${responseCode}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        errorMessage = responseText;
      }
      throw new Error(`Perplexity API (Sonar Pro) 錯誤: ${errorMessage}`);
    }
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      throw new Error('API 回應格式錯誤: ' + responseText);
    }
    
    if (!responseData.choices || !responseData.choices[0] || !responseData.choices[0].message) {
      throw new Error('API 回應格式異常: ' + responseText);
    }
    
    // 追蹤 token 使用量
    if (responseData.usage) {
      const inputTokens = responseData.usage.prompt_tokens || 0;
      const outputTokens = responseData.usage.completion_tokens || 0;
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
    
    return responseData.choices[0].message.content;
  }
};

// 全局函数包装器（为了向后兼容）
/**
 * 測試網路連線 - 全域函數包裝器
 * 
 * @function testNetworkConnection
 * @returns {void}
 */
function testNetworkConnection() {
  return APIService.testNetworkConnection();
}

/**
 * 測試 API 連線 - 全域函數包裝器
 * 
 * @function testAPIConnection
 * @returns {void}
 */
function testAPIConnection() {
  return APIService.testAPIConnection();
}

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