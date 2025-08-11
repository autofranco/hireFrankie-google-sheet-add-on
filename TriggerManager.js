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
  deleteAllEmailTriggers() {
    const triggers = this.getAllTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'sendScheduledEmail') {
        this.deleteTrigger(trigger);
      }
    });
  },


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
   * 刪除全域郵件發送觸發器
   */
  deleteGlobalEmailTrigger() {
    const triggers = this.getAllTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'checkAndSendMails') {
        this.deleteTrigger(trigger);
        console.log('已刪除全域郵件發送觸發器');
      }
    });
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
        console.log('創建回覆檢測觸發器（每小時執行一次）');
        ScriptApp.newTrigger('checkAllRunningLeadsForReplies')
          .timeBased()
          .everyHours(1)
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
    
    return {
      total: triggers.length,
      globalTriggers, 
      replyTriggers,
      others: triggers.length - globalTriggers - replyTriggers
    };
  }
};

// 全局函数包装器
function cleanupTriggers() {
  return TriggerManager.cleanupOldTriggers();
}