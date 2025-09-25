/**
 * 表格操作服务 - 处理所有 Google Sheets 相关操作
 */

const SheetService = {
  
  /**
   * 獲取主要工作表
   * 獲取指定名稱的主要 Google Sheets 工作表
   * 
   * @function getMainSheet
   * @returns {GoogleAppsScript.Spreadsheet.Sheet} 主要工作表物件
   * @throws {Error} 當找不到指定名稱的工作表時
   */
  getMainSheet() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`找不到 ${SHEET_NAME}，請確認工作表名稱正確。`);
    }
    return sheet;
  },

  /**
   * 設定表頭
   * 初始化工作表的標題行、格式和欄寶，並自動創建 Firebase 用戶
   * 
   * @function setupHeaders
   * @returns {Promise<void>}
   */
  async setupHeaders() {
    const sheet = this.getMainSheet();
    
    // 在現有名稱後面加上 Auto Lead Warmer 標識和時間戳（避免覆蓋原名稱）
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const currentTitle = spreadsheet.getName();
    
    // 只有在尚未包含 Auto Lead Warmer 時才添加
    let finalTitle = currentTitle;
    if (!currentTitle.includes('Auto Lead Warmer')) {
      const timestamp = new Date();
      const dateStr = `${(timestamp.getMonth() + 1).toString().padStart(2, '0')}/${timestamp.getDate().toString().padStart(2, '0')}`;
      const timeStr = timestamp.toLocaleTimeString('zh-TW', {hour12: false, hour: '2-digit', minute: '2-digit'});
      finalTitle = `${currentTitle} - Auto Lead Warmer (${dateStr} ${timeStr})`;
      spreadsheet.rename(finalTitle);
    }
    
    const headers = [
      'Email Address*',
      'First Name*', 
      'Company url*',
      'Position*',
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
    
    // 設定特定表頭的字體顏色為灰色 #949494
    const grayHeaders = [
      'Leads Profile',     // column 5 (E)
      '1st mail angle',    // column 6 (F) 
      '1st follow up mail', // column 7 (G)
      '1st mail schedule', // column 8 (H)
      '2nd mail angle',    // column 9 (I)
      '2nd follow up mail', // column 10 (J)
      '2nd mail schedule', // column 11 (K)
      '3rd mail angle',    // column 12 (L)
      '3rd follow up mail', // column 13 (M)
      '3rd mail schedule', // column 14 (N)
      'send now',          // column 15 (O)
      'status',            // column 16 (P)
      'info'               // column 17 (Q)
    ];
    
    grayHeaders.forEach((headerText) => {
      const columnIndex = headers.indexOf(headerText) + 1;
      if (columnIndex > 0) {
        sheet.getRange(1, columnIndex).setFontColor('#949494');
      }
    });
    
    // 凍結第一行（標題行）
    sheet.setFrozenRows(1);
    
    // 設定列寬
    this.setupColumnWidths(sheet);

    // 設置狀態欄位的下拉選單和顏色格式
    this.setupStatusColumnFormatting(sheet);

    // 同時設置用戶資訊工作表
    UserInfoService.getUserInfoSheet();
    
    // 初始化用戶到 Firebase
    try {
      console.log('🔄 正在初始化 Firebase 用戶...');
      const userResult = await APIService.createUser({
        displayName: Session.getActiveUser().getEmail().split('@')[0]
      });
      
      if (userResult && userResult.email) {
        const statusText = userResult.paymentStatus === 'paid' ? '✅ 已付費' : '⚠️ 未付費';
        console.log(`✅ Firebase 用戶初始化成功! 狀態: ${statusText}`);
      }
      
    } catch (error) {
      console.error('❌ Firebase 用戶初始化失敗:', error);
      // 不中斷設定流程，只記錄錯誤
    }
    
    SpreadsheetApp.getUi().alert(`設定完成！\n\n✅ 工作表已重新命名為: ${finalTitle}\n✅ User Info 工作表已創建\n✅ Firebase 用戶已初始化\n✅ 列寬已設定\n\n💡 重要提醒：\n• 請到 "User Info" 工作表填入您的個人資訊\n• 請在 "Seminar Info" 欄位填寫研習活動資訊\n• 系統會自動生成 "Seminar Brief" 供所有潛客分析使用\n• 個人資訊會自動添加到所有郵件簽名中`);
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
      if ((!row[COLUMNS.STATUS] || row[COLUMNS.STATUS] === 'Processing') && // status 為空白或 Processing
          row[COLUMNS.EMAIL] &&
          row[COLUMNS.FIRST_NAME] &&
          row[COLUMNS.COMPANY_URL] &&
          row[COLUMNS.POSITION]) {
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
    this.applyStatusColor(sheet, rowIndex);
  },

  /**
   * 更新詳細訊息
   */
  updateInfo(sheet, rowIndex, infoMessage) {
    sheet.getRange(rowIndex, COLUMNS.INFO + 1).setValue(infoMessage);
    this.updateInfoColor(sheet, rowIndex, infoMessage);
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
   * 設定列寬
   */
  setupColumnWidths(sheet) {
    try {
      console.log('設定列寬...');
      
      // Email Address: 110px (column A)
      sheet.setColumnWidth(1, 110);
      
      // First Name: 80px (column B) 
      sheet.setColumnWidth(2, 80);
      
      // Company url: 95px (column C)
      sheet.setColumnWidth(3, 95);
      
      // Position: 70px (column D)
      sheet.setColumnWidth(4, 70);
      
      // Leads Profile: 200px (column E)
      sheet.setColumnWidth(5, 200);
      
      // 1st mail angle: 150px (column F)
      sheet.setColumnWidth(6, 150);
      
      // 1st follow up mail: 150px (column G)
      sheet.setColumnWidth(7, 150);
      
      // 1st mail schedule: 75px (column H)
      sheet.setColumnWidth(8, 75);
      
      // 2nd mail angle: 150px (column I)
      sheet.setColumnWidth(9, 150);
      
      // 2nd follow up mail: 150px (column J)
      sheet.setColumnWidth(10, 150);
      
      // 2nd mail schedule: 75px (column K)
      sheet.setColumnWidth(11, 75);
      
      // 3rd mail angle: 150px (column L)
      sheet.setColumnWidth(12, 150);
      
      // 3rd follow up mail: 150px (column M)
      sheet.setColumnWidth(13, 150);
      
      // 3rd mail schedule: 75px (column N)
      sheet.setColumnWidth(14, 75);
      
      // send now: 70px (column O)
      sheet.setColumnWidth(15, 70);
      
      // status: 70px (column P)
      sheet.setColumnWidth(16, 70);
      
      // info: 200px (column Q)  
      sheet.setColumnWidth(17, 200);
      
      // 強制刷新以確保更改立即生效
      SpreadsheetApp.flush();
      console.log('列寬設定完成並已刷新');
    } catch (error) {
      console.error('設定列寬時發生錯誤:', error);
    }
  },

  /**
   * 格式化所有潛在客戶行（手動觸發）- 使用 Sheets API
   */
  formatAllLeadRows() {
    try {
      const sheet = this.getMainSheet();
      const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
      const sheetId = sheet.getSheetId();
      const lastRow = sheet.getLastRow();
      let formattedCount = 0;
      
      console.log('開始格式化所有潛在客戶行...');
      
      // 先設定列寬
      this.setupColumnWidths(sheet);
      
      // 準備 API 請求
      const requests = [];
      
      // 格式化每一行（跳過標題行）
      for (let rowIndex = 2; rowIndex <= lastRow; rowIndex++) {
        const status = sheet.getRange(rowIndex, COLUMNS.STATUS + 1).getValue();
        
        // 只格式化有狀態的行（已處理的潛在客戶）
        if (status && status !== '') {
          // 使用 Sheets API 設定行高
          requests.push({
            "updateDimensionProperties": {
              "range": {
                "sheetId": sheetId,
                "dimension": "ROWS",
                "startIndex": rowIndex - 1,
                "endIndex": rowIndex
              },
              "properties": {
                "pixelSize": 200
              },
              "fields": "pixelSize"
            }
          });
          
          // 只為 mail angle 欄位設置文字換行（但維持固定200px高度）
          const mailAngleColumns = [COLUMNS.MAIL_ANGLE_1 + 1, COLUMNS.MAIL_ANGLE_2 + 1, COLUMNS.MAIL_ANGLE_3 + 1];
          mailAngleColumns.forEach(col => {
            const cell = sheet.getRange(rowIndex, col);
            cell.setWrap(true);
          });

          // 設置狀態下拉選單和顏色
          this.setupStatusDropdown(sheet, rowIndex);

          formattedCount++;
        }
      }
      
      // 執行 API 請求
      if (requests.length > 0) {
        const resource = {
          requests: requests
        };
        
        Sheets.Spreadsheets.batchUpdate(resource, spreadsheetId);
        console.log(`已透過 API 設定 ${requests.length} 行高度`);
      }
      
      // 強制刷新
      SpreadsheetApp.flush();
      
      const message = `✅ 格式化完成！\n\n已格式化 ${formattedCount} 行潛在客戶資料\n• 使用 Sheets API 設定行高為 200px\n• 列寬已調整\n• Mail Angle 欄位已啟用文字換行（固定高度）`;
      SpreadsheetApp.getUi().alert('格式化完成', message, SpreadsheetApp.getUi().ButtonSet.OK);
      
      console.log(`格式化完成: ${formattedCount} 行`);
      
    } catch (error) {
      console.error('格式化時發生錯誤:', error);
      SpreadsheetApp.getUi().alert('格式化失敗', `錯誤: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  },

  /**
   * 標記行錯誤
   */
  markRowError(sheet, rowIndex, errorMessage) {
    this.updateInfo(sheet, rowIndex, `[Error] ${errorMessage}`);
  },

  /**
   * 設置 Send Now 復選框 (根據狀態和郵件發送情況決定顯示)
   */
  setupSendNowButton(sheet, rowIndex) {
    const statusCell = sheet.getRange(rowIndex, COLUMNS.STATUS + 1);
    const status = statusCell.getValue();
    const sendNowCell = sheet.getRange(rowIndex, COLUMNS.SEND_NOW + 1);

    // 檢查是否所有郵件都已發送
    const allEmailsSent = this.areAllEmailsSent(sheet, rowIndex);

    if (status === 'Running' && !allEmailsSent) {
      // 狀態為 Running 且還有郵件未發送：設置復選框
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
      // 清除 Send Now 復選框（狀態非 Running 或所有郵件已發送）
      sendNowCell.clearContent();
      sendNowCell.clearDataValidations();
      sendNowCell.setBackground(null);
      sendNowCell.setFontColor(null);
      sendNowCell.setFontWeight('normal');

      if (allEmailsSent) {
        console.log(`第 ${rowIndex} 行所有郵件已發送，清除 Send Now 按鈕`);
      } else if (status !== 'Running') {
        console.log(`第 ${rowIndex} 行狀態為 ${status}，清除 Send Now 按鈕`);
      }
    }
  },

  /**
   * 檢查是否所有郵件都已發送（通過檢查排程欄位是否有刪除線）
   */
  areAllEmailsSent(sheet, rowIndex) {
    const schedule1 = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_1 + 1);
    const schedule2 = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_2 + 1);
    const schedule3 = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_3 + 1);

    const email1Sent = schedule1.getFontLine() === 'line-through';
    const email2Sent = schedule2.getFontLine() === 'line-through';
    const email3Sent = schedule3.getFontLine() === 'line-through';

    return email1Sent && email2Sent && email3Sent;
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

    // 設置狀態顏色
    this.applyStatusColor(sheet, rowIndex);
  },

  /**
   * 設置狀態欄位的格式化（下拉選單和顏色）
   */
  setupStatusColumnFormatting(sheet) {
    try {
      const lastRow = sheet.getLastRow();

      // 如果只有表頭，設置一些預設行
      const endRow = Math.max(lastRow, 10);

      // 為整個狀態欄位設置下拉選單
      const statusRange = sheet.getRange(2, COLUMNS.STATUS + 1, endRow - 1, 1);
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['', 'Processing', 'Running', 'Done'], true)
        .build();
      statusRange.setDataValidation(rule);

      // 為現有行設置顏色
      for (let i = 2; i <= lastRow; i++) {
        this.applyStatusColor(sheet, i);
      }

      console.log(`已設置狀態欄位格式 (第2-${endRow}行)`);

    } catch (error) {
      console.error('設置狀態欄位格式時發生錯誤:', error);
    }
  },

  /**
   * 根據狀態值應用顏色
   */
  applyStatusColor(sheet, rowIndex) {
    const cell = sheet.getRange(rowIndex, COLUMNS.STATUS + 1);
    const status = cell.getValue();

    switch (status) {
      case 'Running':
        cell.setBackground('#f0f0f0'); // 淺灰色
        cell.setFontColor('#666666'); // 深灰色字體
        break;
      case 'Processing':
      case 'Done':
        cell.setBackground(null); // 無背景色
        cell.setFontColor(null); // 預設字體顏色
        break;
      default:
        cell.setBackground(null); // 透明背景
        cell.setFontColor(null); // 預設字體顏色
        break;
    }
  },

  /**
   * 更新Info欄位顏色
   * 根據訊息內容自動套用對應的背景顏色
   *
   * @function updateInfoColor
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 工作表物件
   * @param {number} rowIndex - 行索引
   * @param {string} infoMessage - info訊息內容
   */
  updateInfoColor(sheet, rowIndex, infoMessage) {
    const cell = sheet.getRange(rowIndex, COLUMNS.INFO + 1);
    const message = infoMessage.toLowerCase();

    if (message.includes('bounced') || message.includes('退信')) {
      cell.setBackground('#ffebee'); // 淺紅色 - 退信
      cell.setFontColor('#c62828'); // 深紅色字體
    } else if (message.includes('已開信') || message.includes('開信')) {
      cell.setBackground('#e8f5e8'); // 淺綠色 - 開信
      cell.setFontColor('#2e7d32'); // 深綠色字體
    } else if (message.includes('已回信') || message.includes('回信')) {
      cell.setBackground('#e3f2fd'); // 淺藍色 - 回信
      cell.setFontColor('#1565c0'); // 深藍色字體
    } else {
      cell.setBackground(null); // 無背景色
      cell.setFontColor(null); // 預設字體顏色
    }
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

      // 檢查是否所有郵件都已發送，如果是則清除 Send Now 按鈕
      this.setupSendNowButton(sheet, rowIndex);

    } catch (error) {
      console.error('更新排程状态时发生错误:', error);
    }
  },

  /**
   * 驗證單個儲存格的字符長度
   * 在編輯事件發生時驗證特定儲存格
   *
   * @param {Object} e - onEdit 事件物件
   * @returns {boolean} 驗證是否通過
   */
  validateCellCharacterLimit(e) {
    try {
      const range = e.range;
      const sheet = range.getSheet();
      const row = range.getRow();
      const col = range.getColumn();
      const value = e.value || '';

      // 跳過標題行
      if (row === 1) return true;

      let limit = null;
      let fieldName = '';

      // 檢查是否是主要工作表
      if (sheet.getName() === SHEET_NAME) {
        // 檢查主要工作表的欄位
        if (col === COLUMNS.FIRST_NAME + 1) {
          limit = CHARACTER_LIMITS.FIRST_NAME;
          fieldName = 'First Name';
        } else if (col === COLUMNS.POSITION + 1) {
          limit = CHARACTER_LIMITS.POSITION;
          fieldName = 'Position';
        } else if (col === COLUMNS.COMPANY_URL + 1) {
          limit = CHARACTER_LIMITS.COMPANY_URL;
          fieldName = 'Company URL';
        }
      } else if (sheet.getName() === USER_INFO_SHEET_NAME) {
        // 檢查用戶資訊工作表的欄位
        if (row === USER_INFO_FIELDS.SEMINAR_INFO.row && col === USER_INFO_FIELDS.SEMINAR_INFO.col) {
          limit = CHARACTER_LIMITS.SEMINAR_INFO;
          fieldName = 'Seminar Info';
        } else if (row === USER_INFO_FIELDS.SEMINAR_BRIEF.row && col === USER_INFO_FIELDS.SEMINAR_BRIEF.col) {
          limit = CHARACTER_LIMITS.SEMINAR_BRIEF;
          fieldName = 'Seminar Brief';
        } else if (row === USER_INFO_FIELDS.EMAIL1_PROMPT.row && col === USER_INFO_FIELDS.EMAIL1_PROMPT.col) {
          limit = CHARACTER_LIMITS.EMAIL1_PROMPT;
          fieldName = 'Email 1 Prompt';
        } else if (row === USER_INFO_FIELDS.EMAIL2_PROMPT.row && col === USER_INFO_FIELDS.EMAIL2_PROMPT.col) {
          limit = CHARACTER_LIMITS.EMAIL2_PROMPT;
          fieldName = 'Email 2 Prompt';
        } else if (row === USER_INFO_FIELDS.EMAIL3_PROMPT.row && col === USER_INFO_FIELDS.EMAIL3_PROMPT.col) {
          limit = CHARACTER_LIMITS.EMAIL3_PROMPT;
          fieldName = 'Email 3 Prompt';
        }
      }

      // 如果有字符限制，進行驗證
      if (limit !== null && value && typeof value === 'string') {
        const validation = Utils.validateCharacterLimit(value, limit, fieldName);

        if (!validation.isValid) {
          // 顯示錯誤消息
          SpreadsheetApp.getUi().alert(
            '字符限制超出',
            validation.error + '\n\n系統將自動截斷內容到允許的長度。',
            SpreadsheetApp.getUi().ButtonSet.OK
          );

          // 截斷內容到允許的長度
          const truncatedValue = value.substring(0, limit);
          range.setValue(truncatedValue);

          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('驗證儲存格字符限制時發生錯誤:', error);
      return true; // 發生錯誤時允許通過，避免阻斷用戶操作
    }
  }
};

// 全局函数包装器
async function setupHeaders() {
  return await SheetService.setupHeaders();
}

/**
 * 格式化所有潛在客戶行（全域函數）
 */
function formatAllLeadRows() {
  return SheetService.formatAllLeadRows();
}