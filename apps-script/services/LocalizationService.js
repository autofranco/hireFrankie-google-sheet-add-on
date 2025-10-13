/**
 * 本地化服務 - 處理多語言支援
 * Localization Service - Handle multi-language support
 */

const LocalizationService = {

  /**
   * 支援的語言
   */
  SUPPORTED_LANGUAGES: ['en', 'zh'],
  DEFAULT_LANGUAGE: 'en',

  /**
   * 取得當前語言設定
   * @returns {string} 語言代碼 ('en' 或 'zh')
   */
  getCurrentLanguage() {
    try {
      const userProperties = PropertiesService.getUserProperties();
      const language = userProperties.getProperty('LANGUAGE');

      // 如果沒有設定，返回預設語言（英文）
      if (!language || !this.SUPPORTED_LANGUAGES.includes(language)) {
        return this.DEFAULT_LANGUAGE;
      }

      return language;
    } catch (error) {
      console.error('取得語言設定失敗:', error);
      return this.DEFAULT_LANGUAGE;
    }
  },

  /**
   * 設定語言
   * @param {string} language - 語言代碼 ('en' 或 'zh')
   */
  setLanguage(language) {
    try {
      if (!this.SUPPORTED_LANGUAGES.includes(language)) {
        throw new Error(`不支援的語言: ${language}`);
      }

      const userProperties = PropertiesService.getUserProperties();
      userProperties.setProperty('LANGUAGE', language);

      console.log(`語言已設定為: ${language}`);
      return true;
    } catch (error) {
      console.error('設定語言失敗:', error);
      return false;
    }
  },

  /**
   * 切換語言（在兩種語言間切換）
   * @returns {string} 新的語言代碼
   */
  toggleLanguage() {
    const currentLang = this.getCurrentLanguage();
    const newLang = currentLang === 'en' ? 'zh' : 'en';
    this.setLanguage(newLang);
    return newLang;
  },

  /**
   * 取得語言顯示名稱
   * @param {string} language - 語言代碼
   * @returns {string} 語言顯示名稱
   */
  getLanguageDisplayName(language) {
    const names = {
      'en': 'English',
      'zh': '中文'
    };
    return names[language] || language;
  },

  /**
   * 取得 Mail Angles 欄位標籤
   */
  getMailAnglesLabels(language = null) {
    if (!language) {
      language = this.getCurrentLanguage();
    }

    const labels = {
      'en': {
        aspect1: 'Authority and Challenges: ',
        aspect2: 'Participation Motivation and Communication Strategy: '
      },
      'zh': {
        aspect1: '職權與挑戰：',
        aspect2: '參與動機與溝通策略：'
      }
    };

    return labels[language] || labels[this.DEFAULT_LANGUAGE];
  },

  /**
   * AI 提示詞模板 - 客戶畫像生成
   */
  getLeadsProfilePrompt(companyUrl, language = null) {
    if (!language) {
      language = this.getCurrentLanguage();
    }

    const prompts = {
      'en': `# Client Company Information
Company: ${companyUrl}

# Task
Please analyze the company background and output strictly in this format:
- Scale:
- Business Features:
- Recent Company Activities:
- Recent Industry News:

# Format Requirements
- Total word count must be controlled within 170-200 words, answer in English
- Use concise paragraphs, avoid lengthy descriptions
- Strictly prohibited from generating non-existent companies, brands, solutions, products, cases, data - only use information from search results
- Do not use Markdown or HTML format, use quotation marks to emphasize key points`,

      'zh': `# 參與活動的客戶方資訊
客戶公司：${companyUrl}

# 任務
請分析客戶公司背景，並嚴格用此格式輸出：
- 規模:
- 業務特色:
- 近期公司活動:
- 近期產業新聞:

# 格式要求
- 總字數必須控制在170~200字，用繁體中文回答
- 簡潔的段落表達，避免冗長描述
- 嚴禁生成不存在的公司、品牌、解決方案、產品、案例、數據，只能使用搜尋結果的資訊
- 不使用 Markdown 或 HTML 格式，用「」符號強調重點`
    };

    return prompts[language] || prompts[this.DEFAULT_LANGUAGE];
  },

  /**
   * AI 提示詞模板 - 郵件切入點生成
   */
  getMailAnglesPrompt(seminarBrief, firstName, position, department, leadsProfile, language = null) {
    if (!language) {
      language = this.getCurrentLanguage();
    }

    const prompts = {
      'en': `# Our Event Information: ${seminarBrief}
# Client Information:
Client Name: ${firstName}
Client Position: ${position}
Client Department: ${department}
Client Company Info: ${leadsProfile}

# Task
Based on the above information about our event and the client, please analyze and concisely generate the following 2 aspects and 3 email content angles.
The user has already attended our event, and the purpose of the email is to invite the client to take follow-up actions, with the email angles centered on the seminar content.
The three angles should be based on the client's most concerned pain points and areas with the greatest impact on them, especially considering their special needs and focus points as ${position} in the ${department} department.

Please strictly follow this format, with each angle as a separate paragraph:

<aspect1>(**Authority and Challenges, within 100 words, decision-making power and focus points, and common pain points for this position in the ${department} department**)</aspect1>

<aspect2>(**Participation Motivation and Communication Strategy, within 100 words, the client's possible needs for attending this seminar, and the most suitable follow-up methods and value propositions after the event**)</aspect2>

<angle1>(**Email 1 content outline, within 50 words, including value proposition and call to action**)</angle1>

<angle2>(**Email 2 outline, within 50 words, including value proposition and call to action**)</angle2>

<angle3>(**Email 3 outline, within 50 words, including value proposition and call to action**)</angle3>

# Format Requirements
- Do not output the explanation text wrapped in **in parentheses()
- Must use XML format, such as <aspect1>content</aspect1> and <angle1>content</angle1>
- Please answer in English, total word count must be controlled within 320~380 words
- Each aspect should be expressed in concise paragraphs, avoiding lengthy descriptions
- Especially consider the work characteristics of the ${department} department and the business focus of this position
- Strictly prohibited from generating non-existent companies, brands, solutions, products, cases, data - only use the above information
- Do not use Markdown format, use quotation marks to emphasize key points`,

      'zh': `# 我方舉辦的活動資訊: ${seminarBrief}
# 參與活動的客戶方資訊:
客戶姓名：${firstName}
客戶職位：${position}
客戶部門：${department}
客戶公司資訊：${leadsProfile}

# 任務
基於以上我方活動與客戶方資訊，請協助分析並簡潔的生成以下2個面向和3個信件內容切入點。
用戶已經參加過我方舉辦的活動，信件的目的是邀約客戶做後續的動作，信件切入點以研習活動的內容為主軸。
三個切入點應該根據客戶本人選擇最在意的痛點與對他影響最大的地方，特別考慮其在${department}部門擔任${position}職位的特殊需求和關注重點。

請嚴格按照以下格式回答，每個切入點獨立成段：

<aspect1>(**職權與挑戰，100字內，決策權力和關注重點與此職位在${department}部門常見的痛點**)</aspect1>

<aspect2>(**參與動機與溝通策略，100字內，客戶參加本研習活動的可能需求，以及活動後最適合的追蹤方式和價值主張**)</aspect2>

<angle1>(**信件1內容大綱，50字內，包括價值主張、行動呼籲**)</angle1>

<angle2>(**信件2大綱，50字內，包括價值主張、行動呼籲**)</angle2>

<angle3>(**信件3大綱，50字內，包括價值主張、行動呼籲**)</angle3>

# 格式要求
- 在parentheses()中被**包起來的說明文字不要輸出
- 必須使用XML格式，如 <aspect1>內容</aspect1> 和 <angle1>內容</angle1>
- 請用繁體中文回答，總字數必須控制在320~380個字
- 每個面向用簡潔的段落表達，避免冗長描述
- 特別考慮${department}部門的工作特性和該職位的業務重點
- 嚴禁生成不存在的公司、品牌、解決方案、產品、案例、數據，只能使用上述的資訊
- 不使用 Markdown 格式，用「」符號強調重點`
    };

    return prompts[language] || prompts[this.DEFAULT_LANGUAGE];
  },

  /**
   * AI 提示詞模板 - 研習活動簡介生成
   */
  getSeminarBriefPrompt(seminarInfo, language = null) {
    if (!language) {
      language = this.getCurrentLanguage();
    }

    const prompts = {
      'en': `Please search for relevant information based on the following seminar information and compile a concise seminar brief. Please answer in English, with a total word count controlled within 400 words.

Seminar Information: ${seminarInfo}

Please concisely analyze the following five aspects (about 80-100 words each):
1. Event Overview: Name, organizer, basic information
2. Theme Focus: Core content and learning points of the event
3. Target Audience: Professional background and characteristics of participants
4. Learning Value: Specific gains participants can obtain
5. Industry Trends: Development background of related fields

Format Requirements:
- Express each aspect in concise paragraphs, avoiding lengthy descriptions
- Provide accurate information based on search results, strictly prohibited from generating false content
- Do not use Markdown format, use quotation marks to emphasize key points
- Ensure all five aspects are fully presented to help with subsequent lead analysis`,

      'zh': `請根據以下研習活動資訊，搜索相關資料並整理出簡潔的活動簡介。請用繁體中文回答，總字數控制在400字內。

研習活動資訊：${seminarInfo}

請簡潔分析以下五個面向（每個面向約80-100字）：
1. 活動概要：名稱、主辦單位、基本資訊
2. 主題重點：活動核心內容和學習要點
3. 目標族群：參加者職業背景和特質
4. 學習價值：參與者可獲得的具體收穫
5. 行業趨勢：相關領域的發展背景

格式要求：
- 每個面向用簡潔段落表達，避免冗長描述
- 基於搜索結果提供準確資訊，嚴禁生成虛假內容
- 不使用 Markdown 格式，用「」符號強調重點
- 確保五個面向都完整呈現，有助後續潛客分析`
    };

    return prompts[language] || prompts[this.DEFAULT_LANGUAGE];
  },

  /**
   * 取得郵件提示詞預設值
   */
  getEmailPromptDefaults(language = null) {
    if (!language) {
      language = this.getCurrentLanguage();
    }

    const prompts = {
      'en': {
        email1: `# Task
Please write a professional follow-up email based on the following information. Please write in English.

# Background
- The client has already attended our event, this email is for follow-up

# Email Subject
- Use a similar sentence pattern: <Benefit mentioned in Mail Angle that can help the client achieve> Suggestions for <Client Title>
- Must be within 20 words

# Content Motivation
- Start by thanking them for participating in the event, empathize with the difficulties their position faces in their company and industry
- Include a clear call to action, aiming to invite the client for an online product demonstration or online consultation

# Writing Style:
- Use a relaxed, natural tone close to handwritten letters, avoid being overly commercial, make the recipient feel it is person-to-person communication
- Keep length between 270-330 words, content should be concise and powerful`,

        email2: `# Task
Please write the second follow-up email based on the following information. Please write in English.

# Background
- The client has already attended our event, this is the second follow-up email

# Email Subject
- Use a similar sentence pattern: <Benefit mentioned in Mail Angle that can help the client achieve> Suggestions for <Client Title>
- Must be within 20 words

# Content Motivation
- Start by saying it's great to contact you again, empathize with the difficulties their position faces in their company and industry
- Include a clear call to action, aiming to invite the client for an online product demonstration or online consultation

# Writing Style:
- Use a relaxed, natural tone close to handwritten letters, avoid being overly commercial, make the recipient feel it is person-to-person communication
- Keep length between 270-330 words, content should be concise and powerful`,

        email3: `# Task
Please write the third follow-up email based on the following information. Please write in English.

# Background
- The client has already attended our event, this is the third follow-up email

# Email Subject
- Use a similar sentence pattern: <Benefit mentioned in Mail Angle that can help the client achieve> Suggestions for <Client Title>
- Must be within 20 words

# Content Motivation
- This is the last follow-up, must integrate Leads Profile and mail angle, restate client needs and challenges
- Emphasize the cost of missing out
- Provide the final value
- Include a clear call to action, aiming to invite the client for an online product demonstration or online consultation
- Leave a good impression, pave the way for future cooperation

# Writing Style:
- There should be a sense of urgency
- Use a relaxed, natural tone close to handwritten letters, avoid being overly commercial, make the recipient feel it is person-to-person communication
- Keep length between 270-330 words, content should be concise and powerful`
      },
      'zh': {
        email1: `# 任務
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
- 長度控制在270~330字，內容要簡潔有力`,

        email2: `# 任務
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
- 長度控制在270~330字，內容要簡潔有力`,

        email3: `# 任務
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
- 長度控制在270~330字，內容要簡潔有力`
      }
    };

    return prompts[language] || prompts[this.DEFAULT_LANGUAGE];
  },

  /**
   * 取得郵件生成提示詞模板
   * 這是附加在用戶自定義郵件提示詞後面的通用模板
   */
  getEmailPromptTemplate(language = null) {
    if (!language) {
      language = this.getCurrentLanguage();
    }

    const templates = {
      'en': `
- Start by using Leads Profile information to demonstrate understanding of the client's position and their company
- Content should use the Mail Angle perspective, using Leads Profile information to make the client feel this email is specifically written for 'them' and 'their company'
- Especially consider the special needs and focus points of the client as {position} in the {department} department
- Client title should only include a brief job title for mid-level management and above, otherwise use name only
- When writing the email, based on the country or culture of the client company in Leads Profile, determine the most appropriate client title for formal emails according to business letter writing conventions. Email subject and email body must use the same title
- Never translate the client's name, regardless of language

# Client Information
- Recipient: {firstName}
- Position: {position}
- Department: {department}
- Leads Profile: {leadsProfile}

# Our Event Information
{seminarBrief}

# Email Angle
Mail Angle: {mailAngle}

# Output
Please provide in the following format:
Subject: [Email Subject]
Content: [Email Body]

# Notes
- Strictly prohibited from generating non-existent companies, brands, solutions, products, cases, data - only use the above information.
- Do not mention any personal names other than the client in the email, only mention company names
- Please do not use any Markdown format (such as **bold** or *italic*), please use plain text format, you can use quotation marks to emphasize key content.
- Strictly prohibited from outputting any signature, greetings, or contact information, only write the email body content
- Strictly limit not mentioning the client company's capital and number of employees in the email body
- Please format the email body in paragraphs, avoiding overly long paragraphs. Content with the same theme or logical relationship should be grouped into the same paragraph. Leave a blank line between different paragraphs to ensure clear hierarchy and easier reading.`,

      'zh': `
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
- 郵件正文請分段排版，避免過長段落。相同主題或邏輯相關的內容，請群聚為同一段落。不同段落之間請空一行，確保層次清楚、內容更易讀。`
    };

    return templates[language] || templates[this.DEFAULT_LANGUAGE];
  }
};

// 全局函數包裝器
function getCurrentLanguage() {
  return LocalizationService.getCurrentLanguage();
}

function setLanguage(language) {
  return LocalizationService.setLanguage(language);
}

function toggleLanguage() {
  return LocalizationService.toggleLanguage();
}
