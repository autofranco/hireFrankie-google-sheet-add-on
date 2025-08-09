/**
 * 触发器管理服务 - 处理所有触发器相关操作
 */

const TriggerManager = {
  
  /**
   * 清理过期的触发器和属性
   */
  cleanupTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    const now = new Date().getTime();
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'sendScheduledEmail') {
        // 如果触发器已经过期超过1小时，则删除
        if (trigger.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
          // 这里需要实作逻辑来检查触发器是否过期
          // 由于无法直接取得触发器的时间，建议定期手动清理
        }
      }
    });
    
    // 清理过期的属性
    const properties = PropertiesService.getScriptProperties().getProperties();
    for (const [key, value] of Object.entries(properties)) {
      if (key.startsWith('email_')) {
        const scheduleTime = parseInt(key.split('_')[1]);
        // 如果排程时间已过期超过1小时，则删除
        if (now - scheduleTime > 60 * 60 * 1000) {
          PropertiesService.getScriptProperties().deleteProperty(key);
        }
      }
    }
  },

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
   * 创建清理触发器（每小时执行一次）
   */
  createCleanupTrigger() {
    ScriptApp.newTrigger('cleanupTriggers')
      .timeBased()
      .everyHours(1)
      .create();
  },

  /**
   * 創建全域郵件發送觸發器（正式模式專用）
   */
  createGlobalEmailTrigger() {
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
    } else {
      console.log('全域郵件發送觸發器已存在');
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
          handlerFunction === 'cleanupTriggers') {
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
    const emailTriggers = triggers.filter(t => t.getHandlerFunction() === 'sendScheduledEmail').length;
    const globalTriggers = triggers.filter(t => t.getHandlerFunction() === 'checkAndSendMails').length;
    const cleanupTriggers = triggers.filter(t => t.getHandlerFunction() === 'cleanupTriggers').length;
    
    return {
      total: triggers.length,
      emailTriggers,
      globalTriggers, 
      cleanupTriggers,
      others: triggers.length - emailTriggers - globalTriggers - cleanupTriggers
    };
  }
};

// 全局函数包装器
function cleanupTriggers() {
  return TriggerManager.cleanupTriggers();
}