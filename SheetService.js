/**
 * 表格操作服务 - 处理所有 Google Sheets 相关操作
 */

const SheetService = {
  
  /**
   * 获取主要工作表
   */
  getMainSheet() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`找不到 ${SHEET_NAME}，请确认工作表名称正确。`);
    }
    return sheet;
  },

  /**
   * 设定表头
   */
  setupHeaders() {
    const sheet = this.getMainSheet();
    
    // 自動生成 Sheet 標題
    const timestamp = new Date();
    const title = `Auto Lead Warmer - ${timestamp.toLocaleDateString('zh-TW')} ${timestamp.toLocaleTimeString('zh-TW', {hour12: false})}`;
    SpreadsheetApp.getActiveSpreadsheet().rename(title);
    
    const headers = [
      'Email Address',
      'First Name', 
      'Context',
      'Leads Profile',
      '1st mail angle',
      '1st follow up mail',
      '1st mail schedule',
      '2nd mail angle',
      '2nd follow up mail',
      '2nd mail schedule',
      '3rd mail angle',
      '3rd follow up mail',
      '3rd mail schedule',
      'send now',
      'status',
      'info'
    ];
    
    // 设定表头
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
    
    // 同時設置用戶資訊工作表
    UserInfoService.getUserInfoSheet();
    
    SpreadsheetApp.getUi().alert(`設定完成！\n\n✅ 工作表已重新命名為: ${title}\n✅ User Info 工作表已創建\n\n💡 請到 "User Info" 工作表填入您的個人資訊，這會自動添加到所有郵件簽名中。`);
  },

  /**
   * 获取未处理的数据
   */
  getUnprocessedData(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { rows: [], startRow: 2 };
    }
    
    const dataRange = sheet.getRange(2, 1, lastRow - 1, Object.keys(COLUMNS).length);
    const data = dataRange.getValues();
    
    // 过滤未处理的数据 (status 為空白的)
    const unprocessedRows = [];
    const unprocessedRowIndexes = [];
    
    data.forEach((row, index) => {
      if (!row[COLUMNS.STATUS] && // status 為空白
          row[COLUMNS.EMAIL] && 
          row[COLUMNS.FIRST_NAME] && 
          row[COLUMNS.CONTEXT]) {
        unprocessedRows.push(row);
        unprocessedRowIndexes.push(index + 2); // +2 因為從第2行開始且index從0開始
      }
    });
    
    return {
      rows: unprocessedRows,
      startRow: 2,
      allData: data,
      rowIndexes: unprocessedRowIndexes
    };
  },

  /**
   * 更新信件切入点
   */
  updateMailAngles(sheet, rowIndex, mailAngles) {
    sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_1 + 1).setValue(mailAngles.angle1);
    sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_2 + 1).setValue(mailAngles.angle2);
    sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_3 + 1).setValue(mailAngles.angle3);
  },

  /**
   * 更新追踪信件
   */
  updateFollowUpMails(sheet, rowIndex, followUpMails) {
    sheet.getRange(rowIndex, COLUMNS.FOLLOW_UP_1 + 1).setValue(followUpMails.mail1);
    sheet.getRange(rowIndex, COLUMNS.FOLLOW_UP_2 + 1).setValue(followUpMails.mail2);
    sheet.getRange(rowIndex, COLUMNS.FOLLOW_UP_3 + 1).setValue(followUpMails.mail3);
  },

  /**
   * 更新排程时间
   */
  updateSchedules(sheet, rowIndex, schedules) {
    // 設定排程時間並確保沒有刪除線格式
    const schedule1Cell = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_1 + 1);
    schedule1Cell.setValue(Utils.formatScheduleTime(schedules.schedule1));
    schedule1Cell.setFontLine('none');
    
    const schedule2Cell = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_2 + 1);
    schedule2Cell.setValue(Utils.formatScheduleTime(schedules.schedule2));
    schedule2Cell.setFontLine('none');
    
    const schedule3Cell = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_3 + 1);
    schedule3Cell.setValue(Utils.formatScheduleTime(schedules.schedule3));
    schedule3Cell.setFontLine('none');
  },

  /**
   * 更新狀態
   */
  updateStatus(sheet, rowIndex, status) {
    sheet.getRange(rowIndex, COLUMNS.STATUS + 1).setValue(status);
  },

  /**
   * 更新詳細訊息
   */
  updateInfo(sheet, rowIndex, infoMessage) {
    sheet.getRange(rowIndex, COLUMNS.INFO + 1).setValue(infoMessage);
  },

  /**
   * 標記行為已處理 (更新為新的狀態系統)
   */
  markRowProcessed(sheet, rowIndex) {
    this.updateStatus(sheet, rowIndex, 'Running');
    this.updateInfo(sheet, rowIndex, '已完成內容生成並設定排程');
    
    // 當狀態變為 Running 時，設置 Send Now 按鈕
    this.setupSendNowButton(sheet, rowIndex);
  },

  /**
   * 標記行錯誤
   */
  markRowError(sheet, rowIndex, errorMessage) {
    this.updateInfo(sheet, rowIndex, `[Error] ${errorMessage}`);
  },

  /**
   * 設置 Send Now 復選框 (只在狀態為 Running 時顯示)
   */
  setupSendNowButton(sheet, rowIndex) {
    const statusCell = sheet.getRange(rowIndex, COLUMNS.STATUS + 1);
    const status = statusCell.getValue();
    
    const sendNowCell = sheet.getRange(rowIndex, COLUMNS.SEND_NOW + 1);
    
    if (status === 'Running') {
      // 設置復選框供用戶手動勾選
      sendNowCell.setValue(false); // 預設為未勾選
      sendNowCell.setBackground(null); // 透明背景
      sendNowCell.setFontColor('#000000'); // 黑色文字
      sendNowCell.setHorizontalAlignment('center');
      
      // 設置標準復選框
      const rule = SpreadsheetApp.newDataValidation()
        .requireCheckbox() // 標準 true/false 值
        .build();
      sendNowCell.setDataValidation(rule);
      
      console.log(`已設置第 ${rowIndex} 行的 Send Now 復選框`);
    } else {
      // 清除 Send Now 復選框
      sendNowCell.clearContent();
      sendNowCell.clearDataValidations();
      sendNowCell.setBackground(null);
      sendNowCell.setFontColor(null);
      sendNowCell.setFontWeight('normal');
    }
  },

  /**
   * 更新所有行的 Send Now 按鈕狀態
   */
  updateAllSendNowButtons(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;
    
    for (let i = 2; i <= lastRow; i++) {
      this.setupSendNowButton(sheet, i);
    }
  },

  /**
   * 設置狀態下拉選單
   */
  setupStatusDropdown(sheet, rowIndex) {
    const cell = sheet.getRange(rowIndex, COLUMNS.STATUS + 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['', 'Processing', 'Running', 'Done'], true)
      .build();
    cell.setDataValidation(rule);
  },

  /**
   * 更新排程状态（加上删除线）- 只在郵件發送完成後調用
   */
  updateScheduleStatus(rowIndex, scheduleType) {
    try {
      const sheet = this.getMainSheet();
      let columnIndex;
      
      switch (scheduleType) {
        case 'mail1':
          columnIndex = COLUMNS.SCHEDULE_1 + 1;
          break;
        case 'mail2':
          columnIndex = COLUMNS.SCHEDULE_2 + 1;
          break;
        case 'mail3':
          columnIndex = COLUMNS.SCHEDULE_3 + 1;
          break;
        default:
          return;
      }
      
      const cell = sheet.getRange(rowIndex, columnIndex);
      cell.setFontLine('line-through');
      
      console.log(`✅ 已為第 ${rowIndex} 行的 ${scheduleType} 添加刪除線 (郵件已發送)`);
      
    } catch (error) {
      console.error('更新排程状态时发生错误:', error);
    }
  }
};

// 全局函数包装器
function setupHeaders() {
  return SheetService.setupHeaders();
}