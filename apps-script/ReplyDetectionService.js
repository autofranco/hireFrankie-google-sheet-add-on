/**
 * 回覆檢測服務 - 檢測潛在客戶是否回信
 */

const ReplyDetectionService = {
  
  /**
   * 檢查特定郵件地址是否有回覆
   */
  checkForReplies(email, rowIndex) {
    try {
      console.log(`檢查第 ${rowIndex} 行 (${email}) 的回覆`);
      
      // 獲取該行所有已發送的郵件記錄
      const sentEmails = this.getSentEmails(rowIndex);
      if (sentEmails.length === 0) {
        console.log(`第 ${rowIndex} 行沒有發送郵件記錄`);
        return { hasReply: false };
      }
      
      const myEmail = Session.getActiveUser().getEmail();
      console.log(`檢查 ${sentEmails.length} 封已發送郵件的回覆`);
      
      // 檢查每封已發送郵件的回覆
      for (const sentEmail of sentEmails) {
        console.log(`檢查郵件: ${sentEmail.subject} (發送時間: ${new Date(sentEmail.sentTime)})`);
        
        // 搜尋包含該主旨的對話串
        const query = `subject:"${sentEmail.subject}" from:${email}`;
        console.log(`搜尋查詢: ${query}`);
        
        try {
          const threads = GmailApp.search(query, 0, 1);
          console.log(`找到 ${threads.length} 個相關對話串`);
          
          for (const thread of threads) {
            const messages = thread.getMessages();
            
            for (const message of messages) {
              const messageDate = message.getDate();
              const sender = message.getFrom();
              const subject = message.getSubject();
              
              // 檢查是否為回覆：1) 來自目標郵件地址 2) 在我們發送郵件之後 3) 不是我們發送的
              if (messageDate.getTime() > sentEmail.sentTime && 
                  (sender.includes(email) || sender.toLowerCase().includes(email.toLowerCase())) &&
                  !sender.includes(myEmail)) {
                console.log(`✅ 發現回覆: ${sender} 於 ${messageDate} 回覆了 "${sentEmail.subject}"`);
                return {
                  hasReply: true,
                  replyDate: messageDate,
                  sender: sender,
                  subject: subject,
                  originalEmailType: sentEmail.emailType
                };
              }
            }
          }
        } catch (searchError) {
          console.error(`搜尋錯誤:`, searchError);
          continue;
        }
      }
      
      console.log(`❌ 沒有發現第 ${rowIndex} 行的回覆`);
      return { hasReply: false };
      
    } catch (error) {
      console.error(`檢查第 ${rowIndex} 行回覆時發生錯誤:`, error);
      return { hasReply: false, error: error.message };
    }
  },

  /**
   * 獲取特定行的所有已發送郵件記錄
   */
  getSentEmails(rowIndex) {
    try {
      const properties = PropertiesService.getScriptProperties().getProperties();
      const sentEmails = [];
      
      for (const [key, value] of Object.entries(properties)) {
        if (key.startsWith(`sent_email_${rowIndex}_`)) {
          try {
            const emailRecord = JSON.parse(value);
            sentEmails.push(emailRecord);
          } catch (parseError) {
            console.error(`解析郵件記錄失敗: ${key}`, parseError);
          }
        }
      }
      
      // 按發送時間排序
      sentEmails.sort((a, b) => a.sentTime - b.sentTime);
      return sentEmails;
      
    } catch (error) {
      console.error('獲取已發送郵件記錄失敗:', error);
      return [];
    }
  },

  /**
   * 將日期格式化為 Gmail 搜尋格式
   */
  formatDateForGmail(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}/${month}/${day}`;
  },

  /**
   * 批量檢查所有 Running 狀態的潛在客戶回覆
   */
  checkAllRunningLeadsForReplies() {
    try {
      console.log('=== 開始檢查所有潛在客戶回覆 ===');
      
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();
      
      if (lastRow <= 1) return;
      
      let checkedCount = 0;
      let repliesFound = 0;
      
      // 檢查每一行的狀態
      for (let i = 2; i <= lastRow; i++) {
        const status = sheet.getRange(i, COLUMNS.STATUS + 1).getValue();

        // 檢查 Running 和 Done 狀態的行（Done 狀態可能是發完3封信後才收到回覆）
        if (status === 'Running' || status === 'Done') {
          const email = sheet.getRange(i, COLUMNS.EMAIL + 1).getValue();
          const firstName = sheet.getRange(i, COLUMNS.FIRST_NAME + 1).getValue();
          const info = sheet.getRange(i, COLUMNS.INFO + 1).getValue();

          // 跳過已經標記為回覆的潛客（優化 Gmail 配額使用）
          if (info && info.toString().includes('潛客已回信')) {
            continue;
          }

          if (email && firstName) {
            checkedCount++;
            
            // 檢查該行是否有回覆
            const replyResult = this.checkForReplies(email, i);
            
            if (replyResult.hasReply) {
              repliesFound++;
              
              // 更新狀態為 Done
              SheetService.updateStatus(sheet, i, 'Done');
              const replyInfo = replyResult.originalEmailType ? 
                `潛客已回信 ${replyResult.originalEmailType} (${replyResult.replyDate.toLocaleString('zh-TW')})` :
                `潛客已回信 (${replyResult.replyDate.toLocaleString('zh-TW')})`;
              SheetService.updateInfo(sheet, i, replyInfo);
              
              // 清理該潛客的排程和發送記錄資料
              this.cleanupLeadScheduleData(email, i);
              
              console.log(`✅ 發現回覆: ${firstName} (${email}) - 已停止後續郵件`);
            }
          }
        }
      }
      
      // 每次檢測時清理超過30天的舊記錄
      this.cleanupOldSentEmails();
      
      console.log(`=== 回覆檢查完成 ===`);
      console.log(`檢查了 ${checkedCount} 個潛在客戶，發現 ${repliesFound} 個回覆`);
      
      return { checked: checkedCount, repliesFound: repliesFound };
      
    } catch (error) {
      console.error('批量檢查回覆時發生錯誤:', error);
      return { error: error.message };
    }
  },

  /**
   * 清理已回覆潛客的排程和發送記錄資料
   */
  cleanupLeadScheduleData(email, rowIndex = null) {
    try {
      const properties = PropertiesService.getScriptProperties().getProperties();
      let cleanedCount = 0;
      
      for (const key of Object.keys(properties)) {
        let shouldDelete = false;
        
        // 清理排程資料
        if (key.startsWith('production_email_') && key.includes(email.replace(/[^a-zA-Z0-9]/g, '_'))) {
          shouldDelete = true;
        }
        
        // 清理該潛客的發送記錄
        if (rowIndex && key.startsWith(`sent_email_${rowIndex}_`)) {
          shouldDelete = true;
        }
        
        // 如果沒有 rowIndex，嘗試通過 email 匹配清理發送記錄
        if (!rowIndex && key.startsWith('sent_email_')) {
          try {
            const emailRecord = JSON.parse(properties[key]);
            if (emailRecord.email === email) {
              shouldDelete = true;
            }
          } catch (parseError) {
            // 如果解析失敗，保留記錄
          }
        }
        
        if (shouldDelete) {
          PropertiesService.getScriptProperties().deleteProperty(key);
          cleanedCount++;
          console.log(`清理資料: ${key}`);
        }
      }
      
      console.log(`已清理 ${cleanedCount} 個 ${email} 的相關資料`);
      
    } catch (error) {
      console.error(`清理資料時發生錯誤 (${email}):`, error);
    }
  },

  /**
   * 清理舊的發送記錄（超過30天的記錄）
   */
  cleanupOldSentEmails() {
    try {
      const properties = PropertiesService.getScriptProperties().getProperties();
      const thirtyDaysAgo = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;
      
      for (const [key, value] of Object.entries(properties)) {
        if (key.startsWith('sent_email_')) {
          try {
            const emailRecord = JSON.parse(value);
            if (emailRecord.sentTime < thirtyDaysAgo) {
              PropertiesService.getScriptProperties().deleteProperty(key);
              cleanedCount++;
              console.log(`清理舊記錄: ${key}`);
            }
          } catch (parseError) {
            // 如果解析失敗，刪除損壞的記錄
            PropertiesService.getScriptProperties().deleteProperty(key);
            cleanedCount++;
            console.log(`清理損壞記錄: ${key}`);
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`已清理 ${cleanedCount} 個舊的發送記錄`);
      }
      
    } catch (error) {
      console.error('清理舊發送記錄時發生錯誤:', error);
    }
  },

  /**
   * 創建回覆檢測觸發器（每小時執行一次）
   */
  createReplyDetectionTrigger() {
    try {
      const existingTriggers = ScriptApp.getProjectTriggers();
      const triggerExists = existingTriggers.some(trigger => 
        trigger.getHandlerFunction() === 'checkAllRunningLeadsForReplies'
      );
      
      if (!triggerExists) {
        console.log('創建回覆檢測觸發器（每小時執行一次）');
        ScriptApp.newTrigger('checkAllRunningLeadsForReplies')
          .timeBased()
          .everyHours(1)
          .create();
        console.log('✅ 回覆檢測觸發器創建成功');
      } else {
        console.log('回覆檢測觸發器已存在');
      }
    } catch (error) {
      console.error('創建回覆檢測觸發器時發生錯誤:', error);
      throw new Error(`回覆檢測觸發器創建失敗: ${error.message}`);
    }
  },

  /**
   * 刪除回覆檢測觸發器
   */
  deleteReplyDetectionTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'checkAllRunningLeadsForReplies') {
        ScriptApp.deleteTrigger(trigger);
        console.log('已刪除回覆檢測觸發器');
      }
    });
  }
};

// 全局函數包裝器
function checkAllRunningLeadsForReplies() {
  return ReplyDetectionService.checkAllRunningLeadsForReplies();
}

function createReplyDetectionTrigger() {
  return ReplyDetectionService.createReplyDetectionTrigger();
}

function deleteReplyDetectionTrigger() {
  return ReplyDetectionService.deleteReplyDetectionTrigger();
}