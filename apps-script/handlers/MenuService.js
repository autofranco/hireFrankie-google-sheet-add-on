/**
 * 選單服務 - 處理所有選單和用戶界面相關功能
 */

const MenuService = {
  
  /**
   * 從選單執行 Send Now（掃描所有勾選的復選框）
   */
  sendNowFromMenu() {
    try {
      const sheet = SheetService.getMainSheet();
      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        SpreadsheetApp.getUi().alert('No data', 'Sheet has no data', SpreadsheetApp.getUi().ButtonSet.OK);
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

            // 重新設置 Send Now 按鈕狀態（如果所有郵件已發送則清除）
            SheetService.setupSendNowButton(sheet, i);
            processedCount++;

          } catch (error) {
            console.error(`第 ${i} 行 Send Now 失敗:`, error);
            SheetService.updateInfo(sheet, i, `[Error] Send Now fail: ${error.message}`);
            errorCount++;
          }
        }
      }

      // 顯示結果
      if (processedCount === 0 && errorCount === 0) {
        SpreadsheetApp.getUi().alert('No checkbox selected', 'Please check box first, then click Send Now', SpreadsheetApp.getUi().ButtonSet.OK);
      } else {
        let message = `Send Now done!\n\n✅ Sent OK: ${processedCount} email`;
        if (errorCount > 0) {
          message += `\n❌ Send fail: ${errorCount} email`;
        }
        if (processedCount > 0) {
          message += `\n\n📧 Email sent. Next email will auto create`;
        }
        // 使用非阻塞toast通知顯示Send Now結果
        ToastService.showSuccess(`Send Now done: ${message.replace(/\n/g, ' ')}`, 4);
      }

    } catch (error) {
      console.error('Send Now 從選單執行失敗:', error);
      SpreadsheetApp.getUi().alert('Error', `Send Now fail: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  },

  /**
   * 切換語言並重新載入選單
   */
  toggleLanguageMenu() {
    try {
      const newLang = LocalizationService.toggleLanguage();
      const languageDisplayName = LocalizationService.getLanguageDisplayName(newLang);

      // 更新 User Info 工作表的郵件提示詞
      UserInfoService.updateEmailPromptsLanguage(newLang);

      // 重新載入選單
      onOpen();

      // 顯示成功訊息
      const message = newLang === 'en'
        ? `Language change to: ${languageDisplayName}\n\nAll content (Leads Profile, Mail Angles) and Email Prompts now use English.`
        : `Language change to: ${languageDisplayName}\n\nAll content (Leads Profile, Mail Angles) and Email Prompts now use Chinese.`;

      ToastService.showSuccess(message, 5);

    } catch (error) {
      console.error('切換語言失敗:', error);
      SpreadsheetApp.getUi().alert('Error', `Language switch fail: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  },

  /**
   * 顯示 Credits 資訊和購買選項
   */
  showCreditsInfo() {
    try {
      const ui = SpreadsheetApp.getUi();

      console.log('顯示 Credits 資訊...');

      // 獲取用戶 Credit 餘額
      const creditInfo = APIService.checkUserCredit();
      const credit = creditInfo.credit || 0;
      const email = creditInfo.email || 'Unknown';

      // 組合訊息
      let message = `Email: ${email}\n`;
      message += `Credits: ${credit}\n`;
      message += `Get more: https://hirefrankie.ai/#PRiCING`;

      ui.alert('💳 My Credits', message, ui.ButtonSet.OK);

    } catch (error) {
      console.error('顯示 Credits 資訊失敗:', error);
      SpreadsheetApp.getUi().alert(
        'Error',
        `Cannot get credits info: ${error.message}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
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
        if (stats.bouncedCount > 0) {
          const bounceRate = (stats.bouncedCount / stats.totalRows * 100).toFixed(1);
          message += `📤 退信：${stats.bouncedCount} 個 (${bounceRate}%)\n`;
          message += `✅ 送達：${stats.deliveredRows} 個\n`;
        }
        message += `👀 已開信：${stats.openedCount} 人 (${stats.openRate}%)\n`;
        message += `💬 已回信：${stats.repliedCount} 人`;

        if (stats.deliveredRows > 0) {
          const replyRate = (stats.repliedCount / stats.deliveredRows * 100).toFixed(1);
          message += ` (${replyRate}%)`;
        }

        message += `\n\n💡 說明：開信率和回信率基於成功送達的郵件計算，統計數據基於 info 欄位的歷史記錄`;
      }

      // 更新統計儀表板
      console.log('更新統計儀表板...');
      const dashboardResult = AnalyticsService.updateSummaryStatistics();
      if (dashboardResult.success) {
        console.log('統計儀表板更新成功');
        message += `\n\n📊 統計儀表板已更新 (請查看 S1/T1/U1 儲存格)`;
      } else {
        console.error('統計儀表板更新失敗:', dashboardResult.error);
        message += `\n\n⚠️ 統計儀表板更新失敗`;
      }

      // 開信與回覆檢查結果改為console log輸出，不中斷用戶操作
      console.log('📬 開信與回覆檢查結果:', message);

      console.log('=== 開信與回覆檢查完成 ===');

      return {
        pixelResult,
        replyResult,
        bounceResult,
        stats
      };

    } catch (error) {
      console.error('檢查開信與回覆時發生錯誤:', error);
      // 檢查錯誤改為console log輸出，不中斷用戶操作
      console.error('❌ 開信與回覆檢查失敗:', error.message);
      return { error: error.message };
    }
  }
};

// 全局函數包裝器
function sendNowFromMenu() {
  return MenuService.sendNowFromMenu();
}

function checkOpenAndReplies() {
  return MenuService.checkOpenAndReplies();
}

function toggleLanguageMenu() {
  return MenuService.toggleLanguageMenu();
}

function showCreditsInfo() {
  return MenuService.showCreditsInfo();
}