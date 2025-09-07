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
      
      // 重置 Token 使用量統計
      resetTokenStats();
      
      // 清除任何現有的停止標記（允許重新開始處理）
      this.clearStopFlag();
      
      // 檢查並處理研習活動簡介
      if (!this.handleSeminarBrief()) {
        return; // 如果需要用戶輸入，停止執行
      }

      // 清理觸發器並創建新的
      this.setupTriggers();
      
      // 獲取並處理數據
      this.processAllRows();
      
      // 顯示 Token 使用量統計
      showTokenSummary();
      
    } catch (error) {
      console.error('執行錯誤:', error);
      SpreadsheetApp.getUi().alert('執行錯誤', `發生未預期的錯誤: ${error.message}\n\n請檢查：\n1. API Key是否正確\n2. 網路連接是否正常\n3. 工作表格式是否正確`, SpreadsheetApp.getUi().ButtonSet.OK);
      
      // 即使發生錯誤也顯示 Token 使用量統計
      showTokenSummary();
    }
  },

  /**
   * 清除停止標記
   */
  clearStopFlag() {
    const existingStopFlag = PropertiesService.getScriptProperties().getProperty('stop_processing');
    if (existingStopFlag === 'true') {
      PropertiesService.getScriptProperties().deleteProperty('stop_processing');
      console.log('已清除先前的停止標記，重新開始處理');
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
            '⚠️ 缺少研習活動資訊', 
            `${seminarResult.message}\n\n請到 "User Info" 工作表的 "Seminar Info" 欄位填寫研習活動資訊（如活動名稱、網址等）。\n\n系統將根據此資訊自動生成 "Seminar Brief"，用於所有潛在客戶的分析。`, 
            SpreadsheetApp.getUi().ButtonSet.OK
          );
          return false; // 停止執行，等用戶填寫資訊
        } else {
          // 生成失敗，但不阻止流程繼續
          console.error('研習活動簡介生成失敗，但繼續執行:', seminarResult.message);
          SpreadsheetApp.getUi().alert(
            '⚠️ 研習活動簡介生成失敗', 
            `${seminarResult.message}\n\n將使用現有的 Seminar Brief 繼續執行。`, 
            SpreadsheetApp.getUi().ButtonSet.OK
          );
        }
      } else {
        // 成功生成，提供用戶反饋但不停止執行
        console.log('研習活動簡介自動生成成功');
        SpreadsheetApp.getActiveSpreadsheet().toast(
          '✅ 研習活動簡介已更新，將用於所有潛在客戶分析', 
          '研習活動簡介生成完成', 
          3
        );
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
    
    // onEdit 是 Google Sheets 內建的 simple trigger，無需手動創建
  },

  /**
   * 處理所有行
   */
  processAllRows() {
    const sheet = SheetService.getMainSheet();
    const data = SheetService.getUnprocessedData(sheet);
    
    if (data.rows.length === 0) {
      SpreadsheetApp.getUi().alert('沒有資料需要處理。\n\n請確保：\n1. 已設置表頭\n2. 已填入客戶資料\n3. 資料未被標記為已處理');
      return;
    }
    
    console.log(`找到 ${data.rows.length} 行待处理数据`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < data.rows.length; i++) {
      // 檢查是否有停止處理的標記
      if (this.shouldStopProcessing()) {
        console.log('檢測到停止處理標記，終止處理新行');
        SpreadsheetApp.getUi().alert('處理已停止', `已成功處理 ${processedCount} 行，剩餘 ${data.rows.length - i} 行未處理`, SpreadsheetApp.getUi().ButtonSet.OK);
        // 清除停止標記
        PropertiesService.getScriptProperties().deleteProperty('stop_processing');
        break;
      }
      
      const row = data.rows[i];
      const rowIndex = data.rowIndexes[i]; // 使用正確的行索引
      
      try {
        console.log(`--- 处理第 ${i + 1}/${data.rows.length} 行 (Sheet行号: ${rowIndex}) ---`);
        
        // 立即更新狀態為 Processing
        SheetService.updateStatus(sheet, rowIndex, 'Processing');
        
        // 处理单行数据
        const success = RowProcessor.processRow(sheet, row, rowIndex);
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
    
    // 顯示完成結果
    this.showCompletionMessage(processedCount, errorCount);
  },

  /**
   * 檢查是否應該停止處理
   */
  shouldStopProcessing() {
    const shouldStop = PropertiesService.getScriptProperties().getProperty('stop_processing');
    return shouldStop === 'true';
  },

  /**
   * 顯示完成訊息
   */
  showCompletionMessage(processedCount, errorCount) {
    const message = `處理完成！
    
✅ 成功處理: ${processedCount} 筆
❌ 處理失敗: ${errorCount} 筆
📧 已設置 ${processedCount * 3} 個郵件發送排程（Mail 2、3 將在前一封發送後自動生成內容）

${errorCount > 0 ? '\n請檢查錯誤行詳細訊息。' : ''}`;
    
    SpreadsheetApp.getUi().alert('執行完成', message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
};

// 全局函數包裝器
function runAutoLeadWarmer() {
  return ProcessingService.runAutoLeadWarmer();
}