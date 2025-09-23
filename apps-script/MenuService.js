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
        let message = `Send Now 完成！\n\n✅ 成功發送: ${processedCount} 封郵件`;
        if (errorCount > 0) {
          message += `\n❌ 發送失敗: ${errorCount} 封郵件`;
        }
        if (processedCount > 0) {
          message += `\n\n📧 郵件已發送完成，第二封郵件將自動生成`;
        }
        SpreadsheetApp.getUi().alert('Send Now 結果', message, SpreadsheetApp.getUi().ButtonSet.OK);
      }

    } catch (error) {
      console.error('Send Now 從選單執行失敗:', error);
      SpreadsheetApp.getUi().alert('錯誤', `Send Now 執行失敗: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  },

  /**
   * 批量生成下一封郵件
   */
  batchGenerateNextMails(needsNextMailList) {
    try {
      console.log(`開始批量生成 ${needsNextMailList.length} 封第二封郵件...`);

      let successCount = 0;
      let errorCount = 0;

      for (const item of needsNextMailList) {
        try {
          console.log(`生成第 ${item.rowIndex} 行的第二封郵件 (${item.emailType})`);
          EmailService.generateNextMailIfNeeded(item.rowIndex, 'mail1', item.firstName);
          successCount++;
        } catch (error) {
          console.error(`第 ${item.rowIndex} 行第二封郵件生成失敗:`, error);
          errorCount++;
        }
      }

      // 顯示生成結果
      const resultMessage = `第二封郵件生成完成！\n\n✅ 成功生成: ${successCount} 封\n${errorCount > 0 ? `❌ 生成失敗: ${errorCount} 封` : ''}`;
      SpreadsheetApp.getUi().alert('郵件生成結果', resultMessage, SpreadsheetApp.getUi().ButtonSet.OK);

      console.log(`批量生成第二封郵件完成: 成功 ${successCount}/${needsNextMailList.length}`);

    } catch (error) {
      console.error('批量生成第二封郵件失敗:', error);
      SpreadsheetApp.getUi().alert('生成錯誤', `第二封郵件生成失敗: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
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
  },

  /**
   * 手動測試像素追蹤功能
   */
  testPixelTrackingManually() {
    try {
      return PixelTrackingService.testPixelTracking();
    } catch (error) {
      console.error('測試像素追蹤功能時發生錯誤:', error);
      SpreadsheetApp.getUi().alert('測試錯誤', `像素追蹤測試失敗：${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      return { error: error.message };
    }
  },

  /**
   * 顯示像素追蹤統計
   */
  showPixelTrackingStats() {
    try {
      const stats = PixelTrackingService.getPixelTrackingStats();

      let message = `📊 像素追蹤統計報告：\n\n`;

      if (stats.error) {
        message += `❌ 錯誤：${stats.error}`;
      } else {
        message += `📧 總發送數：${stats.totalRows} 個潛在客戶\n`;
        message += `👀 已開信數：${stats.openedCount} 人\n`;
        message += `💬 已回信數：${stats.repliedCount} 人\n`;
        message += `📈 開信率：${stats.openRate}%\n\n`;

        if (stats.totalRows > 0) {
          const replyRate = (stats.repliedCount / stats.totalRows * 100).toFixed(1);
          message += `💌 回信率：${replyRate}%`;
        } else {
          message += `尚無發送記錄`;
        }
      }

      SpreadsheetApp.getUi().alert('像素追蹤統計', message, SpreadsheetApp.getUi().ButtonSet.OK);

      return stats;

    } catch (error) {
      console.error('顯示像素追蹤統計時發生錯誤:', error);
      SpreadsheetApp.getUi().alert('統計錯誤', `無法獲取像素追蹤統計：${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      return { error: error.message };
    }
  },

  /**
   * 檢查開信與回覆 - 綜合測試功能
   */
  checkOpenAndReplies() {
    try {
      const ui = SpreadsheetApp.getUi();

      console.log('=== 開始檢查開信與回覆 ===');

      // 1. 檢查像素追蹤
      console.log('步驟1: 檢查像素開信記錄');
      const pixelResult = PixelTrackingService.checkPixelOpens();

      // 2. 檢查回覆檢測
      console.log('步驟2: 檢查郵件回覆');
      const replyResult = ReplyDetectionService.checkAllRunningLeadsForReplies();

      // 3. 檢查退信狀態
      console.log('步驟3: 檢查郵件退信');
      const bounceResult = BounceDetectionService.checkAllRunningLeadsForBounces();

      // 4. 獲取統計資訊
      const stats = PixelTrackingService.getPixelTrackingStats();

      // 組合結果訊息
      let message = `👀 開信與回覆檢查結果：\n\n`;

      // 像素追蹤結果
      if (pixelResult.error) {
        message += `📧 開信檢查：❌ 錯誤 - ${pixelResult.error}\n`;
        message += `💡 提示：請檢查 Firebase Functions 服務狀態\n`;
      } else {
        message += `📧 開信檢查：✅ 檢查了 ${pixelResult.checked} 個記錄，更新了 ${pixelResult.opened} 個開信狀態\n`;
      }

      // 回覆檢測結果
      if (replyResult.error) {
        message += `💬 回覆檢查：❌ 錯誤 - ${replyResult.error}\n`;
      } else {
        message += `💬 回覆檢查：✅ 檢查了 ${replyResult.checked} 個潛客，發現 ${replyResult.repliesFound} 個回覆\n`;
      }

      // 退信檢測結果
      if (bounceResult.error) {
        message += `📤 退信檢查：❌ 錯誤 - ${bounceResult.error}\n`;
      } else {
        message += `📤 退信檢查：✅ 檢查了 ${bounceResult.checked} 個潛客，發現 ${bounceResult.bouncesFound} 個退信\n`;
      }

      // 總體統計
      message += `\n📊 總體統計（基於歷史記錄）：\n`;
      if (stats.error) {
        message += `❌ 統計錯誤：${stats.error}`;
      } else {
        message += `📧 總發送：${stats.totalRows} 個潛客\n`;
        message += `👀 已開信：${stats.openedCount} 人 (${stats.openRate}%)\n`;
        message += `💬 已回信：${stats.repliedCount} 人`;

        if (stats.totalRows > 0) {
          const replyRate = (stats.repliedCount / stats.totalRows * 100).toFixed(1);
          message += ` (${replyRate}%)`;
        }

        message += `\n\n💡 說明：統計數據是基於 info 欄位的歷史記錄，檢查結果顯示的是新發現的開信/回覆`;
      }

      // 更新統計儀表板
      console.log('更新統計儀表板...');
      const dashboardResult = AnalyticsService.updateSummaryStatistics();
      if (dashboardResult.success) {
        console.log('統計儀表板更新成功');
        message += `\n\n📊 統計儀表板已更新 (請查看 R1/S1/T1 儲存格)`;
      } else {
        console.error('統計儀表板更新失敗:', dashboardResult.error);
        message += `\n\n⚠️ 統計儀表板更新失敗`;
      }

      ui.alert('開信與回覆檢查', message, ui.ButtonSet.OK);

      console.log('=== 開信與回覆檢查完成 ===');

      return {
        pixelResult,
        replyResult,
        bounceResult,
        stats
      };

    } catch (error) {
      console.error('檢查開信與回覆時發生錯誤:', error);
      SpreadsheetApp.getUi().alert('檢查錯誤', `開信與回覆檢查失敗：${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      return { error: error.message };
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

function testPixelTrackingManually() {
  return MenuService.testPixelTrackingManually();
}

function showPixelTrackingStats() {
  return MenuService.showPixelTrackingStats();
}

function checkOpenAndReplies() {
  return MenuService.checkOpenAndReplies();
}