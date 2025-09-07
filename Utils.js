/**
 * 工具函数 - 通用辅助函数
 */

const Utils = {
  
  /**
   * 生成排程時間 - 更新為工作日上午9點模式
   * 產生三個排程時間：下一個工作日，以及後續兩個星期的同一天
   * 
   * @function generateScheduleTimes
   * @description 計算三封郵件的發送排程時間，都安排在工作日上午9點
   * @returns {Object} 包含三個排程時間的物件
   * @returns {Date} returns.schedule1 - 第一封郵件的排程時間（下一個工作日上午9點）
   * @returns {Date} returns.schedule2 - 第二封郵件的排程時間（第一封後7天）
   * @returns {Date} returns.schedule3 - 第三封郵件的排程時間（第二封後7天）
   */
  generateScheduleTimes() {
    const now = new Date();
    
    // 第一封邮件：下一个工作日上午9点
    const schedule1 = this.getNextWeekdayAt9AM(now);
    
    // 第二封邮件：第一封邮件后7天（保持同一星期几）
    const schedule2 = new Date(schedule1.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // 第三封邮件：第二封邮件后7天（保持同一星期几）
    const schedule3 = new Date(schedule2.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return {
      schedule1: schedule1,
      schedule2: schedule2,
      schedule3: schedule3
    };
  },

  /**
   * 获取下一个工作日上午9点的时间
   */
  getNextWeekdayAt9AM(fromDate) {
    const date = new Date(fromDate);
    date.setHours(9, 0, 0, 0); // 设置为上午9点
    
    // 如果是今天且还未到9点，就用今天
    const now = new Date();
    if (date.toDateString() === now.toDateString() && now.getHours() < 9) {
      return date;
    }
    
    // 否则找下一个工作日
    do {
      date.setDate(date.getDate() + 1);
    } while (date.getDay() === 0 || date.getDay() === 6); // 0是周日，6是周六
    
    return date;
  },

  /**
   * 格式化日期为字符串
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
   * 格式化排程時間為 MM/DD HH:00 格式（用於郵件排程顯示，易於解析）
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
   * 輸入格式：主旨：標題\n內容：\n正文內容
   * 返回：{ subject: string, body: string }
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
      const line = lines[i].trim();
      
      // 檢查主旨行
      if (line.includes('主旨：') || line.includes('主旨:')) {
        subject = line.replace(/主旨[:：]/g, '').trim();
        continue;
      }
      
      // 檢查內容開始行
      if (line.includes('內容：') || line.includes('內容:')) {
        inBodySection = true;
        continue;
      }
      
      // 如果在內容區域，收集所有後續行
      if (inBodySection) {
        bodyLines.push(lines[i]); // 保持原始格式和縮排
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
   * 验证邮件地址格式
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  /**
   * 清理文本内容
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return text.trim().replace(/\s+/g, ' ');
  },


  /**
   * 延迟执行
   */
  sleep(milliseconds) {
    Utilities.sleep(milliseconds);
  },

  /**
   * 安全的JSON解析
   */
  safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON解析错误:', error);
      return defaultValue;
    }
  },

  /**
   * 检查字符串是否为空
   */
  isEmpty(str) {
    return !str || typeof str !== 'string' || str.trim().length === 0;
  },

  /**
   * 截断文本到指定长度
   */
  truncateText(text, maxLength = 100) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  }
};

// 全局函数包装器（常用工具函数）
function generateScheduleTimes() {
  return Utils.generateScheduleTimes();
}

function formatDate(date) {
  return Utils.formatDate(date);
}

function isValidEmail(email) {
  return Utils.isValidEmail(email);
}