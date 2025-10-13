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
