/**
 * 配置文件 - 存放所有配置项和常量
 */

// Perplexity API 设定
const PERPLEXITY_API_KEY = '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';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Sheet 栏位对应
const COLUMNS = {
  EMAIL: 0,         // A: Email Address*
  FIRST_NAME: 1,    // B: First Name*
  COMPANY_URL: 2,   // C: Company url*
  POSITION: 3,      // D: Position*
  RESOURCE_URL: 4,  // E: Resource url*
  LEADS_PROFILE: 5, // F: Leads Profile
  MAIL_ANGLE_1: 6,  // G: 1st mail angle
  FOLLOW_UP_1: 7,   // H: 1st follow up mail
  SCHEDULE_1: 8,    // I: 1st mail schedule
  MAIL_ANGLE_2: 9,  // J: 2nd mail angle
  FOLLOW_UP_2: 10,  // K: 2nd follow up mail
  SCHEDULE_2: 11,   // L: 2nd mail schedule
  MAIL_ANGLE_3: 12, // M: 3rd mail angle
  FOLLOW_UP_3: 13,  // N: 3rd follow up mail
  SCHEDULE_3: 14,   // O: 3rd mail schedule
  SEND_NOW: 15,     // P: send now 按鈕
  STATUS: 16,       // Q: status 狀態
  INFO: 17          // R: info 詳細訊息 (原 Processed)
};

// 其他配置常量
const SHEET_NAME = '工作表1';
const USER_INFO_SHEET_NAME = 'User Info';

// 用戶資訊欄位對應
const USER_INFO_FIELDS = {
  GREETING: { row: 2, col: 2, label: 'Email Greeting', default: '順頌商祺' },
  NAME: { row: 3, col: 2, label: 'Name' },
  COMPANY: { row: 4, col: 2, label: 'Company' },
  TITLE: { row: 5, col: 2, label: 'Title' },
  CONTACT: { row: 6, col: 2, label: 'Contact' }
};
const EMAIL_SCHEDULE_INTERVALS = {
  FIRST: 0,   // 這小時（立即）
  SECOND: 60, // 下小時（60分鐘後）
  THIRD: 120  // 後小時（120分鐘後）
};

// 移除測試模式，只使用正式模式
const RUN_MODE = {
  PRODUCTION: 'production' // 正式模式
};

// 固定使用正式模式
const CURRENT_MODE = RUN_MODE.PRODUCTION;