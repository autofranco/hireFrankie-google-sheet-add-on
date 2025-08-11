/**
 * 主入口文件 - 处理用户界面和主要流程控制
 * @OnlyCurrentDoc
 * 
 * 必要权限：
 * - https://www.googleapis.com/auth/script.external_request
 * - https://www.googleapis.com/auth/gmail.send 
 * - https://www.googleapis.com/auth/spreadsheets
 */

/**
 * 当 Google Sheets 开启时，建立自订选单
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('Auto Lead Warmer')
    .addItem('🚀 Run', 'runAutoLeadWarmer')
    .addItem('📧 Send Now', 'sendNowFromMenu')
    .addItem('🛑 Stop All', 'stopAllProcesses')
    .addSeparator()
    .addItem('⚙️ Setup Headers', 'setupHeaders')
    .addSeparator()
    .addItem('🔗 Test API Connection', 'testAPIConnection')
    .addItem('🌐 Test Network', 'testNetworkConnection')
    .addSeparator()
    .addSubMenu(ui.createMenu('🔧 Debug Tools')
      .addItem('Test Full Process', 'testFullContentGeneration')
      .addItem('Test Mail Angles Only', 'testMailAnglesGeneration')
      .addItem('Test Raw API Call', 'testRawAPICall')
      .addItem('Check Sheet Data', 'checkSheetData')
      .addItem('Reset Test Data', 'resetTestData')
      .addSeparator()
      .addItem('🧪 Test Send Now Manually', 'testSendNowManually')
      .addSeparator()
      .addItem('📧 Test Global Email Check', 'testGlobalEmailCheckManually')
      .addItem('📬 Test Reply Detection', 'testReplyDetectionManually')
      .addItem('🔄 Recreate Global Trigger', 'recreateGlobalTrigger')
      .addItem('Show Trigger Stats', 'showTriggerStats')
      .addItem('🗑️ Delete All Triggers', 'deleteAllTriggersMenu'))
    .addToUi();
}

/**
 * 當儲存格編輯時觸發 - 處理狀態變更和 Send Now 按鈕
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    // 只處理主要工作表
    if (sheet.getName() !== SHEET_NAME) {
      return;
    }
    
    // 只處理資料行（非表頭）
    if (range.getRow() <= 1) {
      return;
    }
    
    const rowIndex = range.getRow();
    const col = range.getColumn();
    
    // 當狀態欄位被修改時，更新 Send Now 按鈕
    if (col === COLUMNS.STATUS + 1) {
      SheetService.setupSendNowButton(sheet, rowIndex);
      
      // 處理狀態改為 Done 的情況（手動停止）
      if (e.value === 'Done') {
        SheetService.updateInfo(sheet, rowIndex, '手動停止後續信件寄送');
      }
    }
    
    // Send Now 現在透過選單處理，不依賴 onEdit 觸發器
    
  } catch (error) {
    console.error('onEdit 觸發錯誤:', error);
  }
}

/**
 * 主要执行函数
 */
function runAutoLeadWarmer() {
  try {
    console.log('=== 开始执行 Auto Lead Warmer ===');
    
    // 清理舊的多餘觸發器，避免觸發器過多錯誤
    const deletedTriggerCount = TriggerManager.cleanupOldTriggers();
    
    if (deletedTriggerCount > 0) {
      console.log(`已刪除 ${deletedTriggerCount} 個舊觸發器，等待2秒後創建新觸發器...`);
      Utilities.sleep(2000); // 等待刪除操作完成
    }
    
    // 創建必要的觸發器（只在主流程中創建一次）
    try {
      TriggerManager.createGlobalEmailTrigger();
    } catch (error) {
      console.error('全域觸發器創建失敗，但繼續執行:', error);
      // 觸發器創建失敗不應該阻止主流程繼續
    }
    
    Utilities.sleep(1000); // 等待1秒避免衝突
    
    try {
      TriggerManager.createReplyDetectionTrigger();
    } catch (error) {
      console.error('回覆檢測觸發器創建失敗，但繼續執行:', error);
    }
    
    Utilities.sleep(1000); // 等待1秒避免衝突
    
    // onEdit 是 Google Sheets 內建的 simple trigger，無需手動創建
    
    const sheet = SheetService.getMainSheet();
    const data = SheetService.getUnprocessedData(sheet);
    
    if (data.rows.length === 0) {
      SpreadsheetApp.getUi().alert('没有数据需要处理。\n\n请确保：\n1. 已设置表头\n2. 已填入客户数据\n3. 数据未被标记为已处理');
      return;
    }
    
    console.log(`找到 ${data.rows.length} 行待处理数据`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const rowIndex = data.rowIndexes[i]; // 使用正確的行索引
      
      try {
        console.log(`--- 处理第 ${i + 1}/${data.rows.length} 行 (Sheet行号: ${rowIndex}) ---`);
        
        // 立即更新狀態為 Processing
        SheetService.updateStatus(sheet, rowIndex, 'Processing');
        
        // 处理单行数据
        const success = processRow(sheet, row, rowIndex);
        if (success) {
          processedCount++;
          console.log(`第 ${rowIndex} 行处理成功`);
        }
        
        // 每处理5行休息一下，避免API限制
        if ((i + 1) % 5 === 0) {
          console.log('休息2秒避免API限制...');
          Utilities.sleep(2000);
        }
        
      } catch (error) {
        console.error(`处理第 ${rowIndex} 行时发生错误:`, error);
        SheetService.markRowError(sheet, rowIndex, error.message);
        errorCount++;
      }
    }
    
    const message = `处理完成！
    
✅ 成功处理: ${processedCount} 笔
❌ 处理失败: ${errorCount} 笔
📧 已设置 ${processedCount * 3} 个邮件发送排程

${errorCount > 0 ? '\n请检查错误行的详细信息。' : ''}`;
    
    SpreadsheetApp.getUi().alert('执行完成', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('执行错误:', error);
    SpreadsheetApp.getUi().alert('执行错误', `发生未预期的错误: ${error.message}\n\n请检查：\n1. API Key是否正确\n2. 网络连接是否正常\n3. 工作表格式是否正确`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 处理单行数据
 */
function processRow(sheet, row, rowIndex) {
  // 检查必要栏位
  if (!row[COLUMNS.EMAIL] || !row[COLUMNS.FIRST_NAME] || !row[COLUMNS.CONTEXT]) {
    console.log(`第 ${rowIndex} 行跳过：缺少必要字段`);
    return false;
  }
  
  console.log(`处理客户: ${row[COLUMNS.FIRST_NAME]} (${row[COLUMNS.EMAIL]})`);
  
  try {
    // 設置狀態下拉選單
    SheetService.setupStatusDropdown(sheet, rowIndex);
    
    // 1. 生成潜在客户画像 - 逐步填入
    console.log('步骤1: 生成客户画像...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成客戶畫像...');
    SpreadsheetApp.flush(); // 立即顯示更新
    
    const leadsProfile = ContentGenerator.generateLeadsProfile(
      row[COLUMNS.CONTEXT], 
      row[COLUMNS.FIRST_NAME]
    );
    
    if (!leadsProfile || leadsProfile.length < 50) {
      throw new Error('客户画像生成失败或内容过短');
    }
    
    // 立即填入客戶畫像
    sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).setValue(leadsProfile);
    SheetService.updateInfo(sheet, rowIndex, '✅ 客戶畫像已生成');
    SpreadsheetApp.flush();
    console.log(`客户画像生成成功 (${leadsProfile.length} 字符)`);
    
    // 2. 生成第1個信件切入点
    console.log('步骤2: 生成第1個邮件切入点...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成第1個郵件切入點...');
    SpreadsheetApp.flush();
    
    const mailAngles = ContentGenerator.generateMailAngles(
      leadsProfile, 
      row[COLUMNS.FIRST_NAME]
    );
    
    // 验证切入点是否成功生成
    if (mailAngles.angle1.includes('切入点1：解决客户痛点的方案') ||
        mailAngles.angle2.includes('切入点2：展示获利机会') ||
        mailAngles.angle3.includes('切入点3：建立信任关系')) {
      throw new Error('邮件切入点生成失败，返回了默认值');
    }
    
    // 逐個填入切入點
    sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_1 + 1).setValue(mailAngles.angle1);
    SheetService.updateInfo(sheet, rowIndex, '✅ 第1個郵件切入點已生成');
    SpreadsheetApp.flush();
    
    console.log('步骤3: 生成第2個邮件切入点...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成第2個郵件切入點...');
    SpreadsheetApp.flush();
    
    sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_2 + 1).setValue(mailAngles.angle2);
    SheetService.updateInfo(sheet, rowIndex, '✅ 第2個郵件切入點已生成');
    SpreadsheetApp.flush();
    
    console.log('步骤4: 生成第3個邮件切入点...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成第3個郵件切入點...');
    SpreadsheetApp.flush();
    
    sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_3 + 1).setValue(mailAngles.angle3);
    SheetService.updateInfo(sheet, rowIndex, '✅ 所有郵件切入點已生成');
    SpreadsheetApp.flush();
    
    // 3. 生成第1封追踪信件
    console.log('步骤5: 生成第1封追踪邮件...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成第1封追蹤郵件...');
    SpreadsheetApp.flush();
    
    const followUpMails = ContentGenerator.generateFollowUpMails(
      leadsProfile, 
      mailAngles, 
      row[COLUMNS.FIRST_NAME]
    );
    
    // 验证邮件是否成功生成
    if (followUpMails.mail1.includes('生成第一封邮件失败') ||
        followUpMails.mail2.includes('生成第二封邮件失败') ||
        followUpMails.mail3.includes('生成第三封邮件失败')) {
      throw new Error('追踪邮件生成失败');
    }
    
    // 逐封填入郵件內容
    sheet.getRange(rowIndex, COLUMNS.FOLLOW_UP_1 + 1).setValue(followUpMails.mail1);
    SheetService.updateInfo(sheet, rowIndex, '✅ 第1封追蹤郵件已生成');
    SpreadsheetApp.flush();
    
    console.log('步骤6: 生成第2封追踪邮件...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成第2封追蹤郵件...');
    SpreadsheetApp.flush();
    
    sheet.getRange(rowIndex, COLUMNS.FOLLOW_UP_2 + 1).setValue(followUpMails.mail2);
    SheetService.updateInfo(sheet, rowIndex, '✅ 第2封追蹤郵件已生成');
    SpreadsheetApp.flush();
    
    console.log('步骤7: 生成第3封追踪邮件...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成第3封追蹤郵件...');
    SpreadsheetApp.flush();
    
    sheet.getRange(rowIndex, COLUMNS.FOLLOW_UP_3 + 1).setValue(followUpMails.mail3);
    SheetService.updateInfo(sheet, rowIndex, '✅ 第3封追蹤郵件已生成');
    SpreadsheetApp.flush();
    
    // 4. 设定排程时间
    console.log('步骤8: 设定排程时间...');
    SheetService.updateInfo(sheet, rowIndex, '正在設定郵件排程時間...');
    SpreadsheetApp.flush();
    
    const schedules = Utils.generateScheduleTimes();
    
    // 逐個填入排程時間 Date 物件，確保沒有刪除線
    const schedule1Cell = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_1 + 1);
    schedule1Cell.setValue(schedules.schedule1); // 直接存 Date 物件
    schedule1Cell.setFontLine('none'); // 確保沒有刪除線
    
    const schedule2Cell = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_2 + 1);
    schedule2Cell.setValue(schedules.schedule2); // 直接存 Date 物件
    schedule2Cell.setFontLine('none'); // 確保沒有刪除線
    
    const schedule3Cell = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_3 + 1);
    schedule3Cell.setValue(schedules.schedule3); // 直接存 Date 物件
    schedule3Cell.setFontLine('none'); // 確保沒有刪除線
    
    SheetService.updateInfo(sheet, rowIndex, '✅ 排程時間已設定');
    SpreadsheetApp.flush();
    console.log('排程时间设定成功');
    
    // 5. 设定邮件发送触发器
    console.log('步骤9: 设定邮件发送触发器...');
    SheetService.updateInfo(sheet, rowIndex, '正在設定郵件發送排程...');
    SpreadsheetApp.flush();
    
    EmailService.scheduleEmails(
      row[COLUMNS.EMAIL], 
      row[COLUMNS.FIRST_NAME], 
      followUpMails, 
      schedules, 
      rowIndex
    );
    
    // 6. 标记为已处理並設置 Send Now 按鈕
    SheetService.markRowProcessed(sheet, rowIndex);
    
    SheetService.updateInfo(sheet, rowIndex, '🎉 完成！已設定所有郵件排程');
    SpreadsheetApp.flush();
    console.log('邮件发送触发器设定成功');
    
    return true;
    
  } catch (error) {
    console.error(`处理第 ${rowIndex} 行失败:`, error);
    throw error;
  }
}

/**
 * 批量处理模式（可选）
 */
function runAutoLeadWarmerBatch() {
  try {
    const sheet = SheetService.getMainSheet();
    const data = SheetService.getUnprocessedData(sheet);
    
    if (data.rows.length === 0) {
      SpreadsheetApp.getUi().alert('没有数据需要处理。');
      return;
    }
    
    // 分批处理，每批5行
    const batchSize = 5;
    let totalProcessed = 0;
    
    for (let start = 0; start < data.rows.length; start += batchSize) {
      const end = Math.min(start + batchSize, data.rows.length);
      const batch = data.rows.slice(start, end);
      
      console.log(`处理批次 ${Math.floor(start/batchSize) + 1}: 第 ${start + 1}-${end} 行`);
      
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowIndex = data.startRow + start + i;
        
        try {
          const success = processRow(sheet, row, rowIndex);
          if (success) totalProcessed++;
        } catch (error) {
          console.error(`批次处理中第 ${rowIndex} 行失败:`, error);
          SheetService.markRowError(sheet, rowIndex, error.message);
        }
      }
      
      // 批次间休息
      if (end < data.rows.length) {
        console.log('批次间休息5秒...');
        Utilities.sleep(5000);
      }
    }
    
    SpreadsheetApp.getUi().alert(`批量处理完成！共处理了 ${totalProcessed} 笔数据。`);
    
  } catch (error) {
    console.error('批量处理错误:', error);
    SpreadsheetApp.getUi().alert(`批量处理错误: ${error.message}`);
  }
}

/**
 * 處理 Send Now 下拉選單點擊
 */
function handleSendNowClick(sheet, rowIndex) {
  try {
    // 獲取該行資料
    const dataRange = sheet.getRange(rowIndex, 1, 1, Object.keys(COLUMNS).length);
    const row = dataRange.getValues()[0];
    
    // 檢查必要欄位
    if (!row[COLUMNS.EMAIL] || !row[COLUMNS.FIRST_NAME]) {
      SpreadsheetApp.getUi().alert('該行缺少必要的 Email 或姓名資料');
      return;
    }
    
    // 檢查狀態是否為 Running
    if (row[COLUMNS.STATUS] !== 'Running') {
      SpreadsheetApp.getUi().alert('只能對狀態為 "Running" 的行使用 Send Now 功能');
      return;
    }
    
    // 找出下一封待寄的信件
    const nextEmail = findNextEmailToSend(row, rowIndex);
    
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
    checkAndUpdateStatusIfAllEmailsSent(sheet, rowIndex);
    
    // 提供用戶反饋
    SpreadsheetApp.getUi().alert('✅ 郵件發送成功', `已立即發送 ${nextEmail.type} 給 ${row[COLUMNS.FIRST_NAME]}`, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('Send Now 點擊處理錯誤:', error);
    SpreadsheetApp.getUi().alert(`Send Now 錯誤: ${error.message}`);
  }
}

/**
 * 檢查是否所有郵件都已發送，如果是則更新狀態為 Done
 */
function checkAndUpdateStatusIfAllEmailsSent(sheet, rowIndex) {
  try {
    // 檢查三個排程欄位是否都有刪除線
    const schedule1Cell = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_1 + 1);
    const schedule2Cell = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_2 + 1);
    const schedule3Cell = sheet.getRange(rowIndex, COLUMNS.SCHEDULE_3 + 1);
    
    const mail1Sent = schedule1Cell.getFontLine() === 'line-through';
    const mail2Sent = schedule2Cell.getFontLine() === 'line-through';
    const mail3Sent = schedule3Cell.getFontLine() === 'line-through';
    
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

/**
 * 找出下一封待寄的郵件
 */
function findNextEmailToSend(row, rowIndex) {
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
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      let scheduleColumnIndex;
      
      switch (email.type) {
        case 'mail1': scheduleColumnIndex = COLUMNS.SCHEDULE_1 + 1; break;
        case 'mail2': scheduleColumnIndex = COLUMNS.SCHEDULE_2 + 1; break;
        case 'mail3': scheduleColumnIndex = COLUMNS.SCHEDULE_3 + 1; break;
      }
      
      const scheduleCell = sheet.getRange(rowIndex, scheduleColumnIndex);
      const fontLine = scheduleCell.getFontLine();
      
      // 如果沒有刪除線，表示未發送
      if (fontLine !== 'line-through') {
        return email;
      }
    }
  }
  
  return null;
}


/**
 * 顯示觸發器統計資訊
 */
function showTriggerStats() {
  try {
    const stats = TriggerManager.getTriggerStats();
    
    const message = `📊 觸發器統計資訊：
    
總觸發器數量: ${stats.total}

🚀 全域郵件觸發器: ${stats.globalTriggers}
📧 回覆檢測觸發器: ${stats.replyTriggers}
🔧 其他觸發器: ${stats.others}

運行模式: 正式模式 (每小時檢查)`;
    
    SpreadsheetApp.getUi().alert('觸發器統計', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('錯誤', `無法取得觸發器統計: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}


/**
 * 從選單執行 Send Now（掃描所有勾選的復選框）
 */
function sendNowFromMenu() {
  try {
    const sheet = SheetService.getMainSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      SpreadsheetApp.getUi().alert('沒有資料', '工作表中沒有資料可以處理', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    let processedCount = 0;
    let errorCount = 0;
    
    // 掃描所有行，尋找勾選的 Send Now 復選框
    for (let i = 2; i <= lastRow; i++) {
      const sendNowCell = sheet.getRange(i, COLUMNS.SEND_NOW + 1);
      const isChecked = sendNowCell.getValue() === true;
      const status = sheet.getRange(i, COLUMNS.STATUS + 1).getValue();
      
      // 只處理狀態為 Running 且復選框被勾選的行
      if (status === 'Running' && isChecked) {
        try {
          console.log(`處理第 ${i} 行的 Send Now 請求`);
          handleSendNowClick(sheet, i);
          
          // 取消勾選復選框（表示已處理）
          sendNowCell.setValue(false);
          processedCount++;
          
        } catch (error) {
          console.error(`第 ${i} 行 Send Now 失敗:`, error);
          SheetService.updateInfo(sheet, i, `[Error] Send Now 失敗: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    // 顯示結果
    if (processedCount === 0 && errorCount === 0) {
      SpreadsheetApp.getUi().alert('沒有發現勾選項目', '請先勾選要立即發送郵件的行，然後再點擊 Send Now', SpreadsheetApp.getUi().ButtonSet.OK);
    } else {
      const message = `Send Now 完成！\n\n✅ 成功發送: ${processedCount} 封郵件\n${errorCount > 0 ? `❌ 發送失敗: ${errorCount} 封郵件` : ''}`;
      SpreadsheetApp.getUi().alert('Send Now 結果', message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
    
  } catch (error) {
    console.error('Send Now 從選單執行失敗:', error);
    SpreadsheetApp.getUi().alert('錯誤', `Send Now 執行失敗: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 停止所有處理程序（選單功能）
 */
function stopAllProcesses() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    '🛑 停止所有處理程序',
    '確定要停止此工作表的所有處理程序嗎？\n\n將會執行以下操作：\n• 將所有 Processing 狀態改為 Done\n• 將所有 Running 狀態改為 Done\n• 清理所有排程資料\n• 停止所有自動郵件發送\n\n⚠️ 此操作無法復原！',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      const stoppedCount = stopAllSheetProcesses();
      ui.alert(
        '✅ 停止完成', 
        `已停止 ${stoppedCount} 個處理程序\n\n所有潛在客戶狀態已設為 Done\n排程資料已清理完畢`, 
        ui.ButtonSet.OK
      );
    } catch (error) {
      ui.alert('錯誤', `停止處理程序失敗: ${error.message}`, ui.ButtonSet.OK);
    }
  }
}

/**
 * 停止當前工作表的所有處理程序
 */
function stopAllSheetProcesses() {
  const sheet = SheetService.getMainSheet();
  const lastRow = sheet.getLastRow();
  let stoppedCount = 0;
  
  if (lastRow <= 1) {
    console.log('沒有資料需要停止');
    return 0;
  }
  
  console.log('=== 開始停止所有處理程序 ===');
  
  // 1. 遍歷所有行，停止 Processing 和 Running 狀態的行
  for (let i = 2; i <= lastRow; i++) {
    const statusCell = sheet.getRange(i, COLUMNS.STATUS + 1);
    const currentStatus = statusCell.getValue();
    
    if (currentStatus === 'Processing' || currentStatus === 'Running') {
      // 更新狀態為 Done
      SheetService.updateStatus(sheet, i, 'Done');
      SheetService.updateInfo(sheet, i, '手動停止所有處理程序');
      
      // 清除 Send Now 復選框
      SheetService.setupSendNowButton(sheet, i); // 這會自動清除復選框因為狀態不是 Running
      
      stoppedCount++;
      console.log(`已停止第 ${i} 行的處理程序`);
    }
  }
  
  // 2. 清理所有 PropertiesService 中的排程資料
  const properties = PropertiesService.getScriptProperties().getProperties();
  let cleanedProperties = 0;
  
  for (const key of Object.keys(properties)) {
    if (key.startsWith('production_email_')) {
      PropertiesService.getScriptProperties().deleteProperty(key);
      cleanedProperties++;
      console.log(`清理排程資料: ${key}`);
    }
  }
  
  console.log(`=== 停止完成 ===`);
  console.log(`停止了 ${stoppedCount} 個處理程序`);
  console.log(`清理了 ${cleanedProperties} 個排程資料`);
  
  return stoppedCount;
}





/**
 * 手動測試 Send Now 功能（調試用）
 */
function testSendNowManually() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const ui = SpreadsheetApp.getUi();
    
    // 讓用戶選擇要測試的行號
    const result = ui.prompt('測試 Send Now', '請輸入要測試的行號 (例如: 2)', ui.ButtonSet.OK_CANCEL);
    
    if (result.getSelectedButton() === ui.Button.OK) {
      const rowIndex = parseInt(result.getResponseText());
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        ui.alert('錯誤', '請輸入有效的行號 (>= 2)', ui.ButtonSet.OK);
        return;
      }
      
      console.log(`手動測試 Send Now: 第 ${rowIndex} 行`);
      handleSendNowClick(sheet, rowIndex);
      
      ui.alert('測試完成', `已嘗試發送第 ${rowIndex} 行的郵件`, ui.ButtonSet.OK);
    }
  } catch (error) {
    console.error('手動測試失敗:', error);
    SpreadsheetApp.getUi().alert('測試失敗', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 刪除所有觸發器（選單功能）
 */
function deleteAllTriggersMenu() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    '⚠️ 刪除所有觸發器',
    '確定要刪除所有 Auto Lead Warmer 相關觸發器嗎？\n\n這將停止所有郵件發送和自動檢測功能。\n\n⚠️ 此操作無法復原！',
    ui.ButtonSet.YES_NO
  );
  
  if (result === ui.Button.YES) {
    try {
      const deletedCount = TriggerManager.deleteAllLeadWarmerTriggers();
      ui.alert('成功', `已刪除 ${deletedCount} 個觸發器\n\n所有自動功能已停止`, ui.ButtonSet.OK);
    } catch (error) {
      ui.alert('錯誤', `刪除觸發器失敗: ${error.message}`, ui.ButtonSet.OK);
    }
  }
}

/**
 * 手動測試全域郵件檢查功能（調試用）
 */
function testGlobalEmailCheckManually() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    console.log('=== 手動測試全域郵件檢查 ===');
    
    // 執行全域郵件檢查
    const result = EmailService.checkAndSendMails();
    
    let message = `📧 全域郵件檢查測試結果：\n\n`;
    
    if (result.error) {
      message += `❌ 錯誤：${result.error}`;
    } else {
      message += `✅ 檢查了 ${result.checked} 個潛在客戶\n📬 發送了 ${result.sent} 封郵件`;
    }
    
    // 檢查工作表狀態
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('工作表1');
    const lastRow = sheet.getLastRow();
    let runningCount = 0;
    
    if (lastRow > 1) {
      for (let i = 2; i <= lastRow; i++) {
        const status = sheet.getRange(i, 15).getValue(); // STATUS column
        if (status === 'Running') {
          runningCount++;
        }
      }
    }
    
    message += `\n\n📊 工作表狀態：\n🔄 Running 狀態的潛客數: ${runningCount}`;
    
    ui.alert('全域郵件檢查測試', message, ui.ButtonSet.OK);
    
    console.log('測試結果:', result);
    
  } catch (error) {
    console.error('手動測試全域郵件檢查失敗:', error);
    SpreadsheetApp.getUi().alert('測試失敗', `全域郵件檢查測試失敗: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 手動重新建立全域觸發器（調試用）
 */
function recreateGlobalTrigger() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    console.log('=== 手動重新建立全域觸發器 ===');
    
    // 先刪除現有的全域觸發器
    TriggerManager.deleteGlobalEmailTrigger();
    
    // 等待一秒
    Utilities.sleep(1000);
    
    // 重新建立觸發器
    TriggerManager.createGlobalEmailTrigger();
    
    // 檢查結果
    const stats = TriggerManager.getTriggerStats();
    
    const message = `✅ 全域觸發器重新建立完成！\n\n📊 觸發器統計：\n🚀 全域郵件觸發器: ${stats.globalTriggers}\n📧 回覆檢測觸發器: ${stats.replyTriggers}\n🔧 其他觸發器: ${stats.others}\n\n觸發器應該會在下個整點執行 checkAndSendMails 函數。`;
    
    ui.alert('觸發器重建完成', message, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('重新建立觸發器失敗:', error);
    SpreadsheetApp.getUi().alert('重建失敗', `觸發器重建失敗: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 手動測試回覆檢測功能（調試用）
 */
function testReplyDetectionManually() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    console.log('=== 手動測試回覆檢測 ===');
    
    // 檢查觸發器是否存在
    const triggers = ScriptApp.getProjectTriggers();
    const replyTrigger = triggers.find(t => t.getHandlerFunction() === 'checkAllRunningLeadsForReplies');
    
    let triggerInfo = '';
    if (replyTrigger) {
      triggerInfo = `\n\n觸發器狀態：✅ 已存在\n觸發器 ID：${replyTrigger.getUniqueId()}`;
    } else {
      triggerInfo = `\n\n觸發器狀態：❌ 不存在`;
    }
    
    // 執行回覆檢測
    const result = ReplyDetectionService.checkAllRunningLeadsForReplies();
    
    let message = `📬 回覆檢測測試結果：\n\n`;
    
    if (result.error) {
      message += `❌ 錯誤：${result.error}`;
    } else {
      message += `✅ 檢查了 ${result.checked} 個潛在客戶\n📧 發現 ${result.repliesFound} 個回覆`;
    }
    
    message += triggerInfo;
    
    // 檢查 Gmail 權限
    try {
      const testThreads = GmailApp.search('is:unread', 0, 1);
      message += `\n\n📮 Gmail 權限：✅ 正常 (找到 ${testThreads.length} 個未讀對話)`;
    } catch (gmailError) {
      message += `\n\n📮 Gmail 權限：❌ 錯誤 - ${gmailError.message}`;
    }
    
    ui.alert('回覆檢測測試', message, ui.ButtonSet.OK);
    
    console.log('測試結果:', result);
    
  } catch (error) {
    console.error('手動測試回覆檢測失敗:', error);
    SpreadsheetApp.getUi().alert('測試失敗', `回覆檢測測試失敗: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}