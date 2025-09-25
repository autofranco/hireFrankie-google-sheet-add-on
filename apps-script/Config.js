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
  POSITION: 3,      // D: Position*
  LEADS_PROFILE: 4, // E: Leads Profile
  MAIL_ANGLE_1: 5,  // F: 1st mail angle
  FOLLOW_UP_1: 6,   // G: 1st follow up mail
  SCHEDULE_1: 7,    // H: 1st mail schedule
  MAIL_ANGLE_2: 8,  // I: 2nd mail angle
  FOLLOW_UP_2: 9,   // J: 2nd follow up mail
  SCHEDULE_2: 10,   // K: 2nd mail schedule
  MAIL_ANGLE_3: 11, // L: 3rd mail angle
  FOLLOW_UP_3: 12,  // M: 3rd follow up mail
  SCHEDULE_3: 13,   // N: 3rd mail schedule
  SEND_NOW: 14,     // O: send now 按鈕
  STATUS: 15,       // P: status 狀態
  INFO: 16,         // Q: info 詳細訊息 (原 Processed)
  BOUNCE_STATUS: 17 // R: 退信狀態 (bounce tracking)
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
  EMAIL1_PROMPT: { row: 9, col: 2, label: 'Email 1 Prompt', default: `# 任務
請根據以下資訊撰寫一封專業的追蹤信件。請用繁體中文撰寫。

# 背景
- 客戶已參加過我方舉辦的活動，此信是做後續追蹤

# 信件主旨
- 用類似的句型：給 <客戶姓名> 的 <Mail Angle中提及能幫助客戶達到的具體效益> 建議
- 必須15個字以內

# 內容動機
- 開頭先感謝他參與活動，同理他的職位在該公司與該產業會碰到的困難
- 包含明確的行動呼籲，目標是邀約客戶進行線上產品演示說明或是線上諮詢

# 寫作風格：
- 內容採用輕鬆、接近手寫信感的自然語氣，避免過度商業化，讓對方覺得是人與人的溝通
- 長度控制在270~330字，內容要簡潔有力` },
  EMAIL2_PROMPT: { row: 10, col: 2, label: 'Email 2 Prompt', default: `# 任務
請根據以下資訊撰寫第二封追蹤信件。請用繁體中文撰寫。

# 背景
- 客戶已參加過我方舉辦的活動，此信是第二封做後續追蹤的信

# 信件主旨
- 用類似的句型：給 <客戶姓名> 的 <Mail Angle中提及能幫助客戶達到的具體效益> 建議
- 必須15個字以內

# 內容動機
- 開頭說很開心能再聯絡您，同理他的職位在該公司與該產業會碰到的困難
- 包含明確的行動呼籲，目標是邀約客戶進行線上產品演示說明或是線上諮詢

# 寫作風格：
- 內容採用輕鬆、接近手寫信感的自然語氣，避免過度商業化，讓對方覺得是人與人的溝通
- 長度控制在270~330字，內容要簡潔有力` },
  EMAIL3_PROMPT: { row: 11, col: 2, label: 'Email 3 Prompt', default: `# 任務
請根據以下資訊撰寫第三封追蹤信件。請用繁體中文撰寫。

# 背景
- 客戶已參加過我方舉辦的活動，此信是第三封做後續追蹤的信

# 信件主旨
- 用類似的句型：給 <客戶姓名> 的 <Mail Angle中提及能幫助客戶達到的具體效益> 建議
- 必須15個字以內

# 內容動機
- 這是最後一次追蹤，必須融合Leads Profile和mail angle，回顧之前提到的客戶需求和挑戰
- 強調錯過的成本
- 提供最後的價值
- 包含明確的行動呼籲，目標是邀約客戶進行線上產品演示說明或是線上諮詢
- 留下好印象，為未來合作鋪路

# 寫作風格：
- 要有緊迫感
- 內容採用輕鬆、接近手寫信感的自然語氣，避免過度商業化，讓對方覺得是人與人的溝通
- 長度控制在270~330字，內容要簡潔有力` }
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

// 字符限制常量
const CHARACTER_LIMITS = {
  // 用戶資訊欄位限制
  SEMINAR_INFO: 5000,
  SEMINAR_BRIEF: 1000,
  EMAIL1_PROMPT: 1000,
  EMAIL2_PROMPT: 1000,
  EMAIL3_PROMPT: 1000,

  // 主要工作表欄位限制
  FIRST_NAME: 100,
  POSITION: 100,
  COMPANY_URL: 200
};