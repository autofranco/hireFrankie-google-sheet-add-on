/**
 * 邮件服务 - 处理所有邮件发送相关功能
 */

const EmailService = {
  
  /**
   * 设定邮件发送排程（正式模式）
   */
  scheduleEmails(email, firstName, followUpMails, schedules, rowIndex) {
    // 只使用正式模式
    this.scheduleEmailsProductionMode(email, firstName, followUpMails, schedules, rowIndex);
  },

  /**
   * 正式模式：使用全域時間觸發器
   */
  scheduleEmailsProductionMode(email, firstName, followUpMails, schedules, rowIndex) {
    console.log('使用正式模式：全域觸發器方式');
    
    // 創建全域觸發器（如果不存在）
    TriggerManager.createGlobalEmailTrigger();
    
    // 將郵件資訊儲存到 PropertiesService，供全域觸發器使用
    const emailData = {
      email: email,
      firstName: firstName,
      rowIndex: rowIndex,
      emails: [
        {
          content: followUpMails.mail1,
          schedule: schedules.schedule1,
          type: 'mail1',
          sent: false
        },
        {
          content: followUpMails.mail2, 
          schedule: schedules.schedule2,
          type: 'mail2',
          sent: false
        },
        {
          content: followUpMails.mail3,
          schedule: schedules.schedule3, 
          type: 'mail3',
          sent: false
        }
      ]
    };
    
    // 使用唯一key儲存
    const propertyKey = `production_email_${rowIndex}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    PropertiesService.getScriptProperties().setProperty(propertyKey, JSON.stringify(emailData));
    
    console.log(`正式模式：已儲存郵件排程資料 - ${propertyKey}`);
  },

  /**
   * 立即發送郵件（Send Now 功能）
   */
  sendImmediateEmail(email, firstName, subject, content, rowIndex, emailType) {
    try {
      this.sendEmail(email, firstName, content, subject);
      
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
  sendEmail(email, firstName, content, subject) {
    // 解析郵件內容，提取主旨和內文
    const lines = content.split('\n');
    const extractedSubject = lines.find(line => line.includes('主旨') || line.includes('Subject'))
      ?.replace(/主旨[:：]?/g, '').trim();
    
    const finalSubject = extractedSubject || subject || `來自業務團隊的訊息 - ${firstName}`;
    
    // 發送郵件
    GmailApp.sendEmail(email, finalSubject, content);
    
    console.log(`郵件已發送: ${finalSubject} -> ${email}`);
  },

  /**
   * 全域郵件檢查和發送（正式模式專用 - 每小時執行一次）
   */
  checkAndSendMails() {
    try {
      console.log('=== 全域郵件檢查開始 ===');
      const now = new Date();
      const properties = PropertiesService.getScriptProperties().getProperties();
      let sentCount = 0;
      let checkedCount = 0;
      
      // 掃描所有正式模式的郵件排程
      for (const [key, value] of Object.entries(properties)) {
        if (key.startsWith('production_email_')) {
          checkedCount++;
          
          try {
            const emailData = JSON.parse(value);
            
            // 檢查該筆資料是否仍為 Running 狀態
            const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
            const statusCell = sheet.getRange(emailData.rowIndex, COLUMNS.STATUS + 1);
            const currentStatus = statusCell.getValue();
            
            // 如果狀態不是 Running，跳過處理
            if (currentStatus !== 'Running') {
              console.log(`跳過非 Running 狀態的資料: Row ${emailData.rowIndex}, Status: ${currentStatus}`);
              continue;
            }
            
            // 檢查每封郵件是否需要發送
            let dataUpdated = false;
            
            for (let i = 0; i < emailData.emails.length; i++) {
              const email = emailData.emails[i];
              
              // 如果已發送，跳過
              if (email.sent) continue;
              
              // 檢查是否到了發送時間
              const scheduleTime = new Date(email.schedule);
              
              if (now >= scheduleTime) {
                console.log(`發送時間已到: ${email.type} for ${emailData.firstName}`);
                
                try {
                  // 發送郵件
                  this.sendEmail(emailData.email, emailData.firstName, email.content, `Follow Up - ${email.type}`);
                  
                  // 標記為已發送
                  emailData.emails[i].sent = true;
                  dataUpdated = true;
                  sentCount++;
                  
                  // 更新 Sheet 中的排程狀態（加刪除線）
                  SheetService.updateScheduleStatus(emailData.rowIndex, email.type);
                  
                  console.log(`✅ 正式模式發送成功: ${email.type} -> ${emailData.email}`);
                  
                } catch (error) {
                  console.error(`❌ 正式模式發送失敗: ${email.type} -> ${emailData.email}`, error);
                  
                  // 更新錯誤訊息
                  SheetService.updateInfo(sheet, emailData.rowIndex, 
                    `[Error] ${email.type} 發送失敗: ${error.message}`);
                }
              }
            }
            
            // 檢查是否所有郵件都已發送
            const allSent = emailData.emails.every(email => email.sent);
            
            if (allSent) {
              // 所有郵件都已發送，更新狀態為 Done
              SheetService.updateStatus(sheet, emailData.rowIndex, 'Done');
              SheetService.updateInfo(sheet, emailData.rowIndex, '全部郵件已發送完成');
              
              // 刪除 PropertiesService 中的資料
              PropertiesService.getScriptProperties().deleteProperty(key);
              console.log(`🎉 完成所有郵件發送: Row ${emailData.rowIndex}`);
              
            } else if (dataUpdated) {
              // 更新 PropertiesService 中的資料
              PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(emailData));
            }
            
          } catch (error) {
            console.error(`處理郵件排程資料時發生錯誤: ${key}`, error);
          }
        }
      }
      
      console.log(`=== 全域郵件檢查完成 ===`);
      console.log(`檢查了 ${checkedCount} 筆排程資料，發送了 ${sentCount} 封郵件`);
      
    } catch (error) {
      console.error('全域郵件檢查發生錯誤:', error);
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
            
            // 解析邮件内容，提取主旨和内文
            const lines = emailData.content.split('\n');
            const subject = lines.find(line => line.includes('主旨') || line.includes('Subject'))
              ?.replace(/主旨[:：]?/g, '').trim() || 
              `来自业务团队的讯息 - ${emailData.firstName}`;
            const body = emailData.content;
            
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