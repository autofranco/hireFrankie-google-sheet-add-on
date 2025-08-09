/**
 * 配置文件 - 存放所有配置项和常量
 */

// Perplexity API 设定
const PERPLEXITY_API_KEY = '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';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Sheet 栏位对应
const COLUMNS = {
  EMAIL: 0,        // A: Email Address
  FIRST_NAME: 1,   // B: First Name
  CONTEXT: 2,      // C: Context
  LEADS_PROFILE: 3, // D: Leads Profile
  MAIL_ANGLE_1: 4, // E: 1st mail angle
  FOLLOW_UP_1: 5,  // F: 1st follow up mail
  SCHEDULE_1: 6,   // G: 1st mail schedule
  MAIL_ANGLE_2: 7, // H: 2nd mail angle
  FOLLOW_UP_2: 8,  // I: 2nd follow up mail
  SCHEDULE_2: 9,   // J: 2nd mail schedule
  MAIL_ANGLE_3: 10, // K: 3rd mail angle
  FOLLOW_UP_3: 11,  // L: 3rd follow up mail
  SCHEDULE_3: 12,   // M: 3rd mail schedule
  SEND_NOW: 13,     // N: send now 按鈕
  STATUS: 14,       // O: status 狀態
  INFO: 15          // P: info 詳細訊息 (原 Processed)
};

// 其他配置常量
const SHEET_NAME = '工作表1';
const EMAIL_SCHEDULE_INTERVALS = {
  FIRST: 1,  // 分钟
  SECOND: 2, // 分钟
  THIRD: 3   // 分钟
};

// 運行模式配置
const RUN_MODE = {
  TEST: 'test',     // 測試模式
  PRODUCTION: 'production' // 正式模式
};

// 當前運行模式（可手動切換）
const CURRENT_MODE = RUN_MODE.TEST;