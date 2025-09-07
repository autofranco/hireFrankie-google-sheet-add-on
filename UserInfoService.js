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
      
      console.log('已獲取用戶資訊:', userInfo);
      return userInfo;
    } catch (error) {
      console.error('獲取用戶資訊時發生錯誤:', error);
      return { greeting: '順頌商祺', name: '', company: '', title: '', contact: '', seminarInfo: '', seminarBrief: '', email1Prompt: '', email2Prompt: '', email3Prompt: '' };
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
  },

  /**
   * 生成研習活動簡介 (Seminar Brief)
   */
  generateSeminarBrief(seminarInfo) {
    const prompt = `請根據以下研習活動資訊，搜索相關資料並整理出簡潔的活動簡介。請用繁體中文回答，總字數控制在400字內。

研習活動資訊：${seminarInfo}

請簡潔分析以下五個面向（每個面向約80-100字）：
1. 活動概要：名稱、主辦單位、基本資訊
2. 主題重點：活動核心內容和學習要點  
3. 目標族群：參加者職業背景和特質
4. 學習價值：參與者可獲得的具體收穫
5. 行業趨勢：相關領域的發展背景

格式要求：
- 每個面向用簡潔段落表達，避免冗長描述
- 基於搜索結果提供準確資訊，不生成虛假內容
- 不使用 Markdown 格式，用「」符號強調重點
- 確保五個面向都完整呈現，有助後續潛客分析`;

    try {
      console.log('開始生成研習活動簡介...');
      
      // 開始統計
      TokenTracker.startSeminarBrief();
      
      const response = APIService.callPerplexityAPIWithSonarPro(prompt);
      console.log('研習活動簡介生成成功:', response.substring(0, 100) + '...');
      
      // 清理 Markdown 格式
      const cleanedResponse = ContentGenerator.cleanMarkdownForSheets(response);
      
      // 立即儲存到工作表
      this.updateSeminarBrief(cleanedResponse);
      
      return cleanedResponse;
    } catch (error) {
      console.error('生成研習活動簡介失敗:', error);
      throw new Error(`生成研習活動簡介失敗: ${error.message}`);
    }
  },

  /**
   * 更新研習活動簡介到工作表
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

      // 檢查是否需要重新生成 seminar brief
      console.log('檢測到 Seminar Info，準備重新生成 Seminar Brief...');
      
      // 重新生成 seminar brief
      const seminarBrief = this.generateSeminarBrief(userInfo.seminarInfo);
      
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
function setupUserInfoSheet() {
  const sheet = UserInfoService.getUserInfoSheet();
  if (sheet) {
    SpreadsheetApp.getUi().alert('用戶資訊工作表已準備就緒！', '請在 "User Info" 工作表中填入您的個人資訊，這些資訊會自動添加到所有郵件的簽名中。', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function checkAndGenerateSeminarBrief() {
  return UserInfoService.checkAndGenerateSeminarBrief();
}

function generateSeminarBrief(seminarInfo) {
  return UserInfoService.generateSeminarBrief(seminarInfo);
}