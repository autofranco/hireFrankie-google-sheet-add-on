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
      'Processed'
    ];
    
    // 设定表头
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
    
    SpreadsheetApp.getUi().alert('表头设定完成！');
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
    
    // 过滤未处理的数据
    const unprocessedRows = data.filter((row, index) => {
      return row[COLUMNS.PROCESSED] !== 'PROCESSED' && 
             row[COLUMNS.EMAIL] && 
             row[COLUMNS.FIRST_NAME] && 
             row[COLUMNS.CONTEXT];
    });
    
    return {
      rows: unprocessedRows,
      startRow: 2,
      allData: data
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
    sheet.getRange(rowIndex, COLUMNS.SCHEDULE_1 + 1).setValue(schedules.schedule1);
    sheet.getRange(rowIndex, COLUMNS.SCHEDULE_2 + 1).setValue(schedules.schedule2);
    sheet.getRange(rowIndex, COLUMNS.SCHEDULE_3 + 1).setValue(schedules.schedule3);
  },

  /**
   * 标记行为已处理
   */
  markRowProcessed(sheet, rowIndex) {
    sheet.getRange(rowIndex, COLUMNS.PROCESSED + 1).setValue('PROCESSED');
  },

  /**
   * 标记行错误
   */
  markRowError(sheet, rowIndex, errorMessage) {
    sheet.getRange(rowIndex, COLUMNS.PROCESSED + 1).setValue(`错误: ${errorMessage}`);
  },

  /**
   * 更新排程状态（加上删除线）
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
      
    } catch (error) {
      console.error('更新排程状态时发生错误:', error);
    }
  }
};

// 全局函数包装器
function setupHeaders() {
  return SheetService.setupHeaders();
}