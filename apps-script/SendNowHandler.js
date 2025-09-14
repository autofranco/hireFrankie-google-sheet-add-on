/**
 * 立即發送處理器 - 處理 Send Now 功能相關邏輯
 */

const SendNowHandler = {
  
  /**
   * 處理 Send Now 點擊
   */
  handleSendNowClick(sheet, rowIndex) {
    try {
      // 獲取該行資料
      const row = this.getRowData(sheet, rowIndex);
      
      // 驗證行數據
      if (!this.validateRowForSendNow(row)) {
        return;
      }
      
      // 找出下一封待寄的信件
      const nextEmail = this.findNextEmailToSend(row, rowIndex);
      
      if (!nextEmail) {
        SpreadsheetApp.getUi().alert('沒有待發送的郵件');
        return;
      }
      
      // 立即發送郵件
      EmailService.sendImmediateEmail(
        row[COLUMNS.EMAIL],
        row[COLUMNS.FIRST_NAME],
        nextEmail.subject,
        nextEmail.content,
        rowIndex,
        nextEmail.type
      );
      
      console.log(`Send Now: 郵件已立即發送給 ${row[COLUMNS.FIRST_NAME]} (${row[COLUMNS.EMAIL]})`);
      
      // 檢查是否所有郵件都已發送完成
      this.checkAndUpdateStatusIfAllEmailsSent(sheet, rowIndex);
      
      // 提供用戶反饋
      SpreadsheetApp.getUi().alert('✅ 郵件發送成功', `已立即發送 ${nextEmail.type} 給 ${row[COLUMNS.FIRST_NAME]}`, SpreadsheetApp.getUi().ButtonSet.OK);
      
    } catch (error) {
      console.error('Send Now 點擊處理錯誤:', error);
      SpreadsheetApp.getUi().alert(`Send Now 錯誤: ${error.message}`);
    }
  },

  /**
   * 獲取行數據
   */
  getRowData(sheet, rowIndex) {
    const dataRange = sheet.getRange(rowIndex, 1, 1, Object.keys(COLUMNS).length);
    return dataRange.getValues()[0];
  },

  /**
   * 驗證行數據是否符合 Send Now 要求
   */
  validateRowForSendNow(row) {
    // 檢查必要欄位
    if (!row[COLUMNS.EMAIL] || !row[COLUMNS.FIRST_NAME]) {
      SpreadsheetApp.getUi().alert('該行缺少必要的 Email 或姓名資料');
      return false;
    }
    
    // 檢查狀態是否為 Running
    if (row[COLUMNS.STATUS] !== 'Running') {
      SpreadsheetApp.getUi().alert('只能對狀態為 "Running" 的行使用 Send Now 功能');
      return false;
    }
    
    return true;
  },

  /**
   * 找出下一封待寄的郵件
   */
  findNextEmailToSend(row, rowIndex) {
    // 檢查三封信的排程時間和內容
    const emails = [
      {
        type: 'mail1',
        schedule: row[COLUMNS.SCHEDULE_1],
        content: row[COLUMNS.FOLLOW_UP_1],
        subject: `Follow Up #1 - ${row[COLUMNS.FIRST_NAME]}`
      },
      {
        type: 'mail2', 
        schedule: row[COLUMNS.SCHEDULE_2],
        content: row[COLUMNS.FOLLOW_UP_2],
        subject: `Follow Up #2 - ${row[COLUMNS.FIRST_NAME]}`
      },
      {
        type: 'mail3',
        schedule: row[COLUMNS.SCHEDULE_3], 
        content: row[COLUMNS.FOLLOW_UP_3],
        subject: `Follow Up #3 - ${row[COLUMNS.FIRST_NAME]}`
      }
    ];
    
    // 找出第一封有內容但未發送的郵件
    for (const email of emails) {
      if (email.content && email.schedule) {
        // 檢查該排程時間欄位是否有刪除線（表示已發送）
        if (!this.isEmailSent(email.type, rowIndex)) {
          return email;
        }
      }
    }
    
    // 沒有找到待發送的郵件
    return null;
  },

  /**
   * 檢查郵件是否已發送（是否有刪除線）
   */
  isEmailSent(emailType, rowIndex) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    let scheduleColumnIndex;
    
    switch (emailType) {
      case 'mail1': scheduleColumnIndex = COLUMNS.SCHEDULE_1 + 1; break;
      case 'mail2': scheduleColumnIndex = COLUMNS.SCHEDULE_2 + 1; break;
      case 'mail3': scheduleColumnIndex = COLUMNS.SCHEDULE_3 + 1; break;
      default: return false;
    }
    
    const scheduleCell = sheet.getRange(rowIndex, scheduleColumnIndex);
    const fontLine = scheduleCell.getFontLine();
    
    // 如果有刪除線，表示已發送
    return fontLine === 'line-through';
  },

  /**
   * 檢查是否所有郵件都已發送，如果是則更新狀態為 Done
   */
  checkAndUpdateStatusIfAllEmailsSent(sheet, rowIndex) {
    try {
      // 檢查三個排程欄位是否都有刪除線
      const mail1Sent = this.isEmailSent('mail1', rowIndex);
      const mail2Sent = this.isEmailSent('mail2', rowIndex);
      const mail3Sent = this.isEmailSent('mail3', rowIndex);
      
      // 如果所有郵件都已發送（都有刪除線）
      if (mail1Sent && mail2Sent && mail3Sent) {
        SheetService.updateStatus(sheet, rowIndex, 'Done');
        SheetService.updateInfo(sheet, rowIndex, '全部郵件已手動發送完成');
        
        // 清除 Send Now 復選框
        SheetService.setupSendNowButton(sheet, rowIndex);
        
        console.log(`第 ${rowIndex} 行所有郵件已發送完成，狀態更新為 Done`);
      }
    } catch (error) {
      console.error(`檢查郵件發送狀態時發生錯誤 (第 ${rowIndex} 行):`, error);
    }
  }
};

// 全局函數包裝器
function handleSendNowClick(sheet, rowIndex) {
  return SendNowHandler.handleSendNowClick(sheet, rowIndex);
}

function checkAndUpdateStatusIfAllEmailsSent(sheet, rowIndex) {
  return SendNowHandler.checkAndUpdateStatusIfAllEmailsSent(sheet, rowIndex);
}

function findNextEmailToSend(row, rowIndex) {
  return SendNowHandler.findNextEmailToSend(row, rowIndex);
}