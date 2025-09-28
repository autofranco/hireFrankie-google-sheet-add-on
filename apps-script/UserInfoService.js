/**
 * 用戶資訊管理服務 - 處理用戶個人資訊工作表
 */

const UserInfoService = {
  
  /**
   * 獲取或創建用戶資訊工作表
   * 檢查並返回 User Info 工作表，如果不存在則創建新的
   * 
   * @function getUserInfoSheet
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} User Info 工作表物件
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
   * 初始化工作表的欄位標籤、格式和說明文字
   * 
   * @function setupUserInfoSheet
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 要設定的工作表物件
   * @returns {void}
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
    
    // 動態計算說明文字的位置
    const maxFieldRow = Math.max(...fields.map(f => f.row));
    const signatureHelpRow = maxFieldRow + 1;
    const promptHelpRow = maxFieldRow + 3;
    
    // 添加簽名說明
    sheet.getRange(signatureHelpRow, 1, 1, 2).merge();
    sheet.getRange(signatureHelpRow, 1).setValue('💡 Personal information above will be automatically added to all generated emails as your signature.');
    sheet.getRange(signatureHelpRow, 1).setFontStyle('italic').setFontColor('#666666');
    
    // 添加研習活動說明
    sheet.getRange(signatureHelpRow + 1, 1, 1, 2).merge();
    sheet.getRange(signatureHelpRow + 1, 1).setValue('🎯 Seminar Info will be used to auto-generate Seminar Brief for all leads analysis.');
    sheet.getRange(signatureHelpRow + 1, 1).setFontStyle('italic').setFontColor('#666666');
    
    // 添加提示欄位的說明
    sheet.getRange(promptHelpRow, 1, 1, 2).merge();
    sheet.getRange(promptHelpRow, 1).setValue('✏️ Customize email generation prompts below. Leave blank to use default prompts.');
    sheet.getRange(promptHelpRow, 1).setFontStyle('italic').setFontColor('#666666');
    
    console.log('用戶資訊工作表設定完成');
  },

  /**
   * 獲取用戶資訊
   * 從 User Info 工作表讀取所有用戶資訊欄位
   * 
   * @function getUserInfo
   * @returns {Object} 包含所有用戶資訊的物件
   * @returns {string} returns.greeting - 問候語
   * @returns {string} returns.name - 用戶姓名
   * @returns {string} returns.company - 公司名稱
   * @returns {string} returns.title - 職稱
   * @returns {string} returns.contact - 聯絡資訊
   * @returns {string} returns.seminarInfo - 研習活動資訊
   * @returns {string} returns.seminarBrief - 研習活動簡介
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
        seminarInfo: sheet.getRange(USER_INFO_FIELDS.SEMINAR_INFO.row, USER_INFO_FIELDS.SEMINAR_INFO.col).getValue() || '',
        seminarBrief: sheet.getRange(USER_INFO_FIELDS.SEMINAR_BRIEF.row, USER_INFO_FIELDS.SEMINAR_BRIEF.col).getValue() || '',
        email1Prompt: sheet.getRange(USER_INFO_FIELDS.EMAIL1_PROMPT.row, USER_INFO_FIELDS.EMAIL1_PROMPT.col).getValue() || '',
        email2Prompt: sheet.getRange(USER_INFO_FIELDS.EMAIL2_PROMPT.row, USER_INFO_FIELDS.EMAIL2_PROMPT.col).getValue() || '',
        email3Prompt: sheet.getRange(USER_INFO_FIELDS.EMAIL3_PROMPT.row, USER_INFO_FIELDS.EMAIL3_PROMPT.col).getValue() || ''
      };
      
      console.log(`已獲取用戶資訊: ${userInfo.name} (${userInfo.company})`);
      return userInfo;
    } catch (error) {
      console.error('獲取用戶資訊時發生錯誤:', error);
      return { greeting: '順頌商祺', name: '', company: '', title: '', contact: '', seminarInfo: '', seminarBrief: '', email1Prompt: '', email2Prompt: '', email3Prompt: '' };
    }
  },

  /**
   * 生成郵件簽名
   * 根據用戶資訊生成格式化的郵件簽名
   * 
   * @function generateEmailSignature
   * @returns {string} 格式化的郵件簽名字串
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
   * 更新研習活動簡介到工作表
   * 將生成的研習活動簡介寫入到專用欄位
   * 
   * @function updateSeminarBrief
   * @param {string} seminarBrief - 要儲存的研習活動簡介內容
   * @returns {void}
   */
  updateSeminarBrief(seminarBrief) {
    try {
      const sheet = this.getUserInfoSheet();
      sheet.getRange(USER_INFO_FIELDS.SEMINAR_BRIEF.row, USER_INFO_FIELDS.SEMINAR_BRIEF.col).setValue(seminarBrief);
      console.log('研習活動簡介已更新到工作表');
    } catch (error) {
      console.error('更新研習活動簡介到工作表失敗:', error);
    }
  },

  /**
   * 檢查並自動生成研習活動簡介（如果需要）
   */
  checkAndGenerateSeminarBrief() {
    try {
      const userInfo = this.getUserInfo();
      
      // 檢查 seminar info 是否為空
      if (!userInfo.seminarInfo || userInfo.seminarInfo.trim() === '') {
        console.log('Seminar Info 為空，需要用戶填寫');
        return {
          success: false,
          message: 'Seminar Info 欄位為空，請先填寫研習活動資訊',
          needsUserInput: true
        };
      }

      // 智能檢查是否需要重新生成 seminar brief
      const currentInfo = userInfo.seminarInfo;
      const currentBrief = userInfo.seminarBrief;
      const lastInfo = PropertiesService.getScriptProperties().getProperty('lastSeminarInfo');
      
      // 如果 info 沒變更且 brief 已存在，直接使用現有 brief
      if (lastInfo === currentInfo && currentBrief && currentBrief.trim() !== '') {
        console.log('Seminar Info 沒有變更且 Brief 已存在，使用現有簡介');
        return {
          success: true,
          message: '使用現有研習活動簡介',
          seminarBrief: currentBrief
        };
      }
      
      // 需要重新生成（info 變更或 brief 為空）
      console.log('檢測到 Seminar Info 變更或 Brief 為空，準備重新生成 Seminar Brief...');
      
      // 重新生成 seminar brief
      const seminarBrief = ContentGenerator.generateSeminarBrief(userInfo.seminarInfo);
      
      // 存儲當前 info 到 PropertiesService
      PropertiesService.getScriptProperties().setProperty('lastSeminarInfo', currentInfo);
      
      return {
        success: true,
        message: '研習活動簡介已自動生成並更新',
        seminarBrief: seminarBrief
      };

    } catch (error) {
      console.error('檢查並生成研習活動簡介時發生錯誤:', error);
      return {
        success: false,
        message: `生成研習活動簡介失敗: ${error.message}`,
        error: error.message
      };
    }
  }
};

// 全局函數包裝器
/**
 * 設定用戶資訊工作表 - 全域函數包裝器
 * 
 * @function setupUserInfoSheet
 * @returns {void}
 */
function setupUserInfoSheet() {
  const sheet = UserInfoService.getUserInfoSheet();
  if (sheet) {
    // 使用非阻塞toast通知顯示用戶資訊工作表準備完成
    ToastService.showInfo('用戶資訊工作表已準備就緒！請在 "User Info" 工作表中填入個人資訊', 4);
  }
}

/**
 * 檢查並生成研習活動簡介 - 全域函數包裝器
 * 
 * @function checkAndGenerateSeminarBrief
 * @returns {Object} 結果物件，包含 success 狀態和 message
 */
function checkAndGenerateSeminarBrief() {
  return UserInfoService.checkAndGenerateSeminarBrief();
}

