/**
 * 邮件服务 - 处理所有邮件发送相关功能
 */

const EmailService = {
  
  /**
   * 设定邮件发送排程（正式模式）
   */
  scheduleEmails(email, firstName, followUpMails, schedules, rowIndex) {
    // 在 Sheet-only 架構中，所有排程資料已直接儲存在 Sheet 中
    // 全域觸發器會直接從 Sheet 讀取，無需額外儲存
    console.log(`Sheet-only 模式：第 ${rowIndex} 行排程設定完成 - ${firstName} (${email})`);
    console.log('郵件內容和排程時間已儲存於 Sheet，支援即時用戶編輯');
  },

  /**
   * 立即發送郵件（Send Now 功能）
   */
  sendImmediateEmail(email, firstName, subject, content, rowIndex, emailType) {
    try {
      this.sendEmail(email, firstName, content, subject, rowIndex, emailType);
      
      // 更新排程狀態（加刪除線）
      SheetService.updateScheduleStatus(rowIndex, emailType);
      
      // 更新 info 欄位
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      SheetService.updateInfo(sheet, rowIndex, `立即發送: ${emailType} 已發送`);
      
      console.log(`立即發送成功: ${subject} 發送給 ${firstName} (${email})`);
      
    } catch (error) {
      console.error('立即發送郵件失敗:', error);
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      SheetService.updateInfo(sheet, rowIndex, `[Error] 立即發送失敗: ${error.message}`);
      throw error;
    }
  },

  /**
   * 核心郵件發送功能
   */
  sendEmail(email, firstName, content, subject, rowIndex = null, emailType = null) {
    // 使用 Utils 函數解析郵件內容
    const parsed = Utils.parseEmailContent(content);
    
    const finalSubject = parsed.subject || subject || `來自業務團隊的訊息 - ${firstName}`;
    const finalBody = parsed.body || content;
    
    // 發送郵件
    GmailApp.sendEmail(email, finalSubject, finalBody);
    
    // 記錄發送的郵件信息用於回復檢測
    if (rowIndex && emailType) {
      this.recordSentEmail(email, finalSubject, rowIndex, emailType);
    }
    
    console.log(`郵件已發送: ${finalSubject} -> ${email}`);
  },

  /**
   * 記錄已發送的郵件信息用於回復檢測
   */
  recordSentEmail(email, subject, rowIndex, emailType) {
    try {
      const sentTime = new Date().getTime();
      const recordKey = `sent_email_${rowIndex}_${emailType}`;
      
      const emailRecord = {
        email: email,
        subject: subject,
        sentTime: sentTime,
        rowIndex: rowIndex,
        emailType: emailType
      };
      
      PropertiesService.getScriptProperties().setProperty(recordKey, JSON.stringify(emailRecord));
      console.log(`記錄已發送郵件: ${recordKey}`);
      
    } catch (error) {
      console.error('記錄發送郵件失敗:', error);
    }
  },

  /**
   * 全域郵件檢查和發送（正式模式專用 - 每小時執行一次）
   */
  checkAndSendMails() {
    try {
      console.log('=== 全域郵件檢查開始（基於 Sheet 單一資料源）===');
      const now = new Date();
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();
      
      if (lastRow <= 1) {
        console.log('沒有資料需要檢查');
        return { checked: 0, sent: 0 };
      }
      
      let sentCount = 0;
      let checkedCount = 0;
      
      // 掃描所有行，尋找 Running 狀態的潛在客戶
      for (let rowIndex = 2; rowIndex <= lastRow; rowIndex++) {
        const status = sheet.getRange(rowIndex, COLUMNS.STATUS + 1).getValue();
        
        // 只處理 Running 狀態的行
        if (status !== 'Running') {
          continue;
        }
        
        checkedCount++;
        const email = sheet.getRange(rowIndex, COLUMNS.EMAIL + 1).getValue();
        const firstName = sheet.getRange(rowIndex, COLUMNS.FIRST_NAME + 1).getValue();
        
        if (!email || !firstName) {
          console.log(`跳過第 ${rowIndex} 行：缺少基本資料`);
          continue;
        }
        
        console.log(`檢查第 ${rowIndex} 行: ${firstName} (${email})`);
        
        // 檢查三封郵件的發送狀態
        const emailsToCheck = [
          {
            type: 'mail1',
            scheduleColumn: COLUMNS.SCHEDULE_1 + 1,
            contentColumn: COLUMNS.FOLLOW_UP_1 + 1
          },
          {
            type: 'mail2',
            scheduleColumn: COLUMNS.SCHEDULE_2 + 1,
            contentColumn: COLUMNS.FOLLOW_UP_2 + 1
          },
          {
            type: 'mail3',
            scheduleColumn: COLUMNS.SCHEDULE_3 + 1,
            contentColumn: COLUMNS.FOLLOW_UP_3 + 1
          }
        ];
        
        let emailsSentThisRound = 0;
        let totalEmailsSent = 0;
        
        for (const emailInfo of emailsToCheck) {
          const scheduleCell = sheet.getRange(rowIndex, emailInfo.scheduleColumn);
          const scheduleText = scheduleCell.getValue();
          const isAlreadySent = scheduleCell.getFontLine() === 'line-through';
          
          if (isAlreadySent) {
            totalEmailsSent++;
            continue;
          }
          
          if (!scheduleText) {
            console.log(`第 ${rowIndex} 行 ${emailInfo.type}: 無排程時間`);
            continue;
          }
          
          // 解析排程時間
          const scheduleTime = Utils.parseScheduleTime(scheduleText);
          if (!scheduleTime) {
            console.log(`第 ${rowIndex} 行 ${emailInfo.type}: 無效排程時間格式 "${scheduleText}"`);
            continue;
          }
          
          // 檢查是否到了發送時間
          if (now >= scheduleTime) {
            const content = sheet.getRange(rowIndex, emailInfo.contentColumn).getValue();
            
            if (!content) {
              console.log(`第 ${rowIndex} 行 ${emailInfo.type}: 無郵件內容`);
              continue;
            }
            
            try {
              // 發送郵件
              const subject = `Follow Up #${emailInfo.type.slice(-1)} - ${firstName}`;
              this.sendEmail(email, firstName, content, subject, rowIndex, emailInfo.type);
              
              // 標記為已發送（加刪除線）
              scheduleCell.setFontLine('line-through');
              
              emailsSentThisRound++;
              totalEmailsSent++;
              sentCount++;
              
              console.log(`✅ 發送成功: ${emailInfo.type} -> ${firstName} (${email})`);
              
              // 更新 info
              SheetService.updateInfo(sheet, rowIndex, `${emailInfo.type} 已自動發送 (${now.toLocaleString('zh-TW')})`);
              
            } catch (error) {
              console.error(`❌ 發送失敗: ${emailInfo.type} -> ${firstName} (${email})`, error);
              SheetService.updateInfo(sheet, rowIndex, `[Error] ${emailInfo.type} 發送失敗: ${error.message}`);
            }
          }
        }
        
        // 檢查是否所有三封郵件都已發送完成
        if (totalEmailsSent >= 3) {
          SheetService.updateStatus(sheet, rowIndex, 'Done');
          SheetService.updateInfo(sheet, rowIndex, '全部郵件已自動發送完成');
          console.log(`🎉 完成所有郵件發送: Row ${rowIndex} - ${firstName}`);
        } else if (emailsSentThisRound > 0) {
          SheetService.updateInfo(sheet, rowIndex, `已發送 ${totalEmailsSent}/3 封郵件`);
        }
      }
      
      console.log(`=== 全域郵件檢查完成 ===`);
      console.log(`檢查了 ${checkedCount} 個潛在客戶，發送了 ${sentCount} 封郵件`);
      
      return { checked: checkedCount, sent: sentCount };
      
    } catch (error) {
      console.error('全域郵件檢查時發生錯誤:', error);
      return { error: error.message };
    }
  },

  /**
   * 发送排程邮件（由触发器呼叫 - 舊版本，保留相容性）
   */
  sendScheduledEmail() {
    try {
      const now = new Date().getTime();
      const properties = PropertiesService.getScriptProperties().getProperties();
      
      // 寻找应该在此时发送的邮件
      for (const [key, value] of Object.entries(properties)) {
        if (key.startsWith('email_')) {
          const scheduleTime = parseInt(key.split('_')[1]);
          
          // 检查是否到了发送时间（允许5分钟的误差）
          if (Math.abs(now - scheduleTime) <= 5 * 60 * 1000) {
            const emailData = JSON.parse(value);
            
            // 使用 Utils 函數解析郵件內容
            const parsed = Utils.parseEmailContent(emailData.content);
            const subject = parsed.subject || `来自业务团队的讯息 - ${emailData.firstName}`;
            const body = parsed.body || emailData.content;
            
            // 发送邮件
            GmailApp.sendEmail(
              emailData.email,
              subject,
              body
            );
            
            // 更新 Sheet 中的排程状态
            SheetService.updateScheduleStatus(emailData.rowIndex, emailData.scheduleType);
            
            // 删除已处理的属性
            PropertiesService.getScriptProperties().deleteProperty(key);
            
            console.log(`邮件已发送给 ${emailData.email}: ${subject}`);
          }
        }
      }
    } catch (error) {
      console.error('发送排程邮件时发生错误:', error);
    }
  }
};

// 全局函数包装器
function scheduleEmails(email, firstName, followUpMails, schedules, rowIndex) {
  return EmailService.scheduleEmails(email, firstName, followUpMails, schedules, rowIndex);
}

function sendScheduledEmail() {
  return EmailService.sendScheduledEmail();
}

function checkAndSendMails() {
  return EmailService.checkAndSendMails();
}