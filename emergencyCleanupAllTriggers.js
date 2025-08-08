/**
 * 触发器清理和管理解决方案
 * 解决 "指令碼包含過多觸發條件" 的错误
 */

/**
 * 立即清理所有触发器 - 紧急修复函数
 */
function emergencyCleanupAllTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    console.log(`发现 ${triggers.length} 个触发器`);
    
    let deletedCount = 0;
    
    triggers.forEach(trigger => {
      try {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log(`删除触发器: ${trigger.getHandlerFunction()}`);
      } catch (error) {
        console.error(`删除触发器失败: ${error.message}`);
      }
    });
    
    // 清理所有邮件相关的属性
    const properties = PropertiesService.getScriptProperties().getProperties();
    let clearedProperties = 0;
    
    for (const [key, value] of Object.entries(properties)) {
      if (key.startsWith('email_')) {
        PropertiesService.getScriptProperties().deleteProperty(key);
        clearedProperties++;
      }
    }
    
    const message = `✅ 紧急清理完成！
    
删除的触发器: ${deletedCount} 个
清理的属性: ${clearedProperties} 个

现在可以重新运行脚本了。`;
    
    SpreadsheetApp.getUi().alert('清理完成', message, SpreadsheetApp.getUi().ButtonSet.OK);
    console.log('紧急清理完成');
    
  } catch (error) {
    console.error('紧急清理失败:', error);
    SpreadsheetApp.getUi().alert('清理失败', `错误: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 查看当前触发器状态
 */
function checkTriggersStatus() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    console.log('=== 触发器状态检查 ===');
    
    if (triggers.length === 0) {
      SpreadsheetApp.getUi().alert('触发器状态', '当前没有任何触发器', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    let triggerInfo = `当前触发器总数: ${triggers.length}\n\n`;
    let emailTriggers = 0;
    let otherTriggers = 0;
    
    triggers.forEach((trigger, index) => {
      const handlerFunction = trigger.getHandlerFunction();
      const triggerSource = trigger.getTriggerSource();
      
      console.log(`触发器 ${index + 1}:`);
      console.log(`  函数: ${handlerFunction}`);
      console.log(`  类型: ${triggerSource}`);
      
      if (handlerFunction === 'sendScheduledEmail') {
        emailTriggers++;
      } else {
        otherTriggers++;
      }
      
      if (index < 10) { // 只显示前10个避免消息过长
        triggerInfo += `${index + 1}. ${handlerFunction} (${triggerSource})\n`;
      }
    });
    
    if (triggers.length > 10) {
      triggerInfo += `... 还有 ${triggers.length - 10} 个触发器\n`;
    }
    
    triggerInfo += `\n邮件触发器: ${emailTriggers} 个\n其他触发器: ${otherTriggers} 个`;
    
    if (emailTriggers > 15) {
      triggerInfo += '\n\n⚠️ 邮件触发器过多，建议清理！';
    }
    
    SpreadsheetApp.getUi().alert('触发器状态', triggerInfo, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('检查触发器状态失败:', error);
    SpreadsheetApp.getUi().alert('检查失败', `错误: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 智能清理旧的邮件触发器
 */
function smartCleanupEmailTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const now = new Date();
    let deletedCount = 0;
    
    // 删除所有 sendScheduledEmail 触发器
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'sendScheduledEmail') {
        try {
          ScriptApp.deleteTrigger(trigger);
          deletedCount++;
        } catch (error) {
          console.error(`删除邮件触发器失败: ${error.message}`);
        }
      }
    });
    
    // 清理过期的邮件属性（超过24小时的）
    const properties = PropertiesService.getScriptProperties().getProperties();
    let clearedProperties = 0;
    
    for (const [key, value] of Object.entries(properties)) {
      if (key.startsWith('email_')) {
        try {
          const scheduleTime = parseInt(key.split('_')[1]);
          const timeDiff = now.getTime() - scheduleTime;
          
          // 删除超过24小时的属性
          if (timeDiff > 24 * 60 * 60 * 1000) {
            PropertiesService.getScriptProperties().deleteProperty(key);
            clearedProperties++;
          }
        } catch (error) {
          // 如果解析失败，也删除这个属性
          PropertiesService.getScriptProperties().deleteProperty(key);
          clearedProperties++;
        }
      }
    }
    
    const message = `🧹 智能清理完成！
    
删除的邮件触发器: ${deletedCount} 个
清理的过期属性: ${clearedProperties} 个

剩余触发器: ${ScriptApp.getProjectTriggers().length} 个`;
    
    SpreadsheetApp.getUi().alert('清理完成', message, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    console.error('智能清理失败:', error);
    SpreadsheetApp.getUi().alert('清理失败', `错误: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// 更新的 TriggerManager.gs
const ImprovedTriggerManager = {
  
  /**
   * 安全创建触发器 - 检查数量限制
   */
  safeCreateTrigger(functionName, scheduleTime) {
    const currentTriggers = ScriptApp.getProjectTriggers();
    
    // 如果触发器太多，先清理
    if (currentTriggers.length >= 18) { // 留2个缓冲
      console.log('触发器接近限制，执行智能清理...');
      this.cleanupOldEmailTriggers();
    }
    
    // 检查是否还有空间
    const updatedTriggers = ScriptApp.getProjectTriggers();
    if (updatedTriggers.length >= 20) {
      throw new Error('触发器数量已达上限，请手动清理后重试');
    }
    
    // 创建新触发器
    return ScriptApp.newTrigger(functionName)
      .timeBased()
      .at(scheduleTime)
      .create();
  },
  
  /**
   * 清理旧的邮件触发器
   */
  cleanupOldEmailTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    const now = new Date();
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'sendScheduledEmail') {
        // 删除所有邮件触发器，因为我们无法直接获取其计划时间
        try {
          ScriptApp.deleteTrigger(trigger);
        } catch (error) {
          console.error('删除触发器失败:', error);
        }
      }
    });
  },
  
  /**
   * 批量创建邮件触发器 - 改进版
   */
  batchCreateEmailTriggers(emailData) {
    // 先清理旧触发器
    this.cleanupOldEmailTriggers();
    
    const triggers = [];
    
    emailData.forEach((data, index) => {
      try {
        const trigger = this.safeCreateTrigger('sendScheduledEmail', data.scheduleTime);
        triggers.push(trigger);
        
        // 保存触发器对应的邮件数据
        const propertyKey = `email_${data.scheduleTime.getTime()}_${data.email}`;
        PropertiesService.getScriptProperties().setProperty(propertyKey, JSON.stringify(data));
        
      } catch (error) {
        console.error(`创建第 ${index + 1} 个邮件触发器失败:`, error);
        throw error;
      }
    });
    
    return triggers;
  }
};

// 更新的 EmailService 中的 scheduleEmails 函数
const ImprovedEmailService = {
  
  /**
   * 改进的邮件排程函数
   */
  scheduleEmails(email, firstName, followUpMails, schedules, rowIndex) {
    try {
      const emailData = [
        {
          email: email,
          firstName: firstName,
          content: followUpMails.mail1,
          scheduleType: 'mail1',
          rowIndex: rowIndex,
          scheduleTime: schedules.schedule1
        },
        {
          email: email,
          firstName: firstName,
          content: followUpMails.mail2,
          scheduleType: 'mail2',
          rowIndex: rowIndex,
          scheduleTime: schedules.schedule2
        },
        {
          email: email,
          firstName: firstName,
          content: followUpMails.mail3,
          scheduleType: 'mail3',
          rowIndex: rowIndex,
          scheduleTime: schedules.schedule3
        }
      ];
      
      // 使用改进的触发器管理器
      ImprovedTriggerManager.batchCreateEmailTriggers(emailData);
      
      console.log(`为 ${email} 创建了 3 个邮件发送触发器`);
      
    } catch (error) {
      console.error('创建邮件触发器失败:', error);
      throw new Error(`邮件排程失败: ${error.message}`);
    }
  },
  
  /**
   * 原有的发送邮件函数保持不变
   */
  sendScheduledEmail(e) {
    try {
      const now = new Date().getTime();
      const properties = PropertiesService.getScriptProperties().getProperties();
      
      for (const [key, value] of Object.entries(properties)) {
        if (key.startsWith('email_')) {
          const scheduleTime = parseInt(key.split('_')[1]);
          
          if (Math.abs(now - scheduleTime) <= 5 * 60 * 1000) {
            const emailData = JSON.parse(value);
            
            const lines = emailData.content.split('\n');
            const subject = lines.find(line => line.includes('主旨') || line.includes('Subject'))
              ?.replace(/主旨[:：]?/g, '').trim() || 
              `来自业务团队的讯息 - ${emailData.firstName}`;
            const body = emailData.content;
            
            GmailApp.sendEmail(emailData.email, subject, body);
            
            SheetService.updateScheduleStatus(emailData.rowIndex, emailData.scheduleType);
            PropertiesService.getScriptProperties().deleteProperty(key);
            
            console.log(`邮件已发送给 ${emailData.email}: ${subject}`);
          }
        }
      }
    } catch (error) {
      console.error('发送排程邮件时发生错误:', error);
    }
  }
};