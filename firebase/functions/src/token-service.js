/**
 * Token Usage and Cost Calculation Service
 *
 * 提供 AI API token 使用量追蹤和成本計算功能。
 * 支援 Perplexity Sonar 和 Sonar Pro 模型的成本計算。
 *
 * @fileoverview Token tracking and cost calculation service for AI API usage
 * @version 1.0.0
 * @author HireFrankie Team
 */

const admin = require('firebase-admin');

/**
 * Token 計算服務類別
 *
 * 提供 AI API token 使用量的追蹤、統計和成本計算功能。
 * 支援多種 AI 模型的價格計算和使用量記錄。
 */
class TokenService {
  constructor() {
    /**
     * AI 模型價格配置（美金/百萬 tokens）
     * @type {Object}
     */
    this.pricing = {
      sonar: {
        input: 0.2,
        output: 0.2
      },
      sonarPro: {
        input: 1.0,
        output: 1.0
      }
    };

    /**
     * 台幣匯率（美金對台幣）
     * @type {number}
     */
    this.exchangeRate = 31.5;

    /**
     * 步驟統計資料
     * @type {Object}
     */
    this.stepStats = {
      seminarBrief: {
        startTime: null,
        time: 0,
        cost: 0
      },
      leadProcessing: {
        startTime: null,
        time: 0,
        cost: 0
      },
      mailGeneration: {
        startTime: null,
        time: 0,
        cost: 0
      }
    };
  }

  /**
   * 計算成本（通用函數）
   *
   * 根據輸入輸出 token 數量和模型類型計算台幣成本。
   * 支援 Sonar 和 Sonar Pro 兩種模型的價格計算。
   *
   * @param {number} inputTokens - 輸入 token 數量
   * @param {number} outputTokens - 輸出 token 數量
   * @param {string} [model='sonar-pro'] - 模型類型 ('sonar' 或 'sonar-pro')
   * @returns {number} 計算出的台幣成本
   *
   * @example
   * const cost = tokenService.calculateStepCost(1000, 500, 'sonar-pro');
   * console.log(`成本: NT$${cost.toFixed(2)}`);
   */
  calculateStepCost(inputTokens, outputTokens, model = 'sonar-pro') {
    const modelKey = model === 'sonar-pro' ? 'sonarPro' : 'sonar';
    const inputCost = (inputTokens / 1000000) * this.pricing[modelKey].input * this.exchangeRate;
    const outputCost = (outputTokens / 1000000) * this.pricing[modelKey].output * this.exchangeRate;
    return inputCost + outputCost;
  }

  /**
   * 開始 Seminar Brief 統計
   *
   * 初始化研習活動簡介生成的統計追蹤。
   * 記錄開始時間用於計算處理時長。
   *
   * @returns {void}
   *
   * @example
   * tokenService.startSeminarBrief();
   * // ... 執行 AI API 調用
   * tokenService.endSeminarBrief(inputTokens, outputTokens, 'sonar-pro');
   */
  startSeminarBrief() {
    this.stepStats.seminarBrief.startTime = Date.now();
  }

  /**
   * 結束 Seminar Brief 統計
   *
   * 記錄研習活動簡介生成的 token 使用量和成本。
   * 計算處理時長和總成本。
   *
   * @param {number} inputTokens - 輸入 token 數量
   * @param {number} outputTokens - 輸出 token 數量
   * @param {string} [model='sonar-pro'] - 使用的模型類型
   * @returns {void}
   *
   * @example
   * tokenService.endSeminarBrief(2000, 800, 'sonar-pro');
   */
  endSeminarBrief(inputTokens, outputTokens, model = 'sonar-pro') {
    const endTime = Date.now();
    const duration = (endTime - this.stepStats.seminarBrief.startTime) / 1000;

    this.stepStats.seminarBrief.time = duration;
    this.stepStats.seminarBrief.cost = this.calculateStepCost(inputTokens, outputTokens, model);
  }

  /**
   * 開始處理 Lead 統計
   *
   * 初始化特定潛在客戶的處理統計追蹤。
   * 用於追蹤 Lead Profile 和 Mail Angles 生成的成本。
   *
   * @returns {void}
   *
   * @example
   * tokenService.startLeadProcessing();
   * // ... 執行 Lead Profile 和 Mail Angles 生成
   * tokenService.endLeadProcessing(totalInputTokens, totalOutputTokens);
   */
  startLeadProcessing() {
    this.stepStats.leadProcessing.startTime = Date.now();
  }

  /**
   * 結束處理 Lead 統計
   *
   * 記錄潛在客戶處理的 token 使用量和成本。
   * 包含 Lead Profile 和 Mail Angles 生成的總成本。
   *
   * @param {number} inputTokens - 輸入 token 數量
   * @param {number} outputTokens - 輸出 token 數量
   * @param {string} [model='sonar'] - 使用的模型類型
   * @returns {void}
   *
   * @example
   * tokenService.endLeadProcessing(1500, 600, 'sonar');
   */
  endLeadProcessing(inputTokens, outputTokens, model = 'sonar') {
    const endTime = Date.now();
    const duration = (endTime - this.stepStats.leadProcessing.startTime) / 1000;

    this.stepStats.leadProcessing.time = duration;
    this.stepStats.leadProcessing.cost = this.calculateStepCost(inputTokens, outputTokens, model);
  }

  /**
   * 記錄 token 使用量
   *
   * 通用的 token 使用量記錄函數。
   * 可用於記錄任何 AI API 調用的 token 使用量。
   *
   * @param {string} model - 使用的模型 ('sonar' 或 'sonar-pro')
   * @param {number} inputTokens - 輸入 token 數量
   * @param {number} outputTokens - 輸出 token 數量
   * @returns {Object} 包含成本計算結果的物件
   *
   * @example
   * const result = tokenService.logTokenUsage('sonar-pro', 1000, 500);
   * console.log(`成本: NT$${result.cost.toFixed(2)}`);
   */
  logTokenUsage(model, inputTokens, outputTokens) {
    const cost = this.calculateStepCost(inputTokens, outputTokens, model);

    console.log(`記錄 ${model} 使用: input=${inputTokens}, output=${outputTokens} tokens`);
    console.log(`成本: NT$${cost.toFixed(2)}`);

    return {
      model,
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重置 token 統計
   *
   * 清除所有統計資料，重新開始計算。
   * 用於新的處理週期或重置統計資料。
   *
   * @returns {void}
   *
   * @example
   * tokenService.resetTokenStats();
   * console.log('統計資料已重置');
   */
  resetTokenStats() {
    this.stepStats = {
      seminarBrief: {
        startTime: null,
        time: 0,
        cost: 0
      },
      leadProcessing: {
        startTime: null,
        time: 0,
        cost: 0
      },
      mailGeneration: {
        startTime: null,
        time: 0,
        cost: 0
      }
    };

    console.log('Token 統計已重置');
  }

  /**
   * 顯示 token 使用統計總結
   *
   * 輸出詳細的 token 使用量和成本統計報告。
   * 包含各個步驟的時間、成本和總計資訊。
   *
   * @returns {Object} 統計總結物件
   *
   * @example
   * const summary = tokenService.showTokenSummary();
   * console.log('總成本:', summary.totalCost);
   */
  showTokenSummary() {
    const totalCost = this.stepStats.seminarBrief.cost +
                      this.stepStats.leadProcessing.cost +
                      this.stepStats.mailGeneration.cost;

    const totalTime = this.stepStats.seminarBrief.time +
                      this.stepStats.leadProcessing.time +
                      this.stepStats.mailGeneration.time;

    const summary = {
      seminarBrief: this.stepStats.seminarBrief,
      leadProcessing: this.stepStats.leadProcessing,
      mailGeneration: this.stepStats.mailGeneration,
      totalCost,
      totalTime,
      timestamp: new Date().toISOString()
    };

    console.log('\n=== Token 使用統計總結 ===');
    console.log(`研習活動簡介: NT$${this.stepStats.seminarBrief.cost.toFixed(2)} (${this.stepStats.seminarBrief.time.toFixed(1)}s)`);
    console.log(`潛客處理: NT$${this.stepStats.leadProcessing.cost.toFixed(2)} (${this.stepStats.leadProcessing.time.toFixed(1)}s)`);
    console.log(`郵件生成: NT$${this.stepStats.mailGeneration.cost.toFixed(2)} (${this.stepStats.mailGeneration.time.toFixed(1)}s)`);
    console.log(`總計: NT$${totalCost.toFixed(2)} (${totalTime.toFixed(1)}s)`);
    console.log('========================\n');

    return summary;
  }

  /**
   * 儲存統計資料到 Firestore
   *
   * 將 token 使用統計資料儲存到 Firestore 資料庫。
   * 用於長期追蹤和分析 API 使用情況。
   *
   * @param {string} userId - 使用者 ID
   * @param {string} sessionId - 會話 ID
   * @returns {Promise<string>} 文件 ID
   *
   * @example
   * const docId = await tokenService.saveStatsToFirestore('user123', 'session456');
   * console.log('統計資料已儲存，文件 ID:', docId);
   */
  async saveStatsToFirestore(userId, sessionId) {
    const summary = this.showTokenSummary();

    const statsData = {
      ...summary,
      userId,
      sessionId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await admin.firestore()
      .collection('tokenUsage')
      .add(statsData);

    console.log(`統計資料已儲存到 Firestore，文件 ID: ${docRef.id}`);
    return docRef.id;
  }
}

// 建立單例實例
const tokenService = new TokenService();

// Firebase Functions 導入
const {onCall, HttpsError} = require('firebase-functions/v2/https');

/**
 * === Firebase Cloud Functions ===
 *
 * 以下是暴露給客戶端的 Cloud Functions
 */

/**
 * 計算 AI API 使用成本 - Cloud Function
 *
 * 根據輸入輸出 token 數量和模型類型計算台幣成本。
 * 支援 Perplexity Sonar 和 Sonar Pro 兩種模型。
 *
 * @function calculateTokenCost
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.data - 請求資料
 * @param {number} request.data.inputTokens - 輸入 token 數量
 * @param {number} request.data.outputTokens - 輸出 token 數量
 * @param {string} [request.data.model='sonar-pro'] - AI 模型類型
 * @returns {Promise<Object>} 成本計算結果
 *
 * @example
 * // 在 Apps Script 中呼叫
 * const result = await UrlFetchApp.fetch(cloudFunctionUrl, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   payload: JSON.stringify({
 *     data: {
 *       inputTokens: 1000,
 *       outputTokens: 500,
 *       model: 'sonar-pro'
 *     }
 *   })
 * });
 */
const calculateTokenCost = onCall({
  region: 'asia-east1'
}, async (request) => {
  try {
    const { inputTokens, outputTokens, model = 'sonar-pro' } = request.data;

    if (!inputTokens || !outputTokens) {
      throw new HttpsError('invalid-argument', '必須提供 inputTokens 和 outputTokens');
    }

    const cost = tokenService.calculateStepCost(inputTokens, outputTokens, model);

    return {
      success: true,
      cost,
      inputTokens,
      outputTokens,
      model,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('計算 token 成本失敗:', error);
    throw new HttpsError('internal', '系統處理失敗，請稍後重試');
  }
});

/**
 * 記錄 token 使用量 - Cloud Function
 *
 * 記錄 AI API 的 token 使用量並計算成本。
 * 可選擇性儲存到 Firestore 進行長期追蹤。
 *
 * @function logTokenUsage
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.data - 請求資料
 * @param {string} request.data.model - AI 模型類型
 * @param {number} request.data.inputTokens - 輸入 token 數量
 * @param {number} request.data.outputTokens - 輸出 token 數量
 * @param {string} [request.data.userId] - 使用者 ID（用於儲存記錄）
 * @param {string} [request.data.sessionId] - 會話 ID（用於儲存記錄）
 * @param {boolean} [request.data.saveToFirestore=false] - 是否儲存到 Firestore
 * @returns {Promise<Object>} 使用量記錄結果
 *
 * @example
 * // 在 Apps Script 中呼叫
 * const result = await UrlFetchApp.fetch(cloudFunctionUrl, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   payload: JSON.stringify({
 *     data: {
 *       model: 'sonar-pro',
 *       inputTokens: 2000,
 *       outputTokens: 800,
 *       userId: 'user123',
 *       sessionId: 'session456',
 *       saveToFirestore: true
 *     }
 *   })
 * });
 */
const logTokenUsage = onCall({
  region: 'asia-east1'
}, async (request) => {
  try {
    const {
      model,
      inputTokens,
      outputTokens,
      userId,
      sessionId,
      saveToFirestore = false
    } = request.data;

    if (!model || !inputTokens || !outputTokens) {
      throw new HttpsError('invalid-argument', '必須提供 model、inputTokens 和 outputTokens');
    }

    const usageRecord = tokenService.logTokenUsage(model, inputTokens, outputTokens);

    let firestoreDocId = null;
    if (saveToFirestore && userId && sessionId) {
      // 儲存到 Firestore
      const docRef = await admin.firestore()
        .collection('tokenUsage')
        .add({
          ...usageRecord,
          userId,
          sessionId,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      firestoreDocId = docRef.id;
    }

    return {
      success: true,
      usage: usageRecord,
      firestoreDocId,
      saved: saveToFirestore && !!firestoreDocId
    };
  } catch (error) {
    console.error('記錄 token 使用量失敗:', error);
    throw new HttpsError('internal', '系統處理失敗，請稍後重試');
  }
});

/**
 * 重置 token 統計 - Cloud Function
 *
 * 清除所有 token 使用統計資料，重新開始計算。
 * 用於新的處理週期或重置統計資料。
 *
 * @function resetTokenStats
 * @param {Object} request - Firebase Functions 請求物件
 * @returns {Promise<Object>} 重置結果
 *
 * @example
 * // 在 Apps Script 中呼叫
 * const result = await UrlFetchApp.fetch(cloudFunctionUrl, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   payload: JSON.stringify({ data: {} })
 * });
 */
const resetTokenStats = onCall({
  region: 'asia-east1'
}, async (request) => {
  try {
    tokenService.resetTokenStats();

    return {
      success: true,
      message: 'Token 統計已重置',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('重置 token 統計失敗:', error);
    throw new HttpsError('internal', '系統處理失敗，請稍後重試');
  }
});

/**
 * 獲取 token 使用統計總結 - Cloud Function
 *
 * 取得詳細的 token 使用量和成本統計報告。
 * 包含各個步驟的時間、成本和總計資訊。
 *
 * @function getTokenSummary
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.data - 請求資料
 * @param {string} [request.data.userId] - 使用者 ID（用於儲存統計）
 * @param {string} [request.data.sessionId] - 會話 ID（用於儲存統計）
 * @param {boolean} [request.data.saveToFirestore=false] - 是否儲存統計到 Firestore
 * @returns {Promise<Object>} 統計總結
 *
 * @example
 * // 在 Apps Script 中呼叫
 * const result = await UrlFetchApp.fetch(cloudFunctionUrl, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   payload: JSON.stringify({
 *     data: {
 *       userId: 'user123',
 *       sessionId: 'session456',
 *       saveToFirestore: true
 *     }
 *   })
 * });
 */
const getTokenSummary = onCall({
  region: 'asia-east1'
}, async (request) => {
  try {
    const { userId, sessionId, saveToFirestore = false } = request.data || {};

    const summary = tokenService.showTokenSummary();

    let firestoreDocId = null;
    if (saveToFirestore && userId && sessionId) {
      firestoreDocId = await tokenService.saveStatsToFirestore(userId, sessionId);
    }

    return {
      success: true,
      data: summary,
      firestoreDocId,
      saved: saveToFirestore && !!firestoreDocId
    };
  } catch (error) {
    console.error('獲取 token 統計總結失敗:', error);
    throw new HttpsError('internal', '系統處理失敗，請稍後重試');
  }
});

module.exports = {
  TokenService,
  tokenService,
  // Cloud Functions
  calculateTokenCost,
  logTokenUsage,
  resetTokenStats,
  getTokenSummary
};