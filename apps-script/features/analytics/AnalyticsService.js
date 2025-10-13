/**
 * 分析服務 - 簡化統計分析和可視化
 * 以潛在客戶為單位統計，而非以郵件為單位
 */

const AnalyticsService = {

  /**
   * 更新總覽統計資料到 R1/S1/T1 儲存格
   */
  updateSummaryStatistics() {
    try {
      console.log('=== 更新總覽統計資料 ===');

      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

      // 獲取各項統計資料（以潛在客戶為單位）
      const bounceStats = this.getBounceStatistics();
      const openStats = this.getOpenStatistics();
      const replyStats = this.getReplyStatistics();

      // 更新 S1: Bounce Rate (紅色背景)
      const bounceText = `Bounce Rate: ${bounceStats.bounceRate}% (${bounceStats.totalBounced}/${bounceStats.totalLeads})`;
      const bounceCell = sheet.getRange('S1');
      bounceCell.setValue(bounceText);
      bounceCell.setBackground('#ffebee'); // 淺紅色背景
      bounceCell.setFontColor('#c62828'); // 深紅色字體
      bounceCell.setFontWeight('bold');

      // 更新 T1: Open Rate (綠色背景) - 基於送達郵件計算
      const openText = `Open Rate: ${openStats.openRate}% (${openStats.totalOpened}/${openStats.deliveredLeads})`;
      const openCell = sheet.getRange('T1');
      openCell.setValue(openText);
      openCell.setBackground('#e8f5e8'); // 淺綠色背景
      openCell.setFontColor('#2e7d32'); // 深綠色字體
      openCell.setFontWeight('bold');

      // 更新 U1: Reply Rate (藍色背景) - 基於送達郵件計算
      const replyText = `Reply Rate: ${replyStats.replyRate}% (${replyStats.totalReplied}/${replyStats.deliveredLeads})`;
      const replyCell = sheet.getRange('U1');
      replyCell.setValue(replyText);
      replyCell.setBackground('#e3f2fd'); // 淺藍色背景
      replyCell.setFontColor('#1976d2'); // 深藍色字體
      replyCell.setFontWeight('bold');

      console.log(`✅ 統計更新完成:`);
      console.log(`   - ${bounceText}`);
      console.log(`   - ${openText}`);
      console.log(`   - ${replyText}`);

      return {
        success: true,
        bounceStats,
        openStats,
        replyStats
      };

    } catch (error) {
      console.error('更新總覽統計資料時發生錯誤:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 獲取退信統計資料（以潛在客戶為單位）
   * 如果第一封郵件退信，該潛在客戶就算退信
   */
  getBounceStatistics() {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        return { bounceRate: 0, totalLeads: 0, totalBounced: 0 };
      }

      let totalLeads = 0;
      let totalBounced = 0;

      // 統計每個潛在客戶
      for (let i = 2; i <= lastRow; i++) {
        const status = sheet.getRange(i, COLUMNS.STATUS + 1).getValue();

        // 只統計已處理的潛在客戶
        if (status === 'Running' || status === 'Done') {
          // 檢查是否有發送過至少一封郵件
          const schedule1 = sheet.getRange(i, COLUMNS.SCHEDULE_1 + 1);
          const hasSentEmail = schedule1.getFontLine() === 'line-through';

          if (hasSentEmail) {
            totalLeads++;

            // 檢查是否有退信
            const info = sheet.getRange(i, COLUMNS.INFO + 1).getValue();
            if (info && info.toString().toLowerCase().includes('bounced')) {
              totalBounced++;
            }
          }
        }
      }

      const bounceRate = totalLeads > 0 ? Math.round((totalBounced / totalLeads) * 100) : 0;

      return {
        bounceRate: bounceRate,
        totalLeads: totalLeads,
        totalBounced: totalBounced
      };

    } catch (error) {
      console.error('獲取退信統計時發生錯誤:', error);
      return { bounceRate: 0, totalLeads: 0, totalBounced: 0, error: error.message };
    }
  },

  /**
   * 獲取開信統計資料（以潛在客戶為單位）
   * 如果潛在客戶開啟任何一封郵件，就算開信
   * 排除退信的潛在客戶
   */
  getOpenStatistics() {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        return { openRate: 0, totalLeads: 0, totalOpened: 0, deliveredLeads: 0 };
      }

      let totalSentLeads = 0;    // 總發送潛在客戶數
      let bouncedLeads = 0;      // 退信潛在客戶數
      let totalOpened = 0;       // 開信潛在客戶數

      // 統計每個潛在客戶
      for (let i = 2; i <= lastRow; i++) {
        const status = sheet.getRange(i, COLUMNS.STATUS + 1).getValue();

        // 只統計已處理的潛在客戶
        if (status === 'Running' || status === 'Done') {
          // 檢查是否有發送過至少一封郵件
          const schedule1 = sheet.getRange(i, COLUMNS.SCHEDULE_1 + 1);
          const hasSentEmail = schedule1.getFontLine() === 'line-through';

          if (hasSentEmail) {
            totalSentLeads++;

            // 檢查是否為退信
            const info = sheet.getRange(i, COLUMNS.INFO + 1).getValue();
            const infoLower = info ? info.toString().toLowerCase() : '';
            const isBounced = infoLower.includes('bounced');

            if (isBounced) {
              bouncedLeads++;
            } else {
              // 只統計未退信的潛在客戶的開信狀態
              if (info && (info.toString().includes('Email opened') || info.toString().includes('Lead replied'))) {
                totalOpened++;
              }
            }
          }
        }
      }

      // 計算成功送達的潛在客戶數
      const deliveredLeads = totalSentLeads - bouncedLeads;
      const openRate = deliveredLeads > 0 ? Math.round((totalOpened / deliveredLeads) * 100) : 0;

      return {
        openRate: openRate,
        totalLeads: totalSentLeads,      // 總發送潛在客戶數
        deliveredLeads: deliveredLeads,  // 成功送達潛在客戶數
        totalOpened: totalOpened         // 開信潛在客戶數
      };

    } catch (error) {
      console.error('獲取開信統計時發生錯誤:', error);
      return { openRate: 0, totalLeads: 0, deliveredLeads: 0, totalOpened: 0, error: error.message };
    }
  },

  /**
   * 獲取回信統計資料（以潛在客戶為單位）
   * 如果潛在客戶回信任何一封郵件，就算回信
   * 排除退信的潛在客戶
   */
  getReplyStatistics() {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) {
        return { replyRate: 0, totalLeads: 0, totalReplied: 0, deliveredLeads: 0 };
      }

      let totalSentLeads = 0;    // 總發送潛在客戶數
      let bouncedLeads = 0;      // 退信潛在客戶數
      let totalReplied = 0;      // 回信潛在客戶數

      // 統計每個潛在客戶
      for (let i = 2; i <= lastRow; i++) {
        const status = sheet.getRange(i, COLUMNS.STATUS + 1).getValue();

        // 只統計已處理的潛在客戶
        if (status === 'Running' || status === 'Done') {
          // 檢查是否有發送過至少一封郵件
          const schedule1 = sheet.getRange(i, COLUMNS.SCHEDULE_1 + 1);
          const hasSentEmail = schedule1.getFontLine() === 'line-through';

          if (hasSentEmail) {
            totalSentLeads++;

            // 檢查是否為退信
            const info = sheet.getRange(i, COLUMNS.INFO + 1).getValue();
            const infoLower = info ? info.toString().toLowerCase() : '';
            const isBounced = infoLower.includes('bounced');

            if (isBounced) {
              bouncedLeads++;
            } else {
              // 只統計未退信的潛在客戶的回信狀態
              if (info && info.toString().includes('Lead replied')) {
                totalReplied++;
              }
            }
          }
        }
      }

      // 計算成功送達的潛在客戶數
      const deliveredLeads = totalSentLeads - bouncedLeads;
      const replyRate = deliveredLeads > 0 ? Math.round((totalReplied / deliveredLeads) * 100) : 0;

      return {
        replyRate: replyRate,
        totalLeads: totalSentLeads,      // 總發送潛在客戶數
        deliveredLeads: deliveredLeads,  // 成功送達潛在客戶數
        totalReplied: totalReplied       // 回信潛在客戶數
      };

    } catch (error) {
      console.error('獲取回信統計時發生錯誤:', error);
      return { replyRate: 0, totalLeads: 0, deliveredLeads: 0, totalReplied: 0, error: error.message };
    }
  },

};


// 全局函數包裝器
function updateSummaryStatistics() {
  return AnalyticsService.updateSummaryStatistics();
}

