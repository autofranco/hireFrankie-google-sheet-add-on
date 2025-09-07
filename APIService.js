/**
 * API 服务 - 处理所有外部 API 调用
 */

// Token 使用量追蹤器
const TokenTracker = {
  // 統計資料
  stats: {
    sonar: { inputTokens: 0, outputTokens: 0 },
    sonarPro: { inputTokens: 0, outputTokens: 0 }
  },
  
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
    console.log('=== Token 使用量統計已重置 ===');
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
   * 顯示成本總結
   */
  showSummary() {
    const costs = this.calculateCosts();
    
    console.log('\n=== 🤖 API Token 使用量與成本總結 ===');
    
    if (costs.sonar.inputTokens > 0 || costs.sonar.outputTokens > 0) {
      console.log(`📊 Sonar 模型:`);
      console.log(`   Input tokens: ${costs.sonar.inputTokens.toLocaleString()} (NT$${costs.sonar.inputCost.toFixed(2)})`);
      console.log(`   Output tokens: ${costs.sonar.outputTokens.toLocaleString()} (NT$${costs.sonar.outputCost.toFixed(2)})`);
      console.log(`   Sonar 總計: NT$${costs.sonar.totalCost.toFixed(2)}`);
    }
    
    if (costs.sonarPro.inputTokens > 0 || costs.sonarPro.outputTokens > 0) {
      console.log(`📊 Sonar Pro 模型:`);
      console.log(`   Input tokens: ${costs.sonarPro.inputTokens.toLocaleString()} (NT$${costs.sonarPro.inputCost.toFixed(2)})`);
      console.log(`   Output tokens: ${costs.sonarPro.outputTokens.toLocaleString()} (NT$${costs.sonarPro.outputCost.toFixed(2)})`);
      console.log(`   Sonar Pro 總計: NT$${costs.sonarPro.totalCost.toFixed(2)}`);
    }
    
    console.log(`💰 本次執行總成本: NT$${costs.grandTotal.toFixed(2)}`);
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
    }
    
    return responseData.choices[0].message.content;
  }
};

// 全局函数包装器（为了向后兼容）
function testNetworkConnection() {
  return APIService.testNetworkConnection();
}

function testAPIConnection() {
  return APIService.testAPIConnection();
}

function callPerplexityAPI(prompt) {
  return APIService.callPerplexityAPI(prompt);
}

function callPerplexityAPIWithSonarPro(prompt) {
  return APIService.callPerplexityAPIWithSonarPro(prompt);
}

// TokenTracker 全域函數包裝器
function resetTokenStats() {
  return TokenTracker.reset();
}

function showTokenSummary() {
  return TokenTracker.showSummary();
}