/**
 * 邮件服务 - 处理所有邮件发送相关功能
 */

const EmailService = {
  
  /**
   * 设定邮件发送排程
   */
  scheduleEmails(email, firstName, followUpMails, schedules, rowIndex) {
    // 由于 Google Apps Script 的限制，我们需要使用触发器来实现排程发送
    const triggers = [
      { mail: followUpMails.mail1, time: schedules.schedule1, type: 'mail1' },
      { mail: followUpMails.mail2, time: schedules.schedule2, type: 'mail2' },
      { mail: followUpMails.mail3, time: schedules.schedule3, type: 'mail3' }
    ];
    
    triggers.forEach((trigger, index) => {
      // 建立时间触发器
      ScriptApp.newTrigger('sendScheduledEmail')
        .timeBased()
        .at(trigger.time)
        .create();
      
      // 将邮件资讯储存到 PropertiesService
      const propertyKey = `email_${trigger.time.getTime()}_${email}`;
      PropertiesService.getScriptProperties().setProperty(propertyKey, JSON.stringify({
        email: email,
        firstName: firstName,
        content: trigger.mail,
        scheduleType: trigger.type,
        rowIndex: rowIndex
      }));
    });
  },

  /**
   * 发送排程邮件（由触发器呼叫）
   */
  sendScheduledEmail(e) {
    try {
      const now = new Date().getTime();
      const properties = PropertiesService.getScriptProperties().getProperties();
      
      // 寻找应该在此时发送的邮件
      for (const [key, value] of Object.entries(properties)) {
        if (key.startsWith('email_')) {
          const scheduleTime = parseInt(key.split('_')[1]);
          
          // 检查是否到了发送时间（允许5分钟的误差）
          if (Math.abs(now - scheduleTime) <= 5 * 60 * 1000) {
            const emailData = JSON.parse(value);
            
            // 解析邮件内容，提取主旨和内文
            const lines = emailData.content.split('\n');
            const subject = lines.find(line => line.includes('主旨') || line.includes('Subject'))
              ?.replace(/主旨[:：]?/g, '').trim() || 
              `来自业务团队的讯息 - ${emailData.firstName}`;
            const body = emailData.content;
            
            // 发送邮件
            GmailApp.sendEmail(
              emailData.email,
              subject,
              body
            );
            
            // 更新 Sheet 中的排程状态
            SheetService.updateScheduleStatus(emailData.rowIndex, emailData.scheduleType);
            
            // 删除已处理的属性
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

// 全局函数包装器
function scheduleEmails(email, firstName, followUpMails, schedules, rowIndex) {
  return EmailService.scheduleEmails(email, firstName, followUpMails, schedules, rowIndex);
}

function sendScheduledEmail(e) {
  return EmailService.sendScheduledEmail(e);
}