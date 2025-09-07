/**
 * 選單服務 - 處理所有選單和用戶界面相關功能
 */

const MenuService = {
  
  /**
   * 顯示觸發器統計資訊
   */
  showTriggerStats() {
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
  },

  /**
   * 從選單執行 Send Now（掃描所有勾選的復選框）
   */
  sendNowFromMenu() {
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
            SendNowHandler.handleSendNowClick(sheet, i);
            
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
  },

  /**
   * 停止處理新行（只停止 runAutoLeadWarmer 繼續處理，不影響現有 Running 狀態）
   */
  stopNewProcessing() {
    const ui = SpreadsheetApp.getUi();
    const result = ui.alert(
      '⏸️ 停止處理新行',
      '確定要停止處理新的潛在客戶嗎？\n\n將會執行以下操作：\n• 停止 Auto Lead Warmer 繼續處理新行\n• 當前處理中的行會完成後停止\n• 保持現有 Running 狀態的潛客不變\n• 保持所有排程和觸發器不變\n\n✅ 此操作可以隨時重新開始處理',
      ui.ButtonSet.YES_NO
    );
    
    if (result === ui.Button.YES) {
      // 設定停止標記
      PropertiesService.getScriptProperties().setProperty('stop_processing', 'true');
      
      ui.alert(
        '✅ 已設定停止標記', 
        '系統將在處理完當前行後停止處理新行\n\n• 現有 Running 狀態保持不變\n• 排程和觸發器繼續運作\n• 可隨時點擊 "🚀 Run" 重新開始', 
        ui.ButtonSet.OK
      );
      
      console.log('已設定停止處理新行標記');
    }
  },

  /**
   * 刪除所有觸發器（選單功能）
   */
  deleteAllTriggersMenu() {
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
  },

  /**
   * 手動測試全域郵件檢查功能（調試用）
   */
  testGlobalEmailCheckManually() {
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
  },

  /**
   * 手動測試回覆檢測功能（調試用）
   */
  testReplyDetectionManually() {
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
};

// 全局函數包裝器
function showTriggerStats() {
  return MenuService.showTriggerStats();
}

function sendNowFromMenu() {
  return MenuService.sendNowFromMenu();
}

function stopNewProcessing() {
  return MenuService.stopNewProcessing();
}

function deleteAllTriggersMenu() {
  return MenuService.deleteAllTriggersMenu();
}

function testGlobalEmailCheckManually() {
  return MenuService.testGlobalEmailCheckManually();
}

function testReplyDetectionManually() {
  return MenuService.testReplyDetectionManually();
}