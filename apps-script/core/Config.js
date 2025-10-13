/**
 * 配置文件 - 存放所有配置项和常量
 */

// Perplexity API 已遷移至 Firebase Cloud Functions
// API Key 現在安全地存放在 Firebase Functions 環境變數中
// const PERPLEXITY_API_KEY = 'MOVED_TO_FIREBASE_FUNCTIONS';
// const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// Sheet 栏位对应
const COLUMNS = {
  EMAIL: 0,         // A: Email Address*
  FIRST_NAME: 1,    // B: First Name*
  COMPANY_URL: 2,   // C: Company url*
  DEPARTMENT: 3,    // D: Department*
  POSITION: 4,      // E: Position*
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
  INFO: 17,         // R: info 詳細訊息 (原 Processed)
  BOUNCE_STATUS: 18 // S: 退信狀態 (bounce tracking)
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
  CONTACT: { row: 6, col: 2, label: 'Contact' },
  SEMINAR_INFO: { row: 7, col: 2, label: 'Seminar Info' },
  SEMINAR_BRIEF: { row: 8, col: 2, label: 'Seminar Brief' },
  EMAIL1_PROMPT: { row: 9, col: 2, label: 'Email 1 Prompt' },
  EMAIL2_PROMPT: { row: 10, col: 2, label: 'Email 2 Prompt' },
  EMAIL3_PROMPT: { row: 11, col: 2, label: 'Email 3 Prompt' }
};

// 郵件發送時間間隔配置
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

// 字符限制常量
const CHARACTER_LIMITS = {
  // 用戶資訊欄位限制
  SEMINAR_INFO: 5000,
  SEMINAR_BRIEF: 1000,
  EMAIL1_PROMPT: 1000,
  EMAIL2_PROMPT: 1000,
  EMAIL3_PROMPT: 1000,

  // 主要工作表欄位限制
  FIRST_NAME: 50,
  DEPARTMENT: 50,
  POSITION: 50,
  COMPANY_URL: 500
};