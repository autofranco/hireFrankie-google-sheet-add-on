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
  }
};

// 全局函数包装器
function cleanupTriggers() {
  return TriggerManager.cleanupTriggers();
}