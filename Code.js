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
      .addItem('Reset Test Data', 'resetTestData'))
    .addToUi();
}

/**
 * 主要执行函数
 */
function runAutoLeadWarmer() {
  try {
    console.log('=== 开始执行 Auto Lead Warmer ===');
    
    const sheet = SheetService.getMainSheet();
    const data = SheetService.getUnprocessedData(sheet);
    
    if (data.rows.length === 0) {
      SpreadsheetApp.getUi().alert('没有数据需要处理。\n\n请确保：\n1. 已设置表头\n2. 已填入客户数据\n3. 数据未被标记为已处理');
      return;
    }
    
    console.log(`找到 ${data.rows.length} 行待处理数据`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    // 显示进度对话框
    const ui = SpreadsheetApp.getUi();
    
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const rowIndex = data.startRow + i;
      
      try {
        console.log(`--- 处理第 ${i + 1}/${data.rows.length} 行 (Sheet行号: ${rowIndex}) ---`);
        
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
    // 1. 生成潜在客户画像
    console.log('步骤1: 生成客户画像...');
    const leadsProfile = ContentGenerator.generateLeadsProfile(
      row[COLUMNS.CONTEXT], 
      row[COLUMNS.FIRST_NAME]
    );
    
    if (!leadsProfile || leadsProfile.length < 50) {
      throw new Error('客户画像生成失败或内容过短');
    }
    
    sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).setValue(leadsProfile);
    console.log(`客户画像生成成功 (${leadsProfile.length} 字符)`);
    
    // 2. 生成三个信件切入点
    console.log('步骤2: 生成邮件切入点...');
    const mailAngles = ContentGenerator.generateMailAngles(
      leadsProfile, 
      row[COLUMNS.FIRST_NAME]
    );
    
    // 验证切入点是否成功生成（不是默认值）
    if (mailAngles.angle1.includes('切入点1：解决客户痛点的方案') ||
        mailAngles.angle2.includes('切入点2：展示获利机会') ||
        mailAngles.angle3.includes('切入点3：建立信任关系')) {
      throw new Error('邮件切入点生成失败，返回了默认值');
    }
    
    SheetService.updateMailAngles(sheet, rowIndex, mailAngles);
    console.log('邮件切入点生成成功');
    
    // 3. 生成三封追踪信件
    console.log('步骤3: 生成追踪邮件...');
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
    
    SheetService.updateFollowUpMails(sheet, rowIndex, followUpMails);
    console.log('追踪邮件生成成功');
    
    // 4. 设定排程时间
    console.log('步骤4: 设定排程时间...');
    const schedules = Utils.generateScheduleTimes();
    SheetService.updateSchedules(sheet, rowIndex, schedules);
    console.log('排程时间设定成功');
    
    // 5. 标记为已处理
    SheetService.markRowProcessed(sheet, rowIndex);
    
    // 6. 设定邮件发送触发器
    console.log('步骤5: 设定邮件发送触发器...');
    EmailService.scheduleEmails(
      row[COLUMNS.EMAIL], 
      row[COLUMNS.FIRST_NAME], 
      followUpMails, 
      schedules, 
      rowIndex
    );
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