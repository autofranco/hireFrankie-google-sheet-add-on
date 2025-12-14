/**
 * 邮件服务 - 处理所有邮件发送相关功能
 */

const EmailService = {
  
  /**
   * 设定邮件发送排程（正式模式）
   */
  scheduleEmails(email, firstName, followUpMails, schedules, rowIndex) {
    // 在 Sheet-only 架構中，所有排程資料已直接儲存在 Sheet 中
    // 全域觸發器會直接從 Sheet 讀取，無需額外儲存
    console.log(`Sheet-only 模式：第 ${rowIndex} 行排程設定完成 - ${firstName} (${email})`);
    console.log('郵件內容和排程時間已儲存於 Sheet，支援即時用戶編輯');
  },

  /**
   * 立即發送郵件（Send Now 功能）
   * 立即發送指定內容的郵件，繞過觸發器排程
   * 
   * @function sendImmediateEmail
   * @param {string} email - 收件人郵件地址
   * @param {string} firstName - 收件人姓名
   * @param {string} subject - 郵件主旨
   * @param {string} content - 郵件內容
   * @param {number} rowIndex - 行索引
   * @param {string} emailType - 郵件類型
   * @returns {void}
   */
  sendImmediateEmail(email, firstName, subject, content, rowIndex, emailType) {
    try {
      this.sendEmail(email, firstName, content, subject, rowIndex, emailType);

      // 更新排程狀態（加刪除線）
      SheetService.updateScheduleStatus(rowIndex, emailType);

      // 發送成功後，檢查是否需要生成下一封郵件
      this.generateNextMailIfNeeded(rowIndex, emailType, firstName);

      // 更新 info 欄位
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      SheetService.updateInfo(sheet, rowIndex, `Send Now: ${emailType} sent`);

      console.log(`立即發送成功: ${subject} 發送給 ${firstName} (${email})`);

    } catch (error) {
      console.error('立即發送郵件失敗:', error);
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      SheetService.updateInfo(sheet, rowIndex, `[Error] Send Now fail: ${error.message}`);
      throw error;
    }
  },

  /**
   * 核心郵件發送功能
   * Uses EmailParser for pure logic
   */
  sendEmail(email, firstName, content, subject, rowIndex = null, emailType = null) {
    // Use EmailParser for pure logic
    const parsed = EmailParser.parseEmailContent(content);

    const finalSubject = parsed.subject || subject || `來自業務團隊的訊息 - ${firstName}`;
    let finalBody = parsed.body || content;

    // 如果有提供行索引和郵件類型，嵌入追蹤像素
    if (rowIndex && emailType) {
      finalBody = this.addPixelTracking(finalBody, rowIndex, emailType);
    }

    // 發送郵件（使用 HTML 格式支援像素追蹤）
    GmailApp.sendEmail(email, finalSubject, '', {
      htmlBody: finalBody
    });

    // 記錄發送的郵件信息用於回復檢測
    if (rowIndex && emailType) {
      this.recordSentEmail(email, finalSubject, rowIndex, emailType);
    }

    console.log(`郵件已發送: ${finalSubject} -> ${email}`);
  },

  /**
   * 在郵件內容中添加追蹤像素
   * @param {string} body - 郵件內容
   * @param {number} rowIndex - 行索引
   * @param {string} emailType - 郵件類型 (mail1, mail2, mail3)
   * @returns {string} 包含追蹤像素的 HTML 郵件內容
   */
  addPixelTracking(body, rowIndex, emailType) {
    try {
      // 獲取當前 Spreadsheet ID
      const spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();

      // Firebase Functions 像素追蹤端點 URL
      const pixelUrl = `https://asia-east1-auto-lead-warmer-mvp.cloudfunctions.net/pixelTracker?id=${spreadsheetId}&row=${rowIndex}&type=${emailType}`;

      // 創建追蹤像素 HTML
      const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none; visibility:hidden;" alt="">`;

      // 將純文字內容轉換為 HTML 格式
      let htmlBody = body;

      // 如果內容不包含 HTML 標籤，進行基本的文字到 HTML 轉換
      if (!body.includes('<html>') && !body.includes('<body>')) {
        // 將換行符轉換為 <br> 標籤
        htmlBody = body.replace(/\n/g, '<br>');

        // 包裝在基本的 HTML 結構中
        htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${htmlBody}
  ${pixelHtml}
</body>
</html>`;
      } else {
        // 如果已經是 HTML 格式，在 </body> 前插入像素
        if (htmlBody.includes('</body>')) {
          htmlBody = htmlBody.replace('</body>', `  ${pixelHtml}\n</body>`);
        } else {
          // 如果沒有 </body> 標籤，直接在末尾添加
          htmlBody += pixelHtml;
        }
      }

      console.log(`已添加追蹤像素: ${emailType} -> Row ${rowIndex}`);
      return htmlBody;

    } catch (error) {
      console.error('添加追蹤像素時發生錯誤:', error);
      // 如果發生錯誤，返回原始內容，不影響郵件發送
      return body;
    }
  },

  /**
   * 記錄已發送的郵件信息用於回復檢測
   */
  recordSentEmail(email, subject, rowIndex, emailType) {
    try {
      const sentTime = new Date().getTime();
      const recordKey = `sent_email_${rowIndex}_${emailType}`;
      
      const emailRecord = {
        email: email,
        subject: subject,
        sentTime: sentTime,
        rowIndex: rowIndex,
        emailType: emailType
      };
      
      PropertiesService.getScriptProperties().setProperty(recordKey, JSON.stringify(emailRecord));
      console.log(`記錄已發送郵件: ${recordKey}`);
      
    } catch (error) {
      console.error('記錄發送郵件失敗:', error);
    }
  },

  /**
   * 全域郵件檢查和發送（正式模式專用 - 每小時執行一次）
   */
  checkAndSendMails() {
    try {
      console.log('=== 全域郵件檢查開始（基於 Sheet 單一資料源）===');
      const now = new Date();
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const lastRow = sheet.getLastRow();
      
      if (lastRow <= 1) {
        console.log('沒有資料需要檢查');
        return { checked: 0, sent: 0 };
      }
      
      let sentCount = 0;
      let checkedCount = 0;
      const needsGeneration = []; // 收集需要生成下一封郵件的資料

      // 掃描所有行，尋找 Running 狀態的潛在客戶
      for (let rowIndex = 2; rowIndex <= lastRow; rowIndex++) {
        const status = sheet.getRange(rowIndex, COLUMNS.STATUS + 1).getValue();
        
        // 只處理 Running 狀態的行
        if (status !== 'Running') {
          continue;
        }
        
        checkedCount++;
        const email = sheet.getRange(rowIndex, COLUMNS.EMAIL + 1).getValue();
        const firstName = sheet.getRange(rowIndex, COLUMNS.FIRST_NAME + 1).getValue();
        
        if (!email || !firstName) {
          console.log(`跳過第 ${rowIndex} 行：缺少基本資料`);
          continue;
        }
        
        console.log(`檢查第 ${rowIndex} 行: ${firstName} (${email})`);
        
        // 檢查三封郵件的發送狀態
        const emailsToCheck = [
          {
            type: 'mail1',
            scheduleColumn: COLUMNS.SCHEDULE_1 + 1,
            contentColumn: COLUMNS.FOLLOW_UP_1 + 1
          },
          {
            type: 'mail2',
            scheduleColumn: COLUMNS.SCHEDULE_2 + 1,
            contentColumn: COLUMNS.FOLLOW_UP_2 + 1
          },
          {
            type: 'mail3',
            scheduleColumn: COLUMNS.SCHEDULE_3 + 1,
            contentColumn: COLUMNS.FOLLOW_UP_3 + 1
          }
        ];
        
        let emailsSentThisRound = 0;
        let totalEmailsSent = 0;
        
        for (const emailInfo of emailsToCheck) {
          const scheduleCell = sheet.getRange(rowIndex, emailInfo.scheduleColumn);
          const scheduleText = scheduleCell.getValue();
          const isAlreadySent = scheduleCell.getFontLine() === 'line-through';
          
          if (isAlreadySent) {
            totalEmailsSent++;
            continue;
          }
          
          if (!scheduleText) {
            console.log(`第 ${rowIndex} 行 ${emailInfo.type}: 無排程時間`);
            continue;
          }
          
          // Use ScheduleCalculator for pure logic
          const scheduleTime = ScheduleCalculator.parseScheduleTime(scheduleText);
          if (!scheduleTime) {
            console.log(`第 ${rowIndex} 行 ${emailInfo.type}: 無效排程時間格式 "${scheduleText}"`);
            continue;
          }

          // 檢查是否到了發送時間
          if (ScheduleCalculator.isScheduleDue(scheduleTime, now)) {
            const content = sheet.getRange(rowIndex, emailInfo.contentColumn).getValue();
            
            if (!content) {
              console.log(`第 ${rowIndex} 行 ${emailInfo.type}: 無郵件內容`);
              continue;
            }
            
            try {
              // 發送郵件
              const subject = `Follow Up #${emailInfo.type.slice(-1)} - ${firstName}`;
              this.sendEmail(email, firstName, content, subject, rowIndex, emailInfo.type);
              
              // 標記為已發送（加刪除線）
              scheduleCell.setFontLine('line-through');
              
              // 發送成功後，收集需要生成下一封郵件的資訊
              needsGeneration.push({
                rowIndex: rowIndex,
                currentMailType: emailInfo.type,
                firstName: firstName
              });
              
              emailsSentThisRound++;
              totalEmailsSent++;
              sentCount++;
              
              console.log(`✅ 發送成功: ${emailInfo.type} -> ${firstName} (${email})`);

              // 更新 info
              SheetService.updateInfo(sheet, rowIndex, `${emailInfo.type} sent (${now.toLocaleString('en-US')})`);

            } catch (error) {
              console.error(`❌ 發送失敗: ${emailInfo.type} -> ${firstName} (${email})`, error);
              SheetService.updateInfo(sheet, rowIndex, `[Error] ${emailInfo.type} send fail: ${error.message}`);
            }
          }
        }

        // 檢查是否所有三封郵件都已發送完成
        if (totalEmailsSent >= 3) {
          SheetService.updateStatus(sheet, rowIndex, 'Done');
          SheetService.updateInfo(sheet, rowIndex, 'All email sent');
          console.log(`🎉 完成所有郵件發送: Row ${rowIndex} - ${firstName}`);
        } else if (emailsSentThisRound > 0) {
          SheetService.updateInfo(sheet, rowIndex, `Sent ${totalEmailsSent}/3 email`);
        }
      }
      
      // 批量生成下一封郵件
      if (needsGeneration.length > 0) {
        console.log(`開始批量生成 ${needsGeneration.length} 封後續郵件...`);
        this.batchGenerateNextMails(needsGeneration);
      }

      // 更新統計資料到 S1/T1/U1
      console.log('更新總覽統計資料...');
      const statsResult = AnalyticsService.updateSummaryStatistics();
      if (statsResult.success) {
        console.log('統計資料更新成功');
      } else {
        console.error('統計資料更新失敗:', statsResult.error);
      }

      console.log(`=== 全域郵件檢查完成 ===`);
      console.log(`檢查了 ${checkedCount} 個潛在客戶，發送了 ${sentCount} 封郵件`);

      // 檢查是否有未完成的 Processing 行（timeout 後的殘留）
      let resumedCount = 0;
      const processingRows = [];
      for (let row = 2; row <= lastRow; row++) {
        const status = sheet.getRange(row, COLUMNS.STATUS + 1).getValue();
        if (status === 'Processing') {
          processingRows.push(row);
        }
      }

      if (processingRows.length > 0) {
        console.log(`=== 發現 ${processingRows.length} 個未完成的 Processing 行 ===`);
        console.log('開始繼續生成郵件內容和排程...');
        try {
          ProcessingService.processAllRows(); // 續繼處理未完成的行
          resumedCount = processingRows.length;
          console.log(`✅ 已完成 ${resumedCount} 個未完成行的處理`);
        } catch (resumeError) {
          console.error('Error processing unfinished rows:', resumeError);
        }
      }

      return {
        checked: checkedCount,
        sent: sentCount,
        resumed: resumedCount,
        statsResult: statsResult
      };
      
    } catch (error) {
      console.error('全域郵件檢查時發生錯誤:', error);
      return { error: error.message };
    }
  },


  /**
   * 發送郵件後檢查是否需要生成下一封郵件
   */
  generateNextMailIfNeeded(rowIndex, currentMailType, firstName) {
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      
      // 判斷需要生成哪一封郵件
      let nextMailNumber, nextContentColumn, nextMailAngleColumn;
      
      if (currentMailType === 'mail1') {
        nextMailNumber = 2;
        nextContentColumn = COLUMNS.FOLLOW_UP_2 + 1;
        nextMailAngleColumn = COLUMNS.MAIL_ANGLE_2 + 1;
      } else if (currentMailType === 'mail2') {
        nextMailNumber = 3;
        nextContentColumn = COLUMNS.FOLLOW_UP_3 + 1;
        nextMailAngleColumn = COLUMNS.MAIL_ANGLE_3 + 1;
      } else {
        // mail3 已經是最後一封
        console.log(`第 ${rowIndex} 行: 已發送最後一封郵件 (mail3)`);
        return;
      }
      
      // 檢查下一封郵件是否已經有內容
      const nextContent = sheet.getRange(rowIndex, nextContentColumn).getValue();
      if (nextContent && nextContent.trim() !== '') {
        console.log(`第 ${rowIndex} 行: 第${nextMailNumber}封郵件內容已存在，跳過生成`);
        return;
      }
      
      console.log(`第 ${rowIndex} 行: 開始生成第${nextMailNumber}封郵件...`);
      
      // 讀取需要的資料
      const leadsProfile = sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).getValue();
      const nextMailAngle = sheet.getRange(rowIndex, nextMailAngleColumn).getValue();
      const department = sheet.getRange(rowIndex, COLUMNS.DEPARTMENT + 1).getValue();
      const position = sheet.getRange(rowIndex, COLUMNS.POSITION + 1).getValue();

      if (!leadsProfile || !nextMailAngle) {
        console.log(`第 ${rowIndex} 行: 缺少 Leads Profile 或 Mail Angle，無法生成第${nextMailNumber}封郵件`);
        return;
      }

      // 生成下一封郵件（使用 1-item 批次處理）
      const results = ContentGenerator.generateMailsBatch([{
        leadsProfile: leadsProfile,
        mailAngle: nextMailAngle,
        firstName: firstName,
        emailNumber: nextMailNumber,
        department: department,
        position: position
      }]);

      const nextMailResult = results[0];

      if (!nextMailResult.success) {
        throw new Error(nextMailResult.error || '郵件生成失敗');
      }

      // 只提取郵件內容，排除 metadata
      const nextMailContent = nextMailResult.content;

      // 寫入生成的內容
      sheet.getRange(rowIndex, nextContentColumn).setValue(nextMailContent);
      
      console.log(`✅ 第 ${rowIndex} 行: 第${nextMailNumber}封郵件生成成功`);

      // 更新 info 欄位
      SheetService.updateInfo(sheet, rowIndex, `Email ${nextMailNumber} done`);

    } catch (error) {
      console.error(`生成下一封郵件時發生錯誤 (第 ${rowIndex} 行):`, error);

      // 在 info 欄位記錄錯誤
      try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
        SheetService.updateInfo(sheet, rowIndex, `[Error] Email fail: ${error.message}`);
      } catch (updateError) {
        console.error('更新錯誤資訊失敗:', updateError);
      }
    }
  },

  /**
   * 批量生成下一封郵件（批量版本的 generateNextMailIfNeeded）
   * @param {Array} needsGenerationList - 需要生成的郵件列表，每個元素包含 { rowIndex, currentMailType, firstName }
   */
  batchGenerateNextMails(needsGenerationList) {
    try {
      if (needsGenerationList.length === 0) {
        console.log('沒有需要批量生成的郵件');
        return;
      }

      console.log(`開始批量生成 ${needsGenerationList.length} 封後續郵件...`);

      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const batchData = [];
      const rowMappings = []; // 記錄每個 API 請求對應的行資訊

      // 第一階段：收集需要生成的資料
      for (const item of needsGenerationList) {
        const { rowIndex, currentMailType, firstName } = item;

        // 判斷需要生成哪一封郵件
        let nextMailNumber, nextContentColumn, nextMailAngleColumn;

        if (currentMailType === 'mail1') {
          nextMailNumber = 2;
          nextContentColumn = COLUMNS.FOLLOW_UP_2 + 1;
          nextMailAngleColumn = COLUMNS.MAIL_ANGLE_2 + 1;
        } else if (currentMailType === 'mail2') {
          nextMailNumber = 3;
          nextContentColumn = COLUMNS.FOLLOW_UP_3 + 1;
          nextMailAngleColumn = COLUMNS.MAIL_ANGLE_3 + 1;
        } else {
          console.log(`第 ${rowIndex} 行: 已發送最後一封郵件 (mail3)`);
          continue;
        }

        // 檢查下一封郵件是否已經有內容
        const nextContent = sheet.getRange(rowIndex, nextContentColumn).getValue();
        if (nextContent && nextContent.trim() !== '') {
          console.log(`第 ${rowIndex} 行: 第${nextMailNumber}封郵件內容已存在，跳過生成`);
          continue;
        }

        // 讀取需要的資料
        const leadsProfile = sheet.getRange(rowIndex, COLUMNS.LEADS_PROFILE + 1).getValue();
        const nextMailAngle = sheet.getRange(rowIndex, nextMailAngleColumn).getValue();

        if (!leadsProfile || !nextMailAngle) {
          console.log(`第 ${rowIndex} 行: 缺少 Leads Profile 或 Mail Angle，無法生成第${nextMailNumber}封郵件`);
          continue;
        }

        // 添加到批量資料
        batchData.push({
          leadsProfile: leadsProfile,
          mailAngle: nextMailAngle,
          firstName: firstName,
          emailNumber: nextMailNumber
        });

        // 記錄對應關係
        rowMappings.push({
          rowIndex: rowIndex,
          nextContentColumn: nextContentColumn,
          nextMailNumber: nextMailNumber
        });
      }

      if (batchData.length === 0) {
        console.log('沒有有效的郵件需要生成');
        return;
      }

      // 第二階段：批量調用 API
      console.log(`準備批量生成 ${batchData.length} 封郵件...`);
      const results = ContentGenerator.generateMailsBatch(batchData);

      // 第三階段：寫入結果
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const mapping = rowMappings[i];

        try {
          if (result.success) {
            // 寫入生成的內容
            sheet.getRange(mapping.rowIndex, mapping.nextContentColumn).setValue(result.content);

            console.log(`✅ 第 ${mapping.rowIndex} 行: 第${mapping.nextMailNumber}封郵件生成成功`);

            // 更新 info 欄位
            SheetService.updateInfo(sheet, mapping.rowIndex, `Email ${mapping.nextMailNumber} done`);

            successCount++;
          } else {
            console.error(`第 ${mapping.rowIndex} 行第${mapping.nextMailNumber}封郵件生成失敗:`, result.error);

            // 在 info 欄位記錄錯誤
            SheetService.updateInfo(sheet, mapping.rowIndex, `[Error] Email ${mapping.nextMailNumber} fail: ${result.error}`);

            errorCount++;
          }
        } catch (writeError) {
          console.error(`第 ${mapping.rowIndex} 行寫入結果時發生錯誤:`, writeError);
          errorCount++;
        }
      }

      console.log(`批量生成後續郵件完成: 成功 ${successCount}/${batchData.length}, 失敗 ${errorCount}`);

    } catch (error) {
      console.error('批量生成下一封郵件時發生錯誤:', error);
    }
  }
};

// 全局函数包装器
function scheduleEmails(email, firstName, followUpMails, schedules, rowIndex) {
  return EmailService.scheduleEmails(email, firstName, followUpMails, schedules, rowIndex);
}

function checkAndSendMails() {
  return EmailService.checkAndSendMails();
}