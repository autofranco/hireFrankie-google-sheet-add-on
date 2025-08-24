/**
 * 用戶資訊管理服務 - 處理用戶個人資訊工作表
 */

const UserInfoService = {
  
  /**
   * 獲取或創建用戶資訊工作表
   */
  getUserInfoSheet() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(USER_INFO_SHEET_NAME);
    
    if (!sheet) {
      // 創建新的用戶資訊工作表
      sheet = spreadsheet.insertSheet(USER_INFO_SHEET_NAME);
      this.setupUserInfoSheet(sheet);
    }
    
    return sheet;
  },

  /**
   * 設定用戶資訊工作表的格式和標題
   */
  setupUserInfoSheet(sheet) {
    // 設定標題
    sheet.getRange(1, 1).setValue('Personal Information for Email Signatures').setFontWeight('bold').setFontSize(14);
    
    // 設定欄位標籤和格式
    const fields = Object.values(USER_INFO_FIELDS);
    
    for (const field of fields) {
      // 設定標籤（第1列）
      const labelCell = sheet.getRange(field.row, 1);
      labelCell.setValue(field.label + ':');
      labelCell.setFontWeight('bold');
      labelCell.setHorizontalAlignment('right');
      
      // 設定輸入區域格式（第2列）
      const inputCell = sheet.getRange(field.row, field.col);
      inputCell.setBackground('#f0f8ff');
      inputCell.setBorder(true, true, true, true, false, false);
      
      // 如果有預設值，設定預設值
      if (field.default) {
        inputCell.setValue(field.default);
      }
    }
    
    // 設定列寬
    sheet.setColumnWidth(1, 120); // 標籤列
    sheet.setColumnWidth(2, 300); // 輸入列
    
    // 添加說明
    sheet.getRange(7, 1, 1, 2).merge();
    sheet.getRange(7, 1).setValue('💡 This information will be automatically added to the end of all generated emails as your signature.');
    sheet.getRange(7, 1).setFontStyle('italic').setFontColor('#666666');
    
    // 添加提示欄位的說明
    sheet.getRange(11, 1, 1, 2).merge();
    sheet.getRange(11, 1).setValue('✏️ Customize email generation prompts below. Leave blank to use default prompts.');
    sheet.getRange(11, 1).setFontStyle('italic').setFontColor('#666666');
    
    console.log('用戶資訊工作表設定完成');
  },

  /**
   * 獲取用戶資訊
   */
  getUserInfo() {
    try {
      const sheet = this.getUserInfoSheet();
      
      const userInfo = {
        greeting: sheet.getRange(USER_INFO_FIELDS.GREETING.row, USER_INFO_FIELDS.GREETING.col).getValue() || USER_INFO_FIELDS.GREETING.default,
        name: sheet.getRange(USER_INFO_FIELDS.NAME.row, USER_INFO_FIELDS.NAME.col).getValue() || '',
        company: sheet.getRange(USER_INFO_FIELDS.COMPANY.row, USER_INFO_FIELDS.COMPANY.col).getValue() || '',
        title: sheet.getRange(USER_INFO_FIELDS.TITLE.row, USER_INFO_FIELDS.TITLE.col).getValue() || '',
        contact: sheet.getRange(USER_INFO_FIELDS.CONTACT.row, USER_INFO_FIELDS.CONTACT.col).getValue() || '',
        email1Prompt: sheet.getRange(USER_INFO_FIELDS.EMAIL1_PROMPT.row, USER_INFO_FIELDS.EMAIL1_PROMPT.col).getValue() || '',
        email2Prompt: sheet.getRange(USER_INFO_FIELDS.EMAIL2_PROMPT.row, USER_INFO_FIELDS.EMAIL2_PROMPT.col).getValue() || '',
        email3Prompt: sheet.getRange(USER_INFO_FIELDS.EMAIL3_PROMPT.row, USER_INFO_FIELDS.EMAIL3_PROMPT.col).getValue() || ''
      };
      
      console.log('已獲取用戶資訊:', userInfo);
      return userInfo;
    } catch (error) {
      console.error('獲取用戶資訊時發生錯誤:', error);
      return { greeting: '順頌商祺', name: '', company: '', title: '', contact: '', email1Prompt: '', email2Prompt: '', email3Prompt: '' };
    }
  },

  /**
   * 生成郵件簽名
   */
  generateEmailSignature() {
    const userInfo = this.getUserInfo();
    
    // 如果沒有任何用戶資訊，返回空字串
    if (!userInfo.name && !userInfo.company && !userInfo.title && !userInfo.contact) {
      return '';
    }
    
    let signature = `\n\n${userInfo.greeting}\n`;
    
    if (userInfo.name) {
      signature += `${userInfo.name}\n`;
    }
    
    if (userInfo.title && userInfo.company) {
      signature += `${userInfo.title}, ${userInfo.company}\n`;
    } else if (userInfo.title) {
      signature += `${userInfo.title}\n`;
    } else if (userInfo.company) {
      signature += `${userInfo.company}\n`;
    }
    
    if (userInfo.contact) {
      signature += `${userInfo.contact}`;
    }
    
    return signature;
  },

  /**
   * 檢查用戶資訊是否已設定
   */
  hasUserInfo() {
    const userInfo = this.getUserInfo();
    return userInfo.name || userInfo.company || userInfo.title || userInfo.contact;
  }
};

// 全局函數包裝器
function setupUserInfoSheet() {
  const sheet = UserInfoService.getUserInfoSheet();
  if (sheet) {
    
    SpreadsheetApp.getUi().alert('用戶資訊工作表已準備就緒！', '請在 "User Info" 工作表中填入您的個人資訊，這些資訊會自動添加到所有郵件的簽名中。', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}