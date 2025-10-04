/**
 * 工具函数 - 通用辅助函数
 */

const Utils = {
  
  /**
   * 生成排程時間 - 智慧分散工作時間排程
   * 產生三個排程時間：第一封分散在工作時間，第二第三封週週循環
   *
   * @function generateScheduleTimes
   * @description 計算三封郵件的發送排程時間，每小時最多10封避免垃圾郵件偵測
   * @returns {Object} 包含三個排程時間的物件
   * @returns {Date} returns.schedule1 - 第一封郵件的排程時間（分散在工作時間 8:00-17:00）
   * @returns {Date} returns.schedule2 - 第二封郵件的排程時間（第一封後7天同時間）
   * @returns {Date} returns.schedule3 - 第三封郵件的排程時間（第二封後7天同時間）
   */
  generateScheduleTimes() {
    // 使用 PropertiesService 維持計數器狀態
    const properties = PropertiesService.getScriptProperties();

    // 取得當前的郵件計數器和小時段
    let emailCounter = parseInt(properties.getProperty('emailCounter')) || 0;
    let currentHourSlot = properties.getProperty('currentHourSlot');

    // 如果沒有當前小時段，或計數器歸零時，取得新的小時段
    if (!currentHourSlot || emailCounter === 0) {
      // 如果計數器歸零，從當前時間段取得下一個時間段
      if (emailCounter === 0 && currentHourSlot) {
        const slotDate = this.getNextHourSlot(new Date(parseInt(currentHourSlot)));
        currentHourSlot = slotDate.getTime().toString();
      } else {
        // 第一次執行，從現在開始
        const slotDate = this.getNextHourSlot();
        currentHourSlot = slotDate.getTime().toString();
      }
      properties.setProperty('currentHourSlot', currentHourSlot);
    }

    // 轉換回 Date 物件
    const schedule1 = new Date(parseInt(currentHourSlot));

    // 第二封郵件：第一封後一週同時間
    const schedule2 = this.getNextWeekHourSlot(schedule1);

    // 第三封郵件：第二封後一週同時間
    const schedule3 = this.getNextWeekHourSlot(schedule2);

    // 更新計數器
    emailCounter = (emailCounter + 1) % 10;
    properties.setProperty('emailCounter', emailCounter.toString());

    // 如果計數器歸零（每10封郵件），下次呼叫時會取得新的小時段
    if (emailCounter === 0) {
      console.log(`已安排10封郵件至 ${this.formatScheduleTime(schedule1)}，下次將使用新的時間段`);
    }

    console.log(`安排郵件排程 (${emailCounter}/10): 第1封=${this.formatScheduleTime(schedule1)}, 第2封=${this.formatScheduleTime(schedule2)}, 第3封=${this.formatScheduleTime(schedule3)}`);

    return {
      schedule1: schedule1,
      schedule2: schedule2,
      schedule3: schedule3
    };
  },

  /**
   * 獲取下一個可用的工作時間小時段
   * 工作時間：週一到週五 8:00-17:00
   *
   * @function getNextHourSlot
   * @param {Date} fromDate - 起始日期，預設為當前時間
   * @returns {Date} 下一個可用的工作時間小時段
   */
  getNextHourSlot(fromDate = new Date()) {
    const date = new Date(fromDate);

    // 設置為下一個整點
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() + 1);

    // 確保在工作時間內（8:00-17:00）
    while (true) {
      const hour = date.getHours();
      const day = date.getDay();

      // 檢查是否為工作日（1=週一, 5=週五）
      if (day >= 1 && day <= 5) {
        // 檢查是否在工作時間內（8:00-17:00）
        if (hour >= 8 && hour <= 17) {
          return new Date(date);
        }

        // 如果超過17點，跳到明天8點
        if (hour > 17) {
          date.setDate(date.getDate() + 1);
          date.setHours(8, 0, 0, 0);
          continue;
        }

        // 如果早於8點，設置為8點
        if (hour < 8) {
          date.setHours(8, 0, 0, 0);
          continue;
        }
      }

      // 不是工作日，跳到下一天
      date.setDate(date.getDate() + 1);
      date.setHours(8, 0, 0, 0);

      // 跳過週末，到下週一
      if (date.getDay() === 6) { // 週六跳到週一
        date.setDate(date.getDate() + 2);
      } else if (date.getDay() === 0) { // 週日跳到週一
        date.setDate(date.getDate() + 1);
      }
    }
  },

  /**
   * 獲取指定日期後一週的同一時間
   *
   * @function getNextWeekHourSlot
   * @param {Date} date - 基準日期
   * @returns {Date} 一週後的同一時間
   */
  getNextWeekHourSlot(date) {
    if (!date || !(date instanceof Date)) {
      throw new Error('需要提供有效的日期物件');
    }

    const nextWeek = new Date(date);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  },

  /**
   * 格式化日期為字串
   * 將 Date 物件轉換為 YYYY-MM-DD HH:MM 格式的字串
   * 
   * @function formatDate
   * @param {Date} date - 要格式化的日期物件
   * @returns {string} 格式化後的日期字串，空值時返回空字串
   */
  formatDate(date) {
    if (!date || !(date instanceof Date)) {
      return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * 格式化排程時間為 MM/DD HH:00 格式
   * 將 Date 物件轉換為簡潔的排程顯示格式，易於解析
   * 
   * @function formatScheduleTime
   * @param {Date} date - 要格式化的日期物件
   * @returns {string} MM/DD HH:00 格式的字串，空值時返回空字串
   */
  formatScheduleTime(date) {
    if (!date || !(date instanceof Date)) {
      return '';
    }
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    
    return `${month}/${day} ${hours}:00`;
  },

  /**
   * 解析排程時間字串回 Date 物件
   * 將 MM/DD HH:MM 格式的字串轉換回 Date 物件
   * 
   * @function parseScheduleTime
   * @param {string} scheduleText - 排程時間字串 (格式: "MM/DD HH:MM")
   * @returns {Date|null} 解析後的 Date 物件，解析失敗時返回 null
   */
  parseScheduleTime(scheduleText) {
    if (!scheduleText || typeof scheduleText !== 'string') {
      return null;
    }
    
    try {
      // 格式: "08/10 18:00" 
      const currentYear = new Date().getFullYear();
      const fullDateString = `${currentYear}/${scheduleText}`;
      const parsedDate = new Date(fullDateString);
      
      // 驗證解析結果
      if (isNaN(parsedDate.getTime())) {
        console.error(`無效的排程時間格式: ${scheduleText}`);
        return null;
      }
      
      return parsedDate;
    } catch (error) {
      console.error(`解析排程時間錯誤: ${scheduleText}`, error);
      return null;
    }
  },

  /**
   * 解析郵件內容，分離主旨和內文
   * 從結構化的郵件內容中提取主旨和正文
   * 輸入格式：主旨：標題\n內容：\n正文內容
   *
   * @function parseEmailContent
   * @param {string} content - 原始郵件內容字串
   * @returns {Object} 解析結果
   * @returns {string|null} returns.subject - 郵件主旨，未找到時為 null
   * @returns {string} returns.body - 郵件正文內容
   */
  parseEmailContent(content) {
    if (!content || typeof content !== 'string') {
      return { subject: null, body: content || '' };
    }

    const lines = content.split('\n');
    let subject = null;
    let bodyLines = [];
    let inBodySection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // 檢查主旨行
      if (trimmedLine.includes('主旨：') || trimmedLine.includes('主旨:')) {
        subject = trimmedLine.replace(/主旨[:：]/g, '').trim();
        continue;
      }

      // 檢查內容開始行
      if (trimmedLine.includes('內容：') || trimmedLine.includes('內容:')) {
        inBodySection = true;

        // 檢查內容標記後是否有文字在同一行
        const contentAfterMarker = line.replace(/.*?內容[:：]\s*/, '');
        if (contentAfterMarker.trim() !== '') {
          bodyLines.push(contentAfterMarker);
        }
        continue;
      }

      // 如果在內容區域，收集所有後續行
      if (inBodySection) {
        bodyLines.push(line); // 保持原始格式和縮排
      }
    }

    // 如果沒有找到內容標記，但找到主旨，則將剩餘內容作為body
    if (!inBodySection && subject && lines.length > 1) {
      const subjectLineIndex = lines.findIndex(line => line.includes('主旨'));
      if (subjectLineIndex >= 0 && subjectLineIndex < lines.length - 1) {
        bodyLines = lines.slice(subjectLineIndex + 1);
      }
    }

    // 如果都沒有標記，將整個內容作為body
    if (!subject && !inBodySection) {
      bodyLines = lines;
    }

    return {
      subject: subject,
      body: bodyLines.join('\n').trim()
    };
  },

  /**
   * 驗證郵件地址格式
   * 使用正則表達式驗證郵件地址是否符合標準格式
   * 
   * @function isValidEmail
   * @param {string} email - 要驗證的郵件地址
   * @returns {boolean} 郵件地址有效時返回 true，否則返回 false
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * 檢查字串是否為空
   * 檢查字串是否為 null、undefined 或只包含空白字元
   *
   * @function isEmpty
   * @param {string} str - 要檢查的字串
   * @returns {boolean} 字串為空或只包含空白時返回 true
   */
  isEmpty(str) {
    return !str || typeof str !== 'string' || str.trim().length === 0;
  },

  /**
   * 截斷文本到指定長度
   * 如果文本超過指定長度，則截斷並添加省略號
   *
   * @function truncateText
   * @param {string} text - 要截斷的文本
   * @param {number} maxLength - 最大長度，預設 100
   * @returns {string} 截斷後的文本，空值時返回空字串
   */
  truncateText(text, maxLength = 100) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + '...';
  },

  /**
   * 驗證字符長度
   * 檢查文本是否超過指定的字符限制
   *
   * @function validateCharacterLimit
   * @param {string} text - 要檢查的文本
   * @param {number} limit - 字符限制
   * @param {string} fieldName - 欄位名稱，用於錯誤消息
   * @returns {Object} 驗證結果
   * @returns {boolean} returns.isValid - 是否通過驗證
   * @returns {string} returns.error - 錯誤消息（如果驗證失敗）
   * @returns {number} returns.currentLength - 當前字符數
   */
  validateCharacterLimit(text, limit, fieldName) {
    if (!text || typeof text !== 'string') {
      return { isValid: true, error: null, currentLength: 0 };
    }

    const currentLength = text.length;

    if (currentLength > limit) {
      return {
        isValid: false,
        error: `${fieldName} 超過字符限制！當前 ${currentLength} 字符，限制 ${limit} 字符`,
        currentLength: currentLength
      };
    }

    return {
      isValid: true,
      error: null,
      currentLength: currentLength
    };
  },

  /**
   * 驗證用戶資訊欄位
   * 根據 CHARACTER_LIMITS 常量驗證用戶資訊欄位
   *
   * @function validateUserInfoFields
   * @param {Object} userInfo - 用戶資訊物件
   * @returns {Object} 驗證結果
   * @returns {boolean} returns.isValid - 所有欄位是否通過驗證
   * @returns {Array} returns.errors - 錯誤消息陣列
   */
  validateUserInfoFields(userInfo) {
    const errors = [];

    // 驗證講座資訊
    const seminarInfoResult = this.validateCharacterLimit(
      userInfo.seminarInfo,
      CHARACTER_LIMITS.SEMINAR_INFO,
      'Seminar Info'
    );
    if (!seminarInfoResult.isValid) {
      errors.push(seminarInfoResult.error);
    }

    // 驗證講座摘要
    const seminarBriefResult = this.validateCharacterLimit(
      userInfo.seminarBrief,
      CHARACTER_LIMITS.SEMINAR_BRIEF,
      'Seminar Brief'
    );
    if (!seminarBriefResult.isValid) {
      errors.push(seminarBriefResult.error);
    }

    // 驗證郵件提示詞
    const email1Result = this.validateCharacterLimit(
      userInfo.email1Prompt,
      CHARACTER_LIMITS.EMAIL1_PROMPT,
      'Email 1 Prompt'
    );
    if (!email1Result.isValid) {
      errors.push(email1Result.error);
    }

    const email2Result = this.validateCharacterLimit(
      userInfo.email2Prompt,
      CHARACTER_LIMITS.EMAIL2_PROMPT,
      'Email 2 Prompt'
    );
    if (!email2Result.isValid) {
      errors.push(email2Result.error);
    }

    const email3Result = this.validateCharacterLimit(
      userInfo.email3Prompt,
      CHARACTER_LIMITS.EMAIL3_PROMPT,
      'Email 3 Prompt'
    );
    if (!email3Result.isValid) {
      errors.push(email3Result.error);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * 驗證工作表行資料
   * 根據 CHARACTER_LIMITS 常量驗證主工作表的行資料
   *
   * @function validateRowData
   * @param {Object} rowData - 行資料物件
   * @returns {Object} 驗證結果
   * @returns {boolean} returns.isValid - 所有欄位是否通過驗證
   * @returns {Array} returns.errors - 錯誤消息陣列
   */
  validateRowData(rowData) {
    const errors = [];

    // 驗證姓名
    if (rowData.firstName) {
      const firstNameResult = this.validateCharacterLimit(
        rowData.firstName,
        CHARACTER_LIMITS.FIRST_NAME,
        'First Name'
      );
      if (!firstNameResult.isValid) {
        errors.push(firstNameResult.error);
      }
    }

    // 驗證職位
    if (rowData.position) {
      const positionResult = this.validateCharacterLimit(
        rowData.position,
        CHARACTER_LIMITS.POSITION,
        'Position'
      );
      if (!positionResult.isValid) {
        errors.push(positionResult.error);
      }
    }

    // 驗證公司網址
    if (rowData.companyUrl) {
      const companyUrlResult = this.validateCharacterLimit(
        rowData.companyUrl,
        CHARACTER_LIMITS.COMPANY_URL,
        'Company URL'
      );
      if (!companyUrlResult.isValid) {
        errors.push(companyUrlResult.error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
};

// 全局函數包裝器（常用工具函數）
/**
 * 生成排程時間 - 全域函數包裝器
 * 
 * @function generateScheduleTimes
 * @returns {Object} 包含三個排程時間的物件
 */
function generateScheduleTimes() {
  return Utils.generateScheduleTimes();
}

/**
 * 格式化日期 - 全域函數包裝器
 * 
 * @function formatDate
 * @param {Date} date - 要格式化的日期物件
 * @returns {string} 格式化後的日期字串
 */
function formatDate(date) {
  return Utils.formatDate(date);
}

/**
 * 驗證郵件地址 - 全域函數包裝器
 *
 * @function isValidEmail
 * @param {string} email - 要驗證的郵件地址
 * @returns {boolean} 郵件地址有效時返回 true
 */
function isValidEmail(email) {
  return Utils.isValidEmail(email);
}

