/**
 * 行處理器 - 處理單行數據的核心邏輯
 */

const RowProcessor = {
  
  /**
   * 處理單行數據
   */
  processRow(sheet, row, rowIndex) {
    // 检查必要栏位
    if (!this.validateRequiredFields(row, rowIndex)) {
      return false;
    }

    console.log(`处理客户: ${row[COLUMNS.FIRST_NAME]} (${row[COLUMNS.EMAIL]})`);

    try {
      // 檢查用戶付費狀態
      APIService.checkUserPaymentStatus();
      console.log('✅ 用戶付費狀態驗證通過');

      // 設置狀態下拉選單
      SheetService.setupStatusDropdown(sheet, rowIndex);

      // 執行所有處理步驟並收集統計資料


      const leadProfileResult = this.generateLeadsProfile(sheet, row, rowIndex);


      const mailAnglesResult = this.generateMailAngles(sheet, row, rowIndex);


      const firstMailResult = this.generateFirstMail(sheet, row, rowIndex);

      this.setupSchedules(sheet, row, rowIndex);
      this.setupEmailTriggers(sheet, row, rowIndex);

      // 設定行格式（行高和文字換行）
      this.setupRowFormatting(sheet, rowIndex);

      // 記錄該行處理統計
      const mails = [firstMailResult]; // 只有第一封郵件在初始處理時生成
      StatisticsService.recordRowProcessing(rowIndex, leadProfileResult, mailAnglesResult, mails);

      // 標記為已處理
      SheetService.markRowProcessed(sheet, rowIndex);
      SheetService.updateInfo(sheet, rowIndex, '🎉 完成！已設定所有郵件排程');
      SpreadsheetApp.flush();
      console.log('邮件发送触发器设定成功');

      return true;

    } catch (error) {
      console.error(`处理第 ${rowIndex} 行失败:`, error);
      throw error;
    }
  },

  /**
   * 驗證必要欄位
   */
  validateRequiredFields(row, rowIndex) {
    if (!row[COLUMNS.EMAIL] || !row[COLUMNS.FIRST_NAME] || !row[COLUMNS.COMPANY_URL] || !row[COLUMNS.POSITION]) {
      console.log(`第 ${rowIndex} 行跳过：缺少必要字段`);
      return false;
    }
    return true;
  },

  /**
   * 檢查研習活動簡介
   */
  checkSeminarBrief(sheet, rowIndex) {
    console.log('步骤0: 檢查研習活動簡介...');
    SheetService.updateInfo(sheet, rowIndex, '檢查研習活動簡介...');
    SpreadsheetApp.flush();
    
    const seminarResult = UserInfoService.checkAndGenerateSeminarBrief();
    if (!seminarResult.success && seminarResult.needsUserInput) {
      throw new Error('請先在 User Info 工作表填寫 Seminar Info');
    } else if (!seminarResult.success) {
      throw new Error(seminarResult.message);
    }
    console.log('研習活動簡介檢查完成');
  },

  /**
   * 生成潛在客戶畫像
   */
  generateLeadsProfile(sheet, row, rowIndex) {
    console.log('步骤1: 生成客户画像...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成客戶畫像...');
    SpreadsheetApp.flush();

    const result = ContentGenerator.generateLeadsProfile(
      row[COLUMNS.COMPANY_URL],
      row[COLUMNS.POSITION],
      null, // resourceUrl 不再使用，改用 seminar brief
      row[COLUMNS.FIRST_NAME]
    );

    if (!result.content || result.content.length < 50) {
      throw new Error('客戶畫像生成失敗或內容過短');
    }

    // 立即填入客戶畫像
    sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).setValue(result.content);
    SheetService.updateInfo(sheet, rowIndex, '✅ 客戶畫像已生成');
    SpreadsheetApp.flush();
    console.log(`客户画像生成成功 (${result.content.length} 字符)`);

    return result;
  },

  /**
   * 生成郵件切入點
   */
  generateMailAngles(sheet, row, rowIndex) {
    console.log('步骤2: 生成邮件切入点...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成郵件切入點...');
    SpreadsheetApp.flush();

    const leadsProfile = sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).getValue();

    const result = ContentGenerator.generateMailAngles(
      leadsProfile,
      row[COLUMNS.FIRST_NAME],
      row[COLUMNS.POSITION]
    );

    const mailAngles = result.content;

    // 先將 aspect1 和 aspect2 添加到 Leads Profile 中
    if (mailAngles.aspect1 && mailAngles.aspect2) {
      const currentLeadsProfile = sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).getValue();
      const updatedLeadsProfile = currentLeadsProfile +
        '\n- 職權與挑戰：' + mailAngles.aspect1 +
        '\n- 參與動機與溝通策略：' + mailAngles.aspect2;

      sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).setValue(updatedLeadsProfile);
      SheetService.updateInfo(sheet, rowIndex, '✅ 已更新 Leads Profile');
      SpreadsheetApp.flush();
      console.log('已將面向1和面向2添加到 Leads Profile');
    }

    // 再逐個填入切入點
    sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_1 + 1).setValue(mailAngles.angle1);
    SheetService.updateInfo(sheet, rowIndex, '✅ 第1個郵件切入點已生成');
    SpreadsheetApp.flush();

    sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_2 + 1).setValue(mailAngles.angle2);
    sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_3 + 1).setValue(mailAngles.angle3);
    SheetService.updateInfo(sheet, rowIndex, '✅ 所有郵件切入點已生成');
    SpreadsheetApp.flush();

    return result;
  },

  /**
   * 生成第一封郵件
   */
  generateFirstMail(sheet, row, rowIndex) {
    console.log('步骤3: 生成第1封追蹤郵件...');
    SheetService.updateInfo(sheet, rowIndex, '正在生成第1封追蹤郵件...');
    SpreadsheetApp.flush();

    const leadsProfile = sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).getValue();
    const mailAngle1 = sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_1 + 1).getValue();

    const result = ContentGenerator.generateSingleFollowUpMail(
      leadsProfile,
      mailAngle1,
      row[COLUMNS.FIRST_NAME],
      1
    );

    // 验证邮件是否成功生成
    if (result.content.includes('生成第1封郵件失敗')) {
      throw new Error('第1封追蹤郵件生成失敗');
    }

    // 填入第一封郵件內容
    sheet.getRange(rowIndex, COLUMNS.FOLLOW_UP_1 + 1).setValue(result.content);
    SheetService.updateInfo(sheet, rowIndex, '✅ 第1封追蹤郵件已生成');
    SpreadsheetApp.flush();

    return result;
  },

  /**
   * 設定排程時間
   */
  setupSchedules(sheet, row, rowIndex) {
    console.log('步骤4: 设定排程时间...');
    SheetService.updateInfo(sheet, rowIndex, '正在設定郵件排程時間...');
    SpreadsheetApp.flush();
    
    const schedules = Utils.generateScheduleTimes();
    
    // 逐個填入排程時間為格式化字串，設定為純文字格式
    this.setScheduleCell(sheet, rowIndex, COLUMNS.SCHEDULE_1 + 1, schedules.schedule1);
    this.setScheduleCell(sheet, rowIndex, COLUMNS.SCHEDULE_2 + 1, schedules.schedule2);
    this.setScheduleCell(sheet, rowIndex, COLUMNS.SCHEDULE_3 + 1, schedules.schedule3);
    
    SheetService.updateInfo(sheet, rowIndex, '✅ 排程時間已設定');
    SpreadsheetApp.flush();
    console.log('排程时间设定成功');
    
    return schedules;
  },

  /**
   * 設定單個排程儲存格
   */
  setScheduleCell(sheet, rowIndex, columnIndex, scheduleTime) {
    const scheduleCell = sheet.getRange(rowIndex, columnIndex);
    scheduleCell.setNumberFormat('@'); // 設定為純文字格式
    scheduleCell.setValue(Utils.formatScheduleTime(scheduleTime)); // 存為格式化字串
    scheduleCell.setFontLine('none'); // 確保沒有刪除線
  },

  /**
   * 設定郵件發送觸發器
   */
  setupEmailTriggers(sheet, row, rowIndex) {
    console.log('步骤5: 設定郵件發送觸發器...');
    SheetService.updateInfo(sheet, rowIndex, '正在設定郵件發送排程...');
    SpreadsheetApp.flush();
    
    const firstMail = sheet.getRange(rowIndex, COLUMNS.FOLLOW_UP_1 + 1).getValue();
    const schedules = {
      schedule1: Utils.parseScheduleTime(sheet.getRange(rowIndex, COLUMNS.SCHEDULE_1 + 1).getValue()),
      schedule2: Utils.parseScheduleTime(sheet.getRange(rowIndex, COLUMNS.SCHEDULE_2 + 1).getValue()),
      schedule3: Utils.parseScheduleTime(sheet.getRange(rowIndex, COLUMNS.SCHEDULE_3 + 1).getValue())
    };
    
    EmailService.scheduleEmails(
      row[COLUMNS.EMAIL], 
      row[COLUMNS.FIRST_NAME], 
      { mail1: firstMail, mail2: null, mail3: null }, 
      schedules, 
      rowIndex
    );
  },

  /**
   * 設定行格式（包括行高和 mail angle 文字換行）
   */
  setupRowFormatting(sheet, rowIndex) {
    try {
      // 設定行高為 200px
      sheet.setRowHeight(rowIndex, 200);
      
      // 設定 mail angle 欄位的文字換行
      const mailAngleColumns = [COLUMNS.MAIL_ANGLE_1 + 1, COLUMNS.MAIL_ANGLE_2 + 1, COLUMNS.MAIL_ANGLE_3 + 1];
      mailAngleColumns.forEach(col => {
        const cell = sheet.getRange(rowIndex, col);
        cell.setWrap(true);
      });
      
      console.log(`已設定第 ${rowIndex} 行的格式（行高200px + mail angle換行）`);
    } catch (error) {
      console.error(`設定第 ${rowIndex} 行格式時發生錯誤:`, error);
    }
  }
};

// 全局函數包裝器
function processRow(sheet, row, rowIndex) {
  return RowProcessor.processRow(sheet, row, rowIndex);
}