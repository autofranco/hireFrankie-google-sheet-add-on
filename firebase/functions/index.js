/**
 * HireFrankie Firebase Cloud Functions
 * 
 * 提供 AI 驅動的潛在客戶開發和電子郵件生成服務。
 * 包含用戶管理、Perplexity API 集成和付費狀態驗證。
 * 
 * @fileoverview Firebase Cloud Functions for HireFrankie Auto Lead Warmer
 * @version 1.0.0
 * @author HireFrankie Team
 */

const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const {setGlobalOptions} = require('firebase-functions/v2');
const admin = require('firebase-admin');

// 初始化 Firebase Admin SDK
admin.initializeApp();

// 設定全域選項 - 使用亞洲東部區域（較接近台灣）
setGlobalOptions({
  region: 'asia-east1'
});

// 匯入服務模組
const {callLLMAPI, testPerplexity, testGemini, testGPT, testGPT5Mini, testGPT41Mini} = require('./src/llm-service');
const {createUser, updateUserUsage, getUserInfo} = require('./src/user-service');
const {
  calculateTokenCost,
  logTokenUsage,
  resetTokenStats,
  getTokenSummary
} = require('./src/token-service');

/**
 * === Unified LLM API Functions ===
 *
 * 提供統一的多供應商 LLM API 服務
 * 支援 Perplexity、Gemini 和 GPT 等多種 AI 模型
 * 用於生成 Lead Profile、Mail Angle 和 First Mail 內容
 */

/**
 * 統一 LLM API 呼叫服務
 * @see ./src/llm-service.js#callLLMAPI
 */
exports.callLLMAPI = callLLMAPI;

/**
 * 測試 Perplexity API 連接
 * @see ./src/llm-service.js#testPerplexity
 */
exports.testPerplexity = testPerplexity;

/**
 * 測試 Gemini API 連接
 * @see ./src/llm-service.js#testGemini
 */
exports.testGemini = testGemini;

/**
 * 測試 OpenAI GPT API 連接（通用）
 * @see ./src/llm-service.js#testGPT
 * @deprecated 建議使用 testGPT5Mini 或 testGPT41Mini 進行特定模型測試
 */
exports.testGPT = testGPT;

/**
 * 測試 OpenAI GPT-5-mini API 連接
 * @see ./src/llm-service.js#testGPT5Mini
 */
exports.testGPT5Mini = testGPT5Mini;

/**
 * 測試 OpenAI GPT-4.1-mini API 連接
 * @see ./src/llm-service.js#testGPT41Mini
 */
exports.testGPT41Mini = testGPT41Mini;

/**
 * === User Management Functions ===
 * 
 * 處理用戶註冊、認證、付費狀態和使用量統計
 */

/**
 * 創建或更新用戶資料
 * @see ./src/user-service.js#createUser
 */
exports.createUser = createUser;

/**
 * 更新用戶 Token 使用量
 * @see ./src/user-service.js#updateUserUsage
 */
exports.updateUserUsage = updateUserUsage;

/**
 * 獲取用戶資訊和使用統計
 * @see ./src/user-service.js#getUserInfo
 */
exports.getUserInfo = getUserInfo;

/**
 * === Token Usage and Cost Calculation Functions ===
 *
 * 提供 AI API token 使用量追蹤和成本計算服務
 * 支援 Sonar 和 Sonar Pro 模型的成本分析
 */

/**
 * 計算 AI API 使用成本
 * @see ./src/token-service.js#calculateTokenCost
 */
exports.calculateTokenCost = calculateTokenCost;

/**
 * 記錄 token 使用量
 * @see ./src/token-service.js#logTokenUsage
 */
exports.logTokenUsage = logTokenUsage;

/**
 * 重置 token 統計
 * @see ./src/token-service.js#resetTokenStats
 */
exports.resetTokenStats = resetTokenStats;

/**
 * 獲取 token 使用統計總結
 * @see ./src/token-service.js#getTokenSummary
 */
exports.getTokenSummary = getTokenSummary;

/**
 * === User Management via Google Sheets ===
 * 
 * 用戶管理現在透過開發方的 Google Sheets 直接管理
 * 管理員可以直接在 Google Sheets 中編輯用戶的付費狀態
 * 格式：Email | Payment Status | Added Date | Updated By
 */

/**
 * === System Health Check Function ===
 * 
 * 系統健康狀態檢查端點，用於監控服務可用性
 * 
 * @function healthCheck
 * @async
 * @param {Object} req - Express 請求物件
 * @param {Object} res - Express 回應物件
 * 
 * @returns {Object} 健康狀態資訊
 * @returns {string} returns.status - 服務狀態 ('ok')
 * @returns {string} returns.timestamp - 當前 ISO 時間戳
 * @returns {string} returns.version - 服務版本號
 * @returns {string} returns.project - Firebase 專案 ID
 * @returns {string} returns.region - 部署區域
 * 
 * @example
 * // HTTP GET 請求
 * curl https://asia-east1-auto-lead-warmer-mvp.cloudfunctions.net/healthCheck
 * 
 * // 回應範例
 * {
 *   "status": "ok",
 *   "timestamp": "2024-09-14T07:15:30.123Z",
 *   "version": "1.0.0",
 *   "project": "auto-lead-warmer-mvp",
 *   "region": "asia-east1"
 * }
 */
exports.healthCheck = onRequest(async (req, res) => {
  try {
    // 設定 CORS 標頭
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 處理 preflight 請求
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // 回傳健康狀態資訊
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      project: 'auto-lead-warmer-mvp',
      region: 'asia-east1',
      services: {
        perplexityAPI: 'active',
        userManagement: 'active',
        googleSheets: 'active'
      }
    });
  } catch (error) {
    console.error('Health check 錯誤:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});