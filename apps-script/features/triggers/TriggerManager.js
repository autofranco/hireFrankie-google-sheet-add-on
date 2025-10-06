/**
 * 触发器管理服务 - 处理所有触发器相关操作
 */

const TriggerManager = {
  

  /**
   * 获取所有项目触发器
   */
  getAllTriggers() {
    return ScriptApp.getProjectTriggers();
  },

  /**
   * 删除特定触发器
   */
  deleteTrigger(trigger) {
    ScriptApp.deleteTrigger(trigger);
  },

  /**
   * 删除所有邮件相关触发器
   */
  // deleteAllEmailTriggers 已廢棄，現在使用 checkAndSendMails 機制


  /**
   * 創建全域郵件發送觸發器（正式模式專用）
   */
  createGlobalEmailTrigger() {
    try {
      // 檢查是否已存在全域觸發器
      const existingTriggers = this.getAllTriggers();
      const globalTriggerExists = existingTriggers.some(trigger =>
        trigger.getHandlerFunction() === 'checkAndSendMails'
      );

      if (!globalTriggerExists) {
        console.log('創建全域郵件發送觸發器（每小時執行一次）');
        ScriptApp.newTrigger('checkAndSendMails')
          .timeBased()
          .everyHours(1) // Google 最小間隔為1小時
          .create();
        console.log('✅ 全域郵件發送觸發器創建成功');
      } else {
        console.log('全域郵件發送觸發器已存在');
      }
    } catch (error) {
      console.error('創建全域郵件發送觸發器時發生錯誤:', error);
      throw new Error(`觸發器創建失敗: ${error.message}`);
    }
  },

  /**
   * 創建回覆檢測觸發器（每小時執行一次）
   */
  createReplyDetectionTrigger() {
    try {
      // 檢查是否已存在回覆檢測觸發器
      const existingTriggers = this.getAllTriggers();
      const replyTriggerExists = existingTriggers.some(trigger =>
        trigger.getHandlerFunction() === 'checkAllRunningLeadsForReplies'
      );

      if (!replyTriggerExists) {
        console.log('創建回覆檢測觸發器（每天早上 7:00 執行一次）');
        ScriptApp.newTrigger('checkAllRunningLeadsForReplies')
          .timeBased()
          .atHour(7)
          .everyDays(1)
          .create();
        console.log('✅ 回覆檢測觸發器創建成功');
      } else {
        console.log('回覆檢測觸發器已存在');
      }
    } catch (error) {
      console.error('創建回覆檢測觸發器時發生錯誤:', error);
      throw new Error(`回覆檢測觸發器創建失敗: ${error.message}`);
    }
  },

  /**
   * 創建像素追蹤觸發器（每小時執行一次）
   */
  createPixelTrackingTrigger() {
    try {
      // 檢查是否已存在像素追蹤觸發器
      const existingTriggers = this.getAllTriggers();
      const pixelTriggerExists = existingTriggers.some(trigger =>
        trigger.getHandlerFunction() === 'checkPixelOpens'
      );

      if (!pixelTriggerExists) {
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
   * 刪除回覆檢測觸發器
   */
  deleteReplyDetectionTrigger() {
    const triggers = this.getAllTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'checkAllRunningLeadsForReplies') {
        this.deleteTrigger(trigger);
        console.log('已刪除回覆檢測觸發器');
      }
    });
  },

  /**
   * 刪除像素追蹤觸發器
   */
  deletePixelTrackingTrigger() {
    const triggers = this.getAllTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'checkPixelOpens') {
        this.deleteTrigger(trigger);
        console.log('已刪除像素追蹤觸發器');
      }
    });
  },


  /**
   * 清理舊的多餘觸發器（避免達到20個觸發器上限）
   */
  cleanupOldTriggers() {
    const triggers = this.getAllTriggers();
    let deletedCount = 0;
    
    // 刪除舊版本的個別郵件觸發器
    triggers.forEach(trigger => {
      const handlerFunction = trigger.getHandlerFunction();
      // 只保留必要的觸發器，刪除舊的個別觸發器
      if (handlerFunction === 'sendScheduledEmail') {
        this.deleteTrigger(trigger);
        console.log(`清理舊觸發器: ${handlerFunction}`);
        deletedCount++;
      }
    });
    
    // 確保只有一個全域觸發器
    const globalTriggers = triggers.filter(t => t.getHandlerFunction() === 'checkAndSendMails');
    if (globalTriggers.length > 1) {
      // 保留最新的，刪除多餘的
      for (let i = 1; i < globalTriggers.length; i++) {
        this.deleteTrigger(globalTriggers[i]);
        deletedCount++;
        console.log('刪除多餘的全域觸發器');
      }
    }
    
    // 確保只有一個回覆檢測觸發器
    const replyTriggers = triggers.filter(t => t.getHandlerFunction() === 'checkAllRunningLeadsForReplies');
    if (replyTriggers.length > 1) {
      for (let i = 1; i < replyTriggers.length; i++) {
        this.deleteTrigger(replyTriggers[i]);
        deletedCount++;
        console.log('刪除多餘的回覆檢測觸發器');
      }
    }

    // 確保只有一個像素追蹤觸發器
    const pixelTriggers = triggers.filter(t => t.getHandlerFunction() === 'checkPixelOpens');
    if (pixelTriggers.length > 1) {
      for (let i = 1; i < pixelTriggers.length; i++) {
        this.deleteTrigger(pixelTriggers[i]);
        deletedCount++;
        console.log('刪除多餘的像素追蹤觸發器');
      }
    }
    
    if (deletedCount > 0) {
      console.log(`清理完成：刪除了 ${deletedCount} 個多餘觸發器`);
    }
    
    return deletedCount;
  },

  /**
   * 刪除所有 Auto Lead Warmer 相關觸發器
   */
  deleteAllLeadWarmerTriggers() {
    const triggers = this.getAllTriggers();
    let deletedCount = 0;

    triggers.forEach(trigger => {
      const handlerFunction = trigger.getHandlerFunction();
      if (handlerFunction === 'checkAndSendMails' ||
          handlerFunction === 'sendScheduledEmail' ||
          handlerFunction === 'checkAllRunningLeadsForReplies' ||
          handlerFunction === 'checkPixelOpens' ||
          handlerFunction === 'onEdit') {
        this.deleteTrigger(trigger);
        console.log(`已刪除觸發器: ${handlerFunction}`);
        deletedCount++;
      }
    });

    console.log(`總共刪除了 ${deletedCount} 個觸發器`);
    return deletedCount;
  },


  /**
   * 獲取觸發器統計資訊
   */
  getTriggerStats() {
    const triggers = this.getAllTriggers();
    const globalTriggers = triggers.filter(t => t.getHandlerFunction() === 'checkAndSendMails').length;
    const replyTriggers = triggers.filter(t => t.getHandlerFunction() === 'checkAllRunningLeadsForReplies').length;
    const pixelTriggers = triggers.filter(t => t.getHandlerFunction() === 'checkPixelOpens').length;
    const bounceTriggers = triggers.filter(t => t.getHandlerFunction() === 'checkAllRunningLeadsForBounces').length;

    return {
      total: triggers.length,
      globalTriggers,
      replyTriggers,
      pixelTriggers,
      bounceTriggers,
      others: triggers.length - globalTriggers - replyTriggers - pixelTriggers - bounceTriggers
    };
  },

  /**
   * 測試觸發器創建（帶延遲）- 診斷配額問題
   */
  testCreateTriggersWithDelay() {
    try {
      console.log('=== 開始測試觸發器創建（帶 5 秒延遲）===');

      // 1. 清理所有現有觸發器
      console.log('步驟 1: 清理現有觸發器...');
      const deletedCount = this.deleteAllLeadWarmerTriggers();
      console.log(`✅ 已刪除 ${deletedCount} 個觸發器`);

      // 等待刪除完成
      console.log('等待 3 秒讓刪除操作完成...');
      Utilities.sleep(3000);

      const results = {
        deleted: deletedCount,
        triggers: []
      };

      // 2. 創建第一個觸發器: checkAndSendMails
      console.log('\n步驟 2: 創建 checkAndSendMails 觸發器...');
      try {
        this.createGlobalEmailTrigger();
        console.log('✅ checkAndSendMails 觸發器創建成功');
        results.triggers.push({ name: 'checkAndSendMails', success: true });
      } catch (error) {
        console.error('❌ checkAndSendMails 觸發器創建失敗:', error.message);
        results.triggers.push({ name: 'checkAndSendMails', success: false, error: error.message });
      }

      // 等待 5 秒
      console.log('等待 5 秒...');
      Utilities.sleep(5000);

      // 3. 創建第二個觸發器: checkAllRunningLeadsForReplies
      console.log('\n步驟 3: 創建 checkAllRunningLeadsForReplies 觸發器...');
      try {
        this.createReplyDetectionTrigger();
        console.log('✅ checkAllRunningLeadsForReplies 觸發器創建成功');
        results.triggers.push({ name: 'checkAllRunningLeadsForReplies', success: true });
      } catch (error) {
        console.error('❌ checkAllRunningLeadsForReplies 觸發器創建失敗:', error.message);
        results.triggers.push({ name: 'checkAllRunningLeadsForReplies', success: false, error: error.message });
      }

      // 等待 5 秒
      console.log('等待 5 秒...');
      Utilities.sleep(5000);

      // 4. 創建第三個觸發器: checkPixelOpens
      console.log('\n步驟 4: 創建 checkPixelOpens 觸發器...');
      try {
        this.createPixelTrackingTrigger();
        console.log('✅ checkPixelOpens 觸發器創建成功');
        results.triggers.push({ name: 'checkPixelOpens', success: true });
      } catch (error) {
        console.error('❌ checkPixelOpens 觸發器創建失敗:', error.message);
        results.triggers.push({ name: 'checkPixelOpens', success: false, error: error.message });
      }

      // 5. 總結
      console.log('\n=== 測試完成 ===');
      const successCount = results.triggers.filter(t => t.success).length;
      const failCount = results.triggers.filter(t => !t.success).length;
      console.log(`成功: ${successCount} 個`);
      console.log(`失敗: ${failCount} 個`);

      results.triggers.forEach(trigger => {
        if (trigger.success) {
          console.log(`  ✅ ${trigger.name}`);
        } else {
          console.log(`  ❌ ${trigger.name}: ${trigger.error}`);
        }
      });

      // 顯示提示給用戶
      SpreadsheetApp.getUi().alert(
        '測試完成',
        `觸發器創建測試結果：\n\n成功: ${successCount} 個\n失敗: ${failCount} 個\n\n詳細結果請查看執行日誌 (Apps Script → 執行)`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );

      return results;

    } catch (error) {
      console.error('測試過程發生錯誤:', error);
      SpreadsheetApp.getUi().alert('測試失敗', `錯誤: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      throw error;
    }
  }
};

// 全局函数包装器
function cleanupTriggers() {
  return TriggerManager.cleanupOldTriggers();
}

function testCreateTriggersWithDelay() {
  return TriggerManager.testCreateTriggersWithDelay();
}