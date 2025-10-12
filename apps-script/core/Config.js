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
  EMAIL1_PROMPT: { row: 9, col: 2, label: 'Email 1 Prompt', default: `# 任務
請根據以下資訊撰寫一封專業的追蹤信件。請用繁體中文撰寫。

# 背景
- 客戶已參加過我方舉辦的活動，此信是做後續追蹤

# 信件主旨
- 用類似的句型：給 <客戶稱謂> 的 <Mail Angle中提及能幫助客戶達到的具體效益> 建議
- 必須20個字以內

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
- 用類似的句型：給 <客戶稱謂> 的 <Mail Angle中提及能幫助客戶達到的具體效益> 建議
- 必須20個字以內

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
- 用類似的句型：給 <客戶稱謂> 的 <Mail Angle中提及能幫助客戶達到的具體效益> 建議
- 必須20個字以內

# 內容動機
- 這是最後一次追蹤，必須融合Leads Profile和mail angle，重述客戶需求和挑戰
- 強調錯過的成本
- 提供最後的價值
- 包含明確的行動呼籲，目標是邀約客戶進行線上產品演示說明或是線上諮詢
- 留下好印象，為未來合作鋪路

# 寫作風格：
- 要有緊迫感
- 內容採用輕鬆、接近手寫信感的自然語氣，避免過度商業化，讓對方覺得是人與人的溝通
- 長度控制在270~330字，內容要簡潔有力` }
};

// 郵件生成通用提示詞模板
const EMAIL_PROMPT_TEMPLATE = `
- 開場使用Leads Profile的資訊展現對客戶職位與其公司的了解
- 內容要使用 Mail Angle 的角度切入，使用Leads Profile的資訊讓客戶感覺此封信件是專門為'他'和'他的公司'寫的
- 特別考慮客戶在{department}部門擔任{position}職位的特殊需求和關注重點
- 客戶稱謂只有中階管理層以上才需要加上簡短職稱，不然用姓名即可
- 在撰寫郵件時，請根據Leads Profile中的客戶公司的國家或文化的商業信件書寫慣例，判斷在正式郵件中最合適的客戶稱謂。郵件主旨與郵件正文務必使用同樣稱呼
- 切勿翻譯客戶姓名，無論語言

# 客戶方資訊
- 收件人: {firstName}
- 職位: {position}
- 部門: {department}
- Leads Profile : {leadsProfile}

# 我方舉辦的活動資訊
{seminarBrief}

# 信件切入點
Mail Angle: {mailAngle}

# 輸出
請按照以下格式提供：
主旨：[郵件主旨]
內容：[郵件正文]

# 注意
- 嚴禁生成不存在的公司、品牌、解決方案、產品、案例、數據，只能使用上的資訊。
- 不要在信中提及客戶以外的個人姓名，只能提到公司名
- 請不要使用任何 Markdown 格式（如 **粗體** 或 *斜體*），請使用純文字格式，可以用「」符號來強調重點內容。
- 嚴禁輸出任何簽名、祝福或聯絡方式，只寫郵件正文內容
- 嚴格限制不在郵件正文中提及客戶公司的資本額與人數
- 郵件正文請分段排版，避免過長段落。相同主題或邏輯相關的內容，請群聚為同一段落。不同段落之間請空一行，確保層次清楚、內容更易讀。`;

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