/**
 * 像素追蹤服務 - 處理 Gmail 開信檢測
 */

const PixelTrackingService = {

  /**
   * 檢查像素開信記錄並更新 Google Sheets
   * 類似於 ReplyDetectionService 的運作模式
   */
  checkPixelOpens() {
    try {
      console.log('=== 開始檢查像素開信記錄 ===');

      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        console.log('沒有資料需要檢查');
        return { checked: 0, opened: 0 };
      }

      // 從 Firebase Functions 獲取開信記錄
      const opensData = this.getPixelOpensFromFirebase(spreadsheetId);

      if (!opensData.success || opensData.opens.length === 0) {
        console.log('沒有新的開信記錄');
        return { checked: 0, opened: 0 };
      }

      let checkedCount = 0;
      let openedCount = 0;

      // 處理每個開信記錄
      opensData.opens.forEach(openRecord => {
        try {
          const { rowIndex, emailType, openedTime } = openRecord;

          // 調試：記錄接收到的開信記錄詳細資訊
          console.log(`🔍 收到開信記錄: rowIndex=${rowIndex}, emailType=${emailType}, openedTime=${openedTime}`);

          // 驗證行索引
          if (rowIndex < 2 || rowIndex > lastRow) {
            console.log(`跳過無效的行索引: ${rowIndex}`);
            return;
          }


          checkedCount++;

          // 獲取當前狀態
          const currentInfo = sheet.getRange(rowIndex, COLUMNS.INFO + 1).getValue();

          // 檢查狀態優先級：只在不是 'Lead replied' 時更新為 'Email opened'
          if (currentInfo && currentInfo.includes('Lead replied')) {
            console.log(`第 ${rowIndex} 行已經是 'Lead replied' 狀態，跳過開信更新`);
            return;
          }

          // 檢查是否已經是退信狀態，退信狀態優先級高於開信
          if (currentInfo && currentInfo.toLowerCase().includes('bounced')) {
            console.log(`第 ${rowIndex} 行已經是 'bounced' 狀態，跳過開信更新`);
            return;
          }

          // 更新為已開信狀態
          const openedTimeStr = new Date(openedTime).toLocaleString('en-US');
          const newInfo = `Email opened (${openedTimeStr})`;

          SheetService.updateInfo(sheet, rowIndex, newInfo);
          openedCount++;

          console.log(`✅ 更新開信狀態: Row ${rowIndex} ${emailType} - ${openedTimeStr}`);

        } catch (recordError) {
          console.error('處理開信記錄時發生錯誤:', recordError);
        }
      });

      console.log(`=== 像素開信檢查完成 ===`);
      console.log(`檢查了 ${checkedCount} 個開信記錄，更新了 ${openedCount} 個狀態`);

      return { checked: checkedCount, opened: openedCount };

    } catch (error) {
      console.error('檢查像素開信記錄時發生錯誤:', error);
      return { error: error.message };
    }
  },

  /**
   * 從 Firebase Functions 獲取開信記錄
   * @param {string} spreadsheetId - Google Sheets ID
   * @returns {Object} 開信記錄數據
   */
  getPixelOpensFromFirebase(spreadsheetId) {
    try {
      const firebaseUrl = 'https://asia-east1-auto-lead-warmer-mvp.cloudfunctions.net/getPixelOpens';

      const payload = {
        data: {
          spreadsheetId: spreadsheetId,
          markAsProcessed: true, // 標記為已處理，避免重複
          limit: 100
        }
      };

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      };

      console.log(`正在查詢 Firebase Functions 開信記錄: ${spreadsheetId}`);

      const response = UrlFetchApp.fetch(firebaseUrl, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      console.log(`Firebase Functions 響應碼: ${responseCode}`);

      if (responseCode !== 200) {
        console.error(`Firebase Functions 調用失敗: ${responseCode} - ${responseText}`);
        throw new Error(`Firebase Functions 調用失敗: ${responseCode} - 請檢查後端服務狀態`);
      }

      const responseData = JSON.parse(responseText);

      console.log(`Firebase Functions 回應: 找到 ${responseData.result?.totalCount || 0} 個開信記錄`);

      return responseData.result || { success: false, opens: [] };

    } catch (error) {
      console.error('從 Firebase Functions 獲取開信記錄失敗:', error);
      return { success: false, opens: [], error: error.message };
    }
  },

  /**
   * 創建像素追蹤觸發器（每小時執行一次）
   */
  createPixelTrackingTrigger() {
    try {
      const existingTriggers = ScriptApp.getProjectTriggers();
      const triggerExists = existingTriggers.some(trigger =>
        trigger.getHandlerFunction() === 'checkPixelOpens'
      );

      if (!triggerExists) {
        console.log('創建像素追蹤觸發器（每小時執行一次）');
        ScriptApp.newTrigger('checkPixelOpens')
          .timeBased()
          .everyHours(1)
          .create();
        console.log('✅ 像素追蹤觸發器創建成功');
      } else {
        console.log('像素追蹤觸發器已存在');
      }
    } catch (error) {
      console.error('創建像素追蹤觸發器時發生錯誤:', error);
      throw new Error(`像素追蹤觸發器創建失敗: ${error.message}`);
    }
  },

  /**
   * 刪除像素追蹤觸發器
   */
  deletePixelTrackingTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'checkPixelOpens') {
        ScriptApp.deleteTrigger(trigger);
        console.log('已刪除像素追蹤觸發器');
      }
    });
  },

  /**
   * 獲取像素追蹤統計資訊
   */
  getPixelTrackingStats() {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        return {
          totalRows: 0,
          openedCount: 0,
          repliedCount: 0,
          openRate: 0
        };
      }

      let openedCount = 0;
      let repliedCount = 0;
      let totalSentRows = 0;  // 總發送郵件數
      let bouncedCount = 0;   // 退信郵件數

      // 掃描所有行統計開信和回信狀態
      for (let i = 2; i <= lastRow; i++) {
        const status = sheet.getRange(i, COLUMNS.STATUS + 1).getValue();
        const info = sheet.getRange(i, COLUMNS.INFO + 1).getValue();

        // 只統計已發送的郵件（Running 或 Done 狀態）
        if (status === 'Running' || status === 'Done') {
          totalSentRows++; // 計入總發送數

          // 檢查是否為退信郵件
          const infoLower = info ? info.toString().toLowerCase() : '';
          const isBounced = infoLower.includes('bounced');

          if (isBounced) {
            bouncedCount++;
            console.log(`第 ${i} 行為退信郵件: ${info}`);
          } else {
            // 只統計未退信的郵件的開信和回信狀態
            if (info && info.includes('Lead replied')) {
              repliedCount++;
              openedCount++; // 回信的客戶肯定也開信了
            } else if (info && info.includes('Email opened')) {
              openedCount++;
            }
          }
        }
      }

      // 計算成功送達的郵件數（總發送數 - 退信數）
      const deliveredCount = totalSentRows - bouncedCount;

      // 開信率和回信率基於成功送達的郵件計算
      const openRate = deliveredCount > 0 ? (openedCount / deliveredCount * 100).toFixed(1) : 0;

      return {
        totalRows: totalSentRows,        // 總發送郵件數
        deliveredRows: deliveredCount,   // 成功送達郵件數
        bouncedCount: bouncedCount,      // 退信郵件數
        openedCount: openedCount,        // 開信郵件數
        repliedCount: repliedCount,      // 回信郵件數
        openRate: parseFloat(openRate)   // 開信率（基於送達郵件）
      };

    } catch (error) {
      console.error('獲取像素追蹤統計時發生錯誤:', error);
      return {
        totalRows: 0,
        deliveredRows: 0,
        bouncedCount: 0,
        openedCount: 0,
        repliedCount: 0,
        openRate: 0,
        error: error.message
      };
    }
  }
};

// 全局函數包裝器
function checkPixelOpens() {
  return PixelTrackingService.checkPixelOpens();
}

function createPixelTrackingTrigger() {
  return PixelTrackingService.createPixelTrackingTrigger();
}

function deletePixelTrackingTrigger() {
  return PixelTrackingService.deletePixelTrackingTrigger();
}

