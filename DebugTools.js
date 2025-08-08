/**
 * 调试工具 - 帮助排除API调用和内容生成问题
 */

const DebugTools = {
  
  /**
   * 测试完整的内容生成流程
   */
  testFullContentGeneration() {
    try {
      // 测试数据
      const testContext = "科技公司CEO，专注于AI技术开发，公司规模100人，正在寻找提升团队效率的解决方案";
      const testFirstName = "张总";
      
      console.log('=== 开始测试完整内容生成流程 ===');
      
      // 1. 测试生成客户画像
      console.log('1. 测试生成客户画像...');
      const leadsProfile = ContentGenerator.generateLeadsProfile(testContext, testFirstName);
      console.log('客户画像生成结果:', leadsProfile);
      
      // 2. 测试生成邮件切入点
      console.log('2. 测试生成邮件切入点...');
      const mailAngles = ContentGenerator.generateMailAngles(leadsProfile, testFirstName);
      console.log('邮件切入点生成结果:', JSON.stringify(mailAngles, null, 2));
      
      // 3. 测试生成追踪邮件
      console.log('3. 测试生成追踪邮件...');
      const followUpMails = ContentGenerator.generateFollowUpMails(leadsProfile, mailAngles, testFirstName);
      console.log('追踪邮件生成结果:', JSON.stringify(followUpMails, null, 2));
      
      // 将结果显示给用户
      const resultMessage = `
测试完成！

客户画像长度: ${leadsProfile.length} 字符
切入点1长度: ${mailAngles.angle1.length} 字符
切入点2长度: ${mailAngles.angle2.length} 字符  
切入点3长度: ${mailAngles.angle3.length} 字符
邮件1长度: ${followUpMails.mail1.length} 字符
邮件2长度: ${followUpMails.mail2.length} 字符
邮件3长度: ${followUpMails.mail3.length} 字符

详细结果请查看执行日志。
      `;
      
      SpreadsheetApp.getUi().alert('测试完成', resultMessage, SpreadsheetApp.getUi().ButtonSet.OK);
      
    } catch (error) {
      console.error('测试过程中发生错误:', error);
      SpreadsheetApp.getUi().alert('测试失败', `错误信息: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  },

  /**
   * 专门测试API连接和切入点解析
   */
  testMailAnglesGeneration() {
    try {
      const testContext = "电商平台运营总监，负责提升平台转化率，面临获客成本高的挑战";
      const testFirstName = "李总";
      
      console.log('=== 专门测试邮件切入点生成 ===');
      
      // 先生成客户画像
      const leadsProfile = ContentGenerator.generateLeadsProfile(testContext, testFirstName);
      console.log('客户画像:', leadsProfile);
      
      // 测试生成切入点
      const mailAngles = ContentGenerator.generateMailAngles(leadsProfile, testFirstName);
      
      // 详细输出每个切入点
      console.log('=== 切入点详细分析 ===');
      console.log('切入点1:', mailAngles.angle1);
      console.log('切入点1长度:', mailAngles.angle1.length);
      console.log('切入点1是否为默认值:', mailAngles.angle1.includes('切入点1：解决客户痛点的方案'));
      
      console.log('切入点2:', mailAngles.angle2);  
      console.log('切入点2长度:', mailAngles.angle2.length);
      console.log('切入点2是否为默认值:', mailAngles.angle2.includes('切入点2：展示获利机会'));
      
      console.log('切入点3:', mailAngles.angle3);
      console.log('切入点3长度:', mailAngles.angle3.length);
      console.log('切入点3是否为默认值:', mailAngles.angle3.includes('切入点3：建立信任关系'));
      
      // 检查是否成功
      const isSuccessful = !mailAngles.angle1.includes('切入点1：解决客户痛点的方案') &&
                          !mailAngles.angle2.includes('切入点2：展示获利机会') &&
                          !mailAngles.angle3.includes('切入点3：建立信任关系');
      
      const message = isSuccessful ? 
        '✅ 切入点生成成功！所有切入点都是AI生成的内容。' :
        '❌ 切入点生成失败！返回了默认值，请检查API调用或解析逻辑。';
      
      SpreadsheetApp.getUi().alert('切入点测试结果', message, SpreadsheetApp.getUi().ButtonSet.OK);
      
      return mailAngles;
      
    } catch (error) {
      console.error('测试邮件切入点生成时发生错误:', error);
      SpreadsheetApp.getUi().alert('测试失败', `错误: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      throw error;
    }
  },

  /**
   * 测试原始API调用
   */
  testRawAPICall() {
    try {
      const testPrompt = `请用繁体中文回答以下问题，并严格按照格式回答：

切入点1
主题：降低获客成本
内容大纲：针对电商平台提供精准投放策略，帮助降低30%获客成本，立即咨询了解详情。

切入点2  
主题：提升转化率
内容大纲：分享成功案例，某电商平台通过我们的方案转化率提升50%，免费诊断您的平台。

切入点3
主题：数据驱动决策
内容大纲：提供专业数据分析工具，让您的运营决策更精准，预约演示获取方案。

请完全按照上述格式回答。`;

      console.log('=== 测试原始API调用 ===');
      console.log('发送的提示词:', testPrompt);
      
      const response = APIService.callPerplexityAPI(testPrompt);
      console.log('API原始回应:', response);
      console.log('回应长度:', response.length);
      
      // 测试解析
      const parsed = ContentGenerator.parseMailAngles(response);
      console.log('解析结果:', JSON.stringify(parsed, null, 2));
      
      SpreadsheetApp.getUi().alert('原始API测试', 
        `API调用成功！\n回应长度: ${response.length}\n请查看日志了解详细内容`, 
        SpreadsheetApp.getUi().ButtonSet.OK);
      
      return response;
      
    } catch (error) {
      console.error('原始API调用测试失败:', error);
      SpreadsheetApp.getUi().alert('API测试失败', `错误: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      throw error;
    }
  },

  /**
   * 检查Sheet中的实际数据
   */
  checkSheetData() {
    try {
      const sheet = SheetService.getMainSheet();
      const lastRow = sheet.getLastRow();
      
      if (lastRow <= 1) {
        SpreadsheetApp.getUi().alert('没有数据', '工作表中没有数据行', SpreadsheetApp.getUi().ButtonSet.OK);
        return;
      }
      
      // 检查第一行数据
      const firstDataRow = sheet.getRange(2, 1, 1, Object.keys(COLUMNS).length).getValues()[0];
      
      console.log('=== Sheet数据检查 ===');
      console.log('第一行数据:', firstDataRow);
      console.log('Email:', firstDataRow[COLUMNS.EMAIL]);
      console.log('姓名:', firstDataRow[COLUMNS.FIRST_NAME]);
      console.log('背景:', firstDataRow[COLUMNS.CONTEXT]);
      console.log('客户画像:', firstDataRow[COLUMNS.LEADS_PROFILE]);
      console.log('切入点1:', firstDataRow[COLUMNS.MAIL_ANGLE_1]);
      console.log('切入点2:', firstDataRow[COLUMNS.MAIL_ANGLE_2]);
      console.log('切入点3:', firstDataRow[COLUMNS.MAIL_ANGLE_3]);
      console.log('处理状态:', firstDataRow[COLUMNS.PROCESSED]);
      
      const message = `
数据检查结果:
总行数: ${lastRow}
Email: ${firstDataRow[COLUMNS.EMAIL] || '空'}
姓名: ${firstDataRow[COLUMNS.FIRST_NAME] || '空'}
背景: ${(firstDataRow[COLUMNS.CONTEXT] || '').substring(0, 50)}...
切入点1: ${(firstDataRow[COLUMNS.MAIL_ANGLE_1] || '').substring(0, 50)}...
处理状态: ${firstDataRow[COLUMNS.PROCESSED] || '未处理'}
      `;
      
      SpreadsheetApp.getUi().alert('Sheet数据检查', message, SpreadsheetApp.getUi().ButtonSet.OK);
      
    } catch (error) {
      console.error('检查Sheet数据时发生错误:', error);
      SpreadsheetApp.getUi().alert('检查失败', `错误: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  },

  /**
   * 重置测试数据
   */
  resetTestData() {
    try {
      const sheet = SheetService.getMainSheet();
      
      // 清除处理标记，重新处理数据
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const processedColumn = sheet.getRange(2, COLUMNS.PROCESSED + 1, lastRow - 1, 1);
        processedColumn.clearContent();
        
        // 也清除生成的内容，重新生成
        const contentColumns = [
          COLUMNS.LEADS_PROFILE,
          COLUMNS.MAIL_ANGLE_1,
          COLUMNS.MAIL_ANGLE_2, 
          COLUMNS.MAIL_ANGLE_3,
          COLUMNS.FOLLOW_UP_1,
          COLUMNS.FOLLOW_UP_2,
          COLUMNS.FOLLOW_UP_3,
          COLUMNS.SCHEDULE_1,
          COLUMNS.SCHEDULE_2,
          COLUMNS.SCHEDULE_3
        ];
        
        contentColumns.forEach(col => {
          sheet.getRange(2, col + 1, lastRow - 1, 1).clearContent();
        });
      }
      
      SpreadsheetApp.getUi().alert('重置完成', '已清除所有生成的内容和处理标记', SpreadsheetApp.getUi().ButtonSet.OK);
      
    } catch (error) {
      console.error('重置测试数据时发生错误:', error);
      SpreadsheetApp.getUi().alert('重置失败', `错误: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }
};

// 全局函数包装器
function testFullContentGeneration() {
  return DebugTools.testFullContentGeneration();
}

function testMailAnglesGeneration() {
  return DebugTools.testMailAnglesGeneration();
}

function testRawAPICall() {
  return DebugTools.testRawAPICall();
}

function checkSheetData() {
  return DebugTools.checkSheetData();
}

function resetTestData() {
  return DebugTools.resetTestData();
}