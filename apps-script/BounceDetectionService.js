/**
 * 退信檢測服務 - 檢測郵件退信狀態
 */

const BounceDetectionService = {

  /**
   * 檢查特定郵件地址是否有退信
   */
  checkForBounces(email, rowIndex) {
    try {
      console.log(`檢查第 ${rowIndex} 行 (${email}) 的退信狀態`);

      // 獲取該行所有已發送的郵件記錄
      const sentEmails = this.getSentEmails(rowIndex);
      if (sentEmails.length === 0) {
        console.log(`第 ${rowIndex} 行沒有發送郵件記錄`);
        return { hasBounce: false };
      }

      console.log(`檢查 ${sentEmails.length} 封已發送郵件的退信狀態`);

      // 檢查每封已發送郵件的退信狀態
      for (const sentEmail of sentEmails) {
        console.log(`檢查郵件: ${sentEmail.subject} (發送時間: ${new Date(sentEmail.sentTime)})`);

        // 搜尋退信相關的郵件 - 單一綜合查詢策略
        const myEmail = Session.getActiveUser().getEmail();

        // 綜合搜尋查詢：包含精確和備用條件
        const comprehensiveQuery = `to:${myEmail} (from:mailer-daemon OR from:postmaster OR from:mailer-daemon@googlemail.com OR from:mailer-daemon@gmail.com)`;

        try {
          console.log(`🔍 搜尋退信查詢: ${comprehensiveQuery}`);
          const threads = GmailApp.search(comprehensiveQuery, 0, 1);

          for (const thread of threads) {
            const messages = thread.getMessages();

            for (const message of messages) {
              const messageDate = message.getDate();
              const sender = message.getFrom();
              const subject = message.getSubject();
              const body = message.getPlainBody();

              // 檢查時間窗口：退信應該在發送後48小時內
              const timeDiff = messageDate.getTime() - sentEmail.sentTime;
              const maxBounceWindow = 48 * 60 * 60 * 1000; // 48小時

              // 檢查是否為退信：1) 時間窗口內 2) 通過嚴格的退信驗證（必須包含目標郵件地址）
              if (timeDiff > 0 && timeDiff <= maxBounceWindow &&
                  this.isBounceMessage(sender, subject, body, email)) {

                console.log(`✅ 發現退信: ${sender} 於 ${messageDate} 報告 "${email}" 退信`);

                // 記錄退信資訊
                this.recordBounce(rowIndex, sentEmail.emailType, {
                  email: email,
                  bounceDate: messageDate,
                  bounceSender: sender,
                  bounceSubject: subject,
                  originalEmailType: sentEmail.emailType,
                  originalSubject: sentEmail.subject
                });

                return {
                  hasBounce: true,
                  bounceDate: messageDate,
                  bounceSender: sender,
                  bounceSubject: subject,
                  originalEmailType: sentEmail.emailType
                };
              }
            }
          }
        } catch (searchError) {
          console.error(`搜尋退信錯誤:`, searchError);
          continue;
        }
      }

      console.log(`❌ 沒有發現第 ${rowIndex} 行的退信`);
      return { hasBounce: false };

    } catch (error) {
      console.error(`檢查第 ${rowIndex} 行退信時發生錯誤:`, error);
      return { hasBounce: false, error: error.message };
    }
  },

  /**
   * 判斷是否為退信郵件 - 增強版本，防止誤報
   */
  isBounceMessage(sender, subject, body, targetEmail) {
    console.log(`🔍 檢查退信訊息: sender=${sender}, targetEmail=${targetEmail}`);

    // 檢查發送者是否為系統郵件
    const systemSenders = [
      'mailer-daemon',
      'postmaster',
      'mail-daemon',
      'mailerdaemon',
      'noreply',
      'no-reply'
    ];

    const senderLower = sender.toLowerCase();
    const isSystemSender = systemSenders.some(systemSender =>
      senderLower.includes(systemSender)
    );

    if (!isSystemSender) {
      console.log(`❌ 非系統發件人，跳過: ${sender}`);
      return false;
    }

    // CRITICAL: 目標郵件地址必須出現在郵件內容中
    const bodyLower = body.toLowerCase();
    const emailInBody = bodyLower.includes(targetEmail.toLowerCase());

    if (!emailInBody) {
      console.log(`❌ 目標郵件地址 ${targetEmail} 未在退信內容中找到，跳過檢查`);
      return false;
    }

    console.log(`✅ 目標郵件地址 ${targetEmail} 在退信內容中找到`);

    // 檢查主旨是否包含退信關鍵詞
    const bounceSubjectKeywords = [
      'undeliverable',
      'delivery status notification',
      'mail delivery failed',
      'returned mail',
      'bounce',
      'failure notice',
      'delivery failure',
      'message not delivered'
    ];

    const subjectLower = subject.toLowerCase();
    const hasBounceSubject = bounceSubjectKeywords.some(keyword =>
      subjectLower.includes(keyword)
    );

    // 檢查內容是否包含退信關鍵詞
    const bounceBodyKeywords = [
      // Gmail specific error messages
      'does not exist',
      'cannot receive email',
      'is not a valid',
      'is inactive',
      'out of storage space',
      'temporarily rejected',
      'temporarily blocked',
      'message was blocked',
      'email account that you tried to reach does not exist',
      'find the recipient domain',

      // Generic bounce keywords
      'could not be delivered',
      'message could not be delivered',
      'delivery failed',
      'recipient unknown',
      'mailbox unavailable',
      'invalid recipient',
      'user unknown',
      'address not found',
      'no such user',
      'message not delivered',
      'undeliverable',
      'bounce'
    ];

    // 添加 SMTP 狀態碼檢查 - 基於 Gmail 官方文檔
    const smtpBounceCodes = [
      '550 5.1.1', // 收件人地址不存在 (最常見)
      '550 5.2.1', // 收件人帳戶無效
      '552 5.2.2', // 收件人信箱已滿
      '550 5.7.1', // 因政策原因被拒絕
      '553 5.1.2', // 找不到收件人網域
      '553 5.1.3', // 收件人地址無效
      '450 4.2.1', '451 4.3.0', '421 4.3.0', '452 4.2.2', // 暫時失敗
      '550 5.4.5', '554 5.4.6' // 其他永久失敗
    ];

    const hasSmtpBounceCode = smtpBounceCodes.some(code =>
      body.includes(code)
    );

    const hasBounceBody = bounceBodyKeywords.some(keyword =>
      bodyLower.includes(keyword)
    );

    // 必須同時滿足：1) 系統發件人 2) 目標郵件在內容中 3) 有退信標誌（主旨 OR SMTP碼 OR 關鍵詞）
    const isBounce = hasBounceSubject || hasSmtpBounceCode || hasBounceBody;

    if (isBounce) {
      console.log(`✅ 確認退信: 主旨關鍵詞=${hasBounceSubject}, SMTP碼=${hasSmtpBounceCode}, 內容關鍵詞=${hasBounceBody}`);
    } else {
      console.log(`❌ 未發現退信證據: 主旨關鍵詞=${hasBounceSubject}, SMTP碼=${hasSmtpBounceCode}, 內容關鍵詞=${hasBounceBody}`);
    }

    return isBounce;
  },

  /**
   * 獲取特定行的所有已發送郵件記錄
   */
  getSentEmails(rowIndex) {
    try {
      const properties = PropertiesService.getScriptProperties().getProperties();
      const sentEmails = [];

      for (const [key, value] of Object.entries(properties)) {
        if (key.startsWith(`sent_email_${rowIndex}_`)) {
          try {
            const emailRecord = JSON.parse(value);
            sentEmails.push(emailRecord);
          } catch (parseError) {
            console.error(`解析郵件記錄失敗: ${key}`, parseError);
          }
        }
      }

      // 按發送時間排序
      sentEmails.sort((a, b) => a.sentTime - b.sentTime);
      return sentEmails;

    } catch (error) {
      console.error('獲取已發送郵件記錄失敗:', error);
      return [];
    }
  },

  /**
   * 記錄退信資訊
   */
  recordBounce(rowIndex, emailType, bounceData) {
    try {
      const bounceKey = `bounce_${rowIndex}_${emailType}`;
      const bounceRecord = {
        ...bounceData,
        recordedTime: new Date().getTime()
      };

      PropertiesService.getScriptProperties().setProperty(bounceKey, JSON.stringify(bounceRecord));
      console.log(`記錄退信資訊: ${bounceKey}`);

    } catch (error) {
      console.error('記錄退信資訊失敗:', error);
    }
  },

  /**
   * 批量檢查所有 Running 狀態的潛在客戶退信
   */
  checkAllRunningLeadsForBounces() {
    try {
      console.log('=== 開始檢查所有潛在客戶退信 ===');

      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) return { checked: 0, bouncesFound: 0 };

      let checkedCount = 0;
      let bouncesFound = 0;

      // 檢查每一行的狀態
      for (let i = 2; i <= lastRow; i++) {
        const status = sheet.getRange(i, COLUMNS.STATUS + 1).getValue();

        // 只檢查 Running 狀態的行
        if (status === 'Running') {
          const email = sheet.getRange(i, COLUMNS.EMAIL + 1).getValue();
          const firstName = sheet.getRange(i, COLUMNS.FIRST_NAME + 1).getValue();
          const info = sheet.getRange(i, COLUMNS.INFO + 1).getValue();

          // 跳過已經標記為退信的潛客（優化 Gmail 配額使用）
          if (info && info.toString().toLowerCase().includes('bounced')) {
            continue;
          }

          if (email && firstName) {
            checkedCount++;

            // 檢查該行是否有退信
            const bounceResult = this.checkForBounces(email, i);

            if (bounceResult.hasBounce) {
              bouncesFound++;

              // 更新 INFO 欄位顯示退信狀態
              const bounceInfo = `Email bounced (${bounceResult.bounceDate.toLocaleString('zh-TW')})`;
              SheetService.updateInfo(sheet, i, bounceInfo);

              console.log(`✅ 發現退信: ${firstName} (${email}) - 已標記退信狀態`);
            }
          }
        }
      }

      console.log(`=== 退信檢查完成 ===`);
      console.log(`檢查了 ${checkedCount} 個潛在客戶，發現 ${bouncesFound} 個退信`);

      return { checked: checkedCount, bouncesFound: bouncesFound };

    } catch (error) {
      console.error('批量檢查退信時發生錯誤:', error);
      return { error: error.message };
    }
  },

  /**
   * 清理舊的退信記錄（超過30天的記錄）
   */
  cleanupOldBounceRecords() {
    try {
      const properties = PropertiesService.getScriptProperties().getProperties();
      const thirtyDaysAgo = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [key, value] of Object.entries(properties)) {
        if (key.startsWith('bounce_')) {
          try {
            const bounceRecord = JSON.parse(value);
            if (bounceRecord.recordedTime < thirtyDaysAgo) {
              PropertiesService.getScriptProperties().deleteProperty(key);
              cleanedCount++;
              console.log(`清理舊退信記錄: ${key}`);
            }
          } catch (parseError) {
            // 如果解析失敗，刪除損壞的記錄
            PropertiesService.getScriptProperties().deleteProperty(key);
            cleanedCount++;
            console.log(`清理損壞退信記錄: ${key}`);
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`已清理 ${cleanedCount} 個舊的退信記錄`);
      }

    } catch (error) {
      console.error('清理舊退信記錄時發生錯誤:', error);
    }
  },

  /**
   * 計算總體退信率
   */
  calculateBounceRate() {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();

      if (lastRow <= 1) return { bounceRate: 0, totalSent: 0, totalBounced: 0 };

      let totalSent = 0;
      let totalBounced = 0;

      // 統計已發送和退信的郵件數量
      for (let i = 2; i <= lastRow; i++) {
        const status = sheet.getRange(i, COLUMNS.STATUS + 1).getValue();
        const info = sheet.getRange(i, COLUMNS.INFO + 1).getValue();

        // 只統計已處理的潛在客戶
        if (status === 'Running' || status === 'Done') {
          // 檢查是否有發送過郵件（通過檢查排程欄位是否有刪除線）
          const schedule1 = sheet.getRange(i, COLUMNS.SCHEDULE_1 + 1);
          const schedule2 = sheet.getRange(i, COLUMNS.SCHEDULE_2 + 1);
          const schedule3 = sheet.getRange(i, COLUMNS.SCHEDULE_3 + 1);

          let emailsSent = 0;
          if (schedule1.getFontLine() === 'line-through') emailsSent++;
          if (schedule2.getFontLine() === 'line-through') emailsSent++;
          if (schedule3.getFontLine() === 'line-through') emailsSent++;

          totalSent += emailsSent;

          // 檢查是否有退信
          if (info && info.toString().toLowerCase().includes('bounced')) {
            totalBounced++;
          }
        }
      }

      const bounceRate = totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0;

      return {
        bounceRate: bounceRate,
        totalSent: totalSent,
        totalBounced: totalBounced
      };

    } catch (error) {
      console.error('計算退信率時發生錯誤:', error);
      return { bounceRate: 0, totalSent: 0, totalBounced: 0, error: error.message };
    }
  }
};

// 全局函數包裝器
function checkAllRunningLeadsForBounces() {
  return BounceDetectionService.checkAllRunningLeadsForBounces();
}

function calculateBounceRate() {
  return BounceDetectionService.calculateBounceRate();
}