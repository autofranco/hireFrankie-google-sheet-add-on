/**
 * 工具函数 - 通用辅助函数
 */

const Utils = {
  
  /**
   * 生成排程时间
   */
  generateScheduleTimes() {
    const now = new Date();
    
    // 取得當前小時，設定為整點
    const currentHour = new Date(now);
    currentHour.setMinutes(0);
    currentHour.setSeconds(0);
    currentHour.setMilliseconds(0);
    
    return {
      schedule1: new Date(currentHour.getTime()), // 這小時
      schedule2: new Date(currentHour.getTime() + 60 * 60 * 1000), // 下小時
      schedule3: new Date(currentHour.getTime() + 2 * 60 * 60 * 1000) // 後小時
    };
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
   * 解析排程時間 - 支援 Date 物件、Date 字串、和 MM/DD HH:MM 格式
   */
  parseScheduleTime(scheduleValue) {
    if (!scheduleValue) {
      return null;
    }
    
    try {
      // 如果已經是 Date 對象，直接返回
      if (scheduleValue instanceof Date) {
        if (isNaN(scheduleValue.getTime())) {
          console.error(`無效的 Date 物件: ${scheduleValue}`);
          return null;
        }
        return scheduleValue;
      }
      
      // 如果是字串，嘗試解析
      if (typeof scheduleValue === 'string') {
        // 嘗試解析完整的 Date 字串
        const parsedDate = new Date(scheduleValue);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
        
        // 如果是 MM/DD HH:MM 格式，轉換為完整日期
        if (scheduleValue.match(/^\d{1,2}\/\d{1,2} \d{1,2}:\d{2}$/)) {
          const currentYear = new Date().getFullYear();
          const fullDateString = `${currentYear}/${scheduleValue}`;
          const parsedDate2 = new Date(fullDateString);
          if (!isNaN(parsedDate2.getTime())) {
            return parsedDate2;
          }
        }
      }
      
      console.error(`無法解析排程時間: ${scheduleValue} (type: ${typeof scheduleValue})`);
      return null;
    } catch (error) {
      console.error(`解析排程時間錯誤: ${scheduleValue}`, error);
      return null;
    }
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