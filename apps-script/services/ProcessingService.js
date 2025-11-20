/**
 * 處理服務 - 主要入口和流程控制
 */

const ProcessingService = {
  
  /**
   * 主要入口函數 - 自動潛客加溫器
   */
  runAutoLeadWarmer() {
    try {
      console.log('=== 开始执行 Auto Lead Warmer ===');

      // 開始統計追蹤
      StatisticsService.startRun();


      // 檢查並處理研習活動簡介
      if (!this.handleSeminarBrief()) {
        return; // 如果需要用戶輸入，停止執行
      }

      // 清理觸發器並創建新的
      this.setupTriggers();

      // 獲取並處理數據
      this.processAllRows();

      // 結束統計追蹤並輸出報告
      StatisticsService.endRun();

    } catch (error) {
      console.error('執行錯誤:', error);
      SpreadsheetApp.getUi().alert('Run error', `Error happen: ${error.message}\n\nPlease check:\n1. API Key correct?\n2. Network OK?\n3. Sheet format correct?`, SpreadsheetApp.getUi().ButtonSet.OK);

      // 即使發生錯誤也結束統計追蹤
      StatisticsService.endRun();
    }
  },


  /**
   * 處理研習活動簡介
   * @returns {boolean} - 是否可以繼續執行
   */
  handleSeminarBrief() {
    console.log('檢查研習活動資訊...');
    try {
      const seminarResult = UserInfoService.checkAndGenerateSeminarBrief();
      
      if (!seminarResult.success) {
        if (seminarResult.needsUserInput) {
          // Seminar Info 為空，提醒用戶填寫
          SpreadsheetApp.getUi().alert(
            '⚠️ Missing seminar info',
            `${seminarResult.message}\n\nPlease go to "User Info" sheet, fill "Seminar Info" (event name, URL, etc).\n\nSystem will auto create "Seminar Brief" for all customer analysis.`,
            SpreadsheetApp.getUi().ButtonSet.OK
          );
          return false; // 停止執行，等用戶填寫資訊
        } else {
          // 生成失敗，但不阻止流程繼續
          console.error('研習活動簡介生成失敗，但繼續執行:', seminarResult.message);
          SpreadsheetApp.getUi().alert(
            '⚠️ Seminar Brief create fail',
            `${seminarResult.message}\n\nWill use existing Seminar Brief to continue.`,
            SpreadsheetApp.getUi().ButtonSet.OK
          );
        }
      } else {
        // 成功生成，提供用戶反饋但不停止執行
        console.log('研習活動簡介自動生成成功');
        SpreadsheetApp.getActiveSpreadsheet().toast(
          '✅ Seminar Brief updated, will use for all customer analysis',
          'Seminar Brief create done',
          3
        );

        // 記錄 Seminar Brief 統計（如果有新生成的簡介）
        if (seminarResult.seminarBrief && typeof seminarResult.seminarBrief === 'object' && seminarResult.seminarBrief.tracking) {
          StatisticsService.recordSeminarBrief(seminarResult.seminarBrief);
        }
      }
    } catch (error) {
      console.error('檢查研習活動資訊時發生錯誤:', error);
      // 不阻止主流程繼續執行
    }
    
    return true;
  },

  /**
   * 設置觸發器
   */
  setupTriggers() {
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
    
    try {
      TriggerManager.createReplyDetectionTrigger();
    } catch (error) {
      console.error('回覆檢測觸發器創建失敗，但繼續執行:', error);
    }

    try {
      TriggerManager.createPixelTrackingTrigger();
    } catch (error) {
      console.error('像素追蹤觸發器創建失敗，但繼續執行:', error);
    }
    
    // onEdit 是 Google Sheets 內建的 simple trigger，無需手動創建
  },

  /**
   * 處理所有行 - 使用批次並行處理
   */
  processAllRows() {
    const sheet = SheetService.getMainSheet();
    const data = SheetService.getUnprocessedData(sheet);

    if (data.rows.length === 0) {
      SpreadsheetApp.getUi().alert('No data to process.\n\nPlease check:\n1. Headers set up?\n2. Customer data filled?\n3. Data not marked as processed?');
      return;
    }

    console.log(`找到 ${data.rows.length} 行待处理数据，將使用批次並行處理（每批次 10 筆）`);

    let processedCount = 0;
    let errorCount = 0;

    // Use BatchProcessor for pure logic
    const batches = BatchProcessor.createBatches(data.rows, data.rowIndexes, 10);

    // 分批處理
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      console.log(`--- 開始處理第 ${batch.batchNumber} / ${batch.totalBatches} 批次 (${batch.rows.length} 筆資料) ---`);

      // 並行處理當前批次
      const batchResult = this.processBatchConcurrently(sheet, batch.rows, batch.indexes);

      processedCount += batchResult.successCount;
      errorCount += batchResult.errorCount;

      console.log(`第 ${batch.batchNumber} 批次完成: 成功 ${batchResult.successCount}，失敗 ${batchResult.errorCount}`);

      // 批次間休息，避免API限制
      if (BatchProcessor.hasMoreBatches(batch.batchNumber, batch.totalBatches)) {
        console.log('批次間休息 5 秒避免 API 限制...');
        Utilities.sleep(5000);
      }
    }

    // 顯示完成結果
    this.showCompletionMessage(processedCount, errorCount);
  },

  /**
   * 並行處理一批次的資料 - 使用真正的並行 API 調用
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {Array} batchRows
   * @param {Array} batchRowIndexes
   * @returns {Object} 處理結果統計
   */
  processBatchConcurrently(sheet, batchRows, batchRowIndexes) {
    console.log(`=== 開始真正並行處理 ${batchRows.length} 筆資料 ===`);

    // 立即將所有行狀態更新為 Processing
    batchRowIndexes.forEach(rowIndex => {
      SheetService.updateStatus(sheet, rowIndex, 'Processing');
    });
    SpreadsheetApp.flush();

    let successCount = 0;
    let errorCount = 0;

    try {
      // 檢查用戶付費狀態（只檢查一次）
      APIService.checkUserPaymentStatus();
      console.log('✅ 用戶付費狀態驗證通過');

      // 檢查用戶 Credit 餘額
      const creditInfo = APIService.checkUserCredit();
      console.log(`✅ Current Credit Balance: ${creditInfo.credit}`);

      // 檢查是否有足夠的 Credit 處理這批次
      const requiredCredits = batchRows.length;
      if (creditInfo.credit < requiredCredits) {
        throw new Error(`Credits not enough! Current balance: ${creditInfo.credit}, Required: ${requiredCredits}. Please purchase more credits to continue.`);
      }

      // 獲取用戶資訊（只獲取一次）
      const userInfo = UserInfoService.getUserInfo();

      // 第1階段：並行生成所有 Leads Profiles
      console.log('第1階段：並行生成 Leads Profiles...');
      const leadsProfilesData = this.generateLeadsProfilesConcurrently(sheet, batchRows, batchRowIndexes, userInfo);

      // 第2階段：並行生成所有 Mail Angles
      console.log('第2階段：並行生成 Mail Angles...');
      const mailAnglesData = this.generateMailAnglesConcurrently(sheet, batchRows, batchRowIndexes, leadsProfilesData, userInfo);

      // 第3階段：並行生成所有第一封郵件
      console.log('第3階段：並行生成第一封郵件...');
      const firstMailsData = this.generateFirstMailsConcurrently(sheet, batchRows, batchRowIndexes, leadsProfilesData, mailAnglesData, userInfo);

      // 第4階段：設定排程和觸發器
      console.log('第4階段：設定排程和觸發器...');
      batchRows.forEach((row, index) => {
        const rowIndex = batchRowIndexes[index];

        try {
          // 檢查所有階段是否成功
          const leadsProfileSuccess = leadsProfilesData[index] && leadsProfilesData[index].success;
          const mailAnglesSuccess = mailAnglesData[index] && mailAnglesData[index].success;
          const firstMailSuccess = firstMailsData[index] && firstMailsData[index].success;

          if (leadsProfileSuccess && mailAnglesSuccess && firstMailSuccess) {
            // 設定排程和觸發器
            this.setupSchedules(sheet, row, rowIndex);
            this.setupEmailTriggers(sheet, row, rowIndex);
            this.setupRowFormatting(sheet, rowIndex);

            // 記錄統計資料
            StatisticsService.recordRowProcessing(
              rowIndex,
              leadsProfilesData[index],
              mailAnglesData[index],
              [firstMailsData[index]]
            );

            // 扣除 Credit（每處理成功一筆扣除 1 credit）
            try {
              const deductResult = APIService.deductCredit(1);
              console.log(`✅ Credit deducted. Remaining: ${deductResult.remainingCredit}`);
            } catch (creditError) {
              console.error(`Credit deduction failed for row ${rowIndex}:`, creditError);
              // Credit 扣除失敗不影響已處理的狀態，但記錄錯誤
            }

            // 標記為已處理
            SheetService.markRowProcessed(sheet, rowIndex);
            SheetService.updateInfo(sheet, rowIndex, '🎉 Done! All ready');
            successCount++;
            console.log(`第 ${rowIndex} 行處理成功`);
          } else {
            throw new Error('部分內容生成失敗');
          }
        } catch (error) {
          console.error(`設定第 ${rowIndex} 行排程失敗:`, error);
          SheetService.markRowError(sheet, rowIndex, error.message);
          errorCount++;
        }
      });

      SpreadsheetApp.flush();

    } catch (error) {
      console.error('批次處理發生錯誤:', error);

      // 標記所有未處理的行為錯誤
      batchRowIndexes.forEach(rowIndex => {
        SheetService.markRowError(sheet, rowIndex, `批次處理失敗: ${error.message}`);
        errorCount++;
      });
    }

    console.log(`=== 並行處理完成：成功 ${successCount}，失敗 ${errorCount} ===`);

    return {
      successCount,
      errorCount
    };
  },

  /**
   * 第1階段：並行生成多個 Leads Profiles
   */
  generateLeadsProfilesConcurrently(sheet, batchRows, batchRowIndexes, userInfo) {
    try {
      // 準備批次資料
      const batchData = batchRows.map((row, index) => ({
        companyUrl: row[COLUMNS.COMPANY_URL],
        position: row[COLUMNS.POSITION],
        firstName: row[COLUMNS.FIRST_NAME]
      }));

      // 更新狀態
      batchRowIndexes.forEach(rowIndex => {
        SheetService.updateInfo(sheet, rowIndex, 'Building leads profile...');
      });

      // 批次生成
      const results = ContentGenerator.generateLeadsProfilesBatch(batchData, userInfo);

      // 填入工作表
      results.forEach((result, index) => {
        const rowIndex = batchRowIndexes[index];
        if (result.success) {
          sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).setValue(result.content);
          SheetService.updateInfo(sheet, rowIndex, '✅ Leads profile done');
        } else {
          SheetService.updateInfo(sheet, rowIndex, `❌ Leads profile fail: ${result.error}`);
        }
      });

      SpreadsheetApp.flush();
      return results;

    } catch (error) {
      console.error('並行生成客戶畫像失敗:', error);
      throw error;
    }
  },

  /**
   * 第2階段：並行生成多個 Mail Angles
   */
  generateMailAnglesConcurrently(sheet, batchRows, batchRowIndexes, leadsProfilesData, userInfo) {
    try {
      // 準備批次資料
      const batchData = batchRows.map((row, index) => {
        const leadsProfileResult = leadsProfilesData[index];
        if (!leadsProfileResult || !leadsProfileResult.success) {
          return null;
        }

        return {
          leadsProfile: leadsProfileResult.content,
          firstName: row[COLUMNS.FIRST_NAME],
          position: row[COLUMNS.POSITION],
          department: row[COLUMNS.DEPARTMENT]
        };
      });

      // 過濾掉空值
      const validBatchData = batchData.filter(data => data !== null);
      const validIndexes = batchData.map((data, index) => data !== null ? index : -1).filter(i => i !== -1);

      if (validBatchData.length === 0) {
        console.log('沒有有效的客戶畫像可用於生成郵件切入點');
        return batchRows.map(() => ({ success: false, error: 'Leads profile generation failed' }));
      }

      // 更新狀態
      validIndexes.forEach(index => {
        const rowIndex = batchRowIndexes[index];
        SheetService.updateInfo(sheet, rowIndex, 'Building mail angles...');
      });

      // 批次生成
      const results = ContentGenerator.generateMailAnglesBatch(validBatchData, userInfo);

      // 填入工作表
      const allResults = batchRows.map(() => ({ success: false, error: '跳過處理' }));

      results.forEach((result, resultIndex) => {
        const originalIndex = validIndexes[resultIndex];
        const rowIndex = batchRowIndexes[originalIndex];

        allResults[originalIndex] = result;

        if (result.success) {
          const mailAngles = result.content;

          // 先將 aspect1 和 aspect2 添加到 Leads Profile 中
          if (mailAngles.aspect1 && mailAngles.aspect2) {
            const currentLeadsProfile = sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).getValue();
            const labels = LocalizationService.getMailAnglesLabels();
            const updatedLeadsProfile = currentLeadsProfile +
              '\n- ' + labels.aspect1 + mailAngles.aspect1 +
              '\n- ' + labels.aspect2 + mailAngles.aspect2;
            sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).setValue(updatedLeadsProfile);
          }

          // 填入切入點
          sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_1 + 1).setValue(mailAngles.angle1);
          sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_2 + 1).setValue(mailAngles.angle2);
          sheet.getRange(rowIndex, COLUMNS.MAIL_ANGLE_3 + 1).setValue(mailAngles.angle3);

          SheetService.updateInfo(sheet, rowIndex, '✅ Mail angles done');
        } else {
          SheetService.updateInfo(sheet, rowIndex, `❌ Mail angles fail: ${result.error}`);
        }
      });

      SpreadsheetApp.flush();
      return allResults;

    } catch (error) {
      console.error('並行生成郵件切入點失敗:', error);
      throw error;
    }
  },

  /**
   * 第3階段：並行生成多封第一封郵件
   */
  generateFirstMailsConcurrently(sheet, batchRows, batchRowIndexes, leadsProfilesData, mailAnglesData, userInfo) {
    try {
      // 準備批次資料
      const batchData = batchRows.map((row, index) => {
        const leadsProfileResult = leadsProfilesData[index];
        const mailAnglesResult = mailAnglesData[index];

        if (!leadsProfileResult || !leadsProfileResult.success ||
            !mailAnglesResult || !mailAnglesResult.success) {
          return null;
        }

        // 從工作表取得更新後的 Leads Profile（包含 aspect1 和 aspect2）
        const rowIndex = batchRowIndexes[index];
        const updatedLeadsProfile = sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).getValue();

        return {
          leadsProfile: updatedLeadsProfile,
          mailAngle: mailAnglesResult.content.angle1,
          firstName: row[COLUMNS.FIRST_NAME],
          department: row[COLUMNS.DEPARTMENT],
          position: row[COLUMNS.POSITION],
          emailNumber: 1
        };
      });

      // 過濾掉空值
      const validBatchData = batchData.filter(data => data !== null);
      const validIndexes = batchData.map((data, index) => data !== null ? index : -1).filter(i => i !== -1);

      if (validBatchData.length === 0) {
        console.log('沒有有效的切入點可用於生成第一封郵件');
        return batchRows.map(() => ({ success: false, error: '前階段生成失敗' }));
      }

      // 更新狀態
      validIndexes.forEach(index => {
        const rowIndex = batchRowIndexes[index];
        SheetService.updateInfo(sheet, rowIndex, 'Building email 1...');
      });

      // 批次生成
      const results = ContentGenerator.generateMailsBatch(validBatchData, userInfo);

      // 填入工作表
      const allResults = batchRows.map(() => ({ success: false, error: '跳過處理' }));

      results.forEach((result, resultIndex) => {
        const originalIndex = validIndexes[resultIndex];
        const rowIndex = batchRowIndexes[originalIndex];

        allResults[originalIndex] = result;

        if (result.success) {
          sheet.getRange(rowIndex, COLUMNS.FOLLOW_UP_1 + 1).setValue(result.content);
          SheetService.updateInfo(sheet, rowIndex, '✅ Email 1 done');
        } else {
          SheetService.updateInfo(sheet, rowIndex, `❌ Email 1 fail: ${result.error}`);
        }
      });

      SpreadsheetApp.flush();
      return allResults;

    } catch (error) {
      console.error('並行生成第一封郵件失敗:', error);
      throw error;
    }
  },


  /**
   * 設定排程時間
   */
  setupSchedules(sheet, row, rowIndex) {
    console.log('步骤4: 设定排程时间...');
    SheetService.updateInfo(sheet, rowIndex, 'Setting time...');
    SpreadsheetApp.flush();

    const schedules = Utils.generateScheduleTimes();

    // 逐個填入排程時間為格式化字串，設定為純文字格式
    this.setScheduleCell(sheet, rowIndex, COLUMNS.SCHEDULE_1 + 1, schedules.schedule1);
    this.setScheduleCell(sheet, rowIndex, COLUMNS.SCHEDULE_2 + 1, schedules.schedule2);
    this.setScheduleCell(sheet, rowIndex, COLUMNS.SCHEDULE_3 + 1, schedules.schedule3);

    SheetService.updateInfo(sheet, rowIndex, '✅ Time set');
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
    SheetService.updateInfo(sheet, rowIndex, 'Setting email send schedules...');
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
  },

  /**
   * 顯示完成訊息
   */
  showCompletionMessage(processedCount, errorCount) {
    const operation = "Auto Lead Warmer Run";

    // Show non-blocking toast notification instead of blocking alert
    ToastService.showBatchResult(operation, processedCount, errorCount, 6);

    // Log detailed information to console
    console.log(`處理完成！成功: ${processedCount}, 失敗: ${errorCount}`);
    if (errorCount > 0) {
      console.log('請檢查錯誤行詳細訊息。');
    }
  }
};

// 全局函數包裝器
function runAutoLeadWarmer() {
  return ProcessingService.runAutoLeadWarmer();
}