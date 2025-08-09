/**
 * 回覆檢測服務 - 檢測潛在客戶是否回信
 */

const ReplyDetectionService = {
  
  /**
   * 檢查特定郵件地址是否有回覆
   */
  checkForReplies(email, sinceDate) {
    try {
      console.log(`檢查 ${email} 的回覆，從 ${sinceDate} 開始`);
      
      // 使用 Gmail API 搜尋來自該郵件地址的訊息
      const query = `from:${email} after:${this.formatDateForGmail(sinceDate)}`;
      const threads = GmailApp.search(query, 0, 50);
      
      console.log(`找到 ${threads.length} 個對話串`);
      
      if (threads.length > 0) {
        // 檢查是否有新的回覆（不是我們發送的）
        for (const thread of threads) {
          const messages = thread.getMessages();
          
          for (const message of messages) {
            const messageDate = message.getDate();
            const sender = message.getFrom();
            const myEmail = Session.getActiveUser().getEmail();
            
            // 如果訊息是在指定日期之後，且不是我們發送的
            if (messageDate >= sinceDate && !sender.includes(myEmail)) {
              console.log(`發現回覆: ${sender} 於 ${messageDate}`);
              return {
                hasReply: true,
                replyDate: messageDate,
                sender: sender,
                subject: message.getSubject()
              };
            }
          }
        }
      }
      
      return { hasReply: false };
      
    } catch (error) {
      console.error(`檢查回覆時發生錯誤 (${email}):`, error);
      return { hasReply: false, error: error.message };
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
        
        // 只檢查 Running 狀態的行
        if (status === 'Running') {
          const email = sheet.getRange(i, COLUMNS.EMAIL + 1).getValue();
          const firstName = sheet.getRange(i, COLUMNS.FIRST_NAME + 1).getValue();
          
          if (email && firstName) {
            checkedCount++;
            
            // 檢查從昨天開始的回覆
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            
            const replyResult = this.checkForReplies(email, yesterdayDate);
            
            if (replyResult.hasReply) {
              repliesFound++;
              
              // 更新狀態為 Done
              SheetService.updateStatus(sheet, i, 'Done');
              SheetService.updateInfo(sheet, i, `潛客已回信 (${replyResult.replyDate.toLocaleString('zh-TW')})`);
              
              // 清理該潛客的排程資料
              this.cleanupLeadScheduleData(email, i);
              
              console.log(`✅ 發現回覆: ${firstName} (${email}) - 已停止後續郵件`);
            }
          }
        }
      }
      
      console.log(`=== 回覆檢查完成 ===`);
      console.log(`檢查了 ${checkedCount} 個潛在客戶，發現 ${repliesFound} 個回覆`);
      
      return { checked: checkedCount, repliesFound: repliesFound };
      
    } catch (error) {
      console.error('批量檢查回覆時發生錯誤:', error);
      return { error: error.message };
    }
  },

  /**
   * 清理已回覆潛客的排程資料
   */
  cleanupLeadScheduleData(email, rowIndex) {
    try {
      // 清理 PropertiesService 中的正式模式資料
      const properties = PropertiesService.getScriptProperties().getProperties();
      
      for (const key of Object.keys(properties)) {
        if (key.startsWith('production_email_') && key.includes(email.replace(/[^a-zA-Z0-9]/g, '_'))) {
          PropertiesService.getScriptProperties().deleteProperty(key);
          console.log(`清理排程資料: ${key}`);
        }
      }
      
      // 清理舊版本的個別觸發器資料
      for (const key of Object.keys(properties)) {
        if (key.startsWith('email_') && key.includes(email)) {
          PropertiesService.getScriptProperties().deleteProperty(key);
          console.log(`清理舊版排程資料: ${key}`);
        }
      }
      
    } catch (error) {
      console.error(`清理排程資料時發生錯誤 (${email}):`, error);
    }
  },

  /**
   * 創建回覆檢測觸發器（每小時執行一次）
   */
  createReplyDetectionTrigger() {
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
    } else {
      console.log('回覆檢測觸發器已存在');
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