/**
 * 内容生成服务 - 处理所有 AI 内容生成
 */

const ContentGenerator = {
  
  /**
   * 生成潜在客户画像
   */
  generateLeadsProfile(companyUrl, position, resourceUrl, firstName) {
    // 獲取研習活動簡介資訊
    const userInfo = UserInfoService.getUserInfo();
    const seminarBrief = userInfo.seminarBrief || '';
    
    const prompt = `基於以下客戶資訊，請協助分析並生成簡潔的潛在客戶畫像。請用繁體中文回答，總字數控制在500字內。

客戶名稱：${firstName}
客戶公司網站：${companyUrl}
客戶職位：${position}
研習活動資訊：${seminarBrief}

請簡潔分析以下五個面向（每個面向約80-100字）：
1. 公司背景：規模、行業、業務特色
2. 職位權力：決策權力和關注重點
3. 參與動機：參加研習活動的可能需求
4. 面臨挑戰：此職位常見的痛點
5. 溝通策略：最適合的接觸方式和價值主張

格式要求：
- 每個面向用簡潔的段落表達，避免冗長描述
- 嚴禁生成不存在的資訊，只使用搜尋結果的資訊
- 不使用 Markdown 格式，用「」符號強調重點
- 確保五個面向都完整呈現`;

    try {
      const response = APIService.callPerplexityAPIWithSonarPro(prompt);
      console.log('生成客户画像成功:', response.substring(0, 100) + '...');
      
      // 清理 Markdown 格式，使其適合 Google Sheets 顯示
      const cleanedResponse = this.cleanMarkdownForSheets(response);
      return cleanedResponse;
    } catch (error) {
      console.error('生成客户画像失败:', error);
      
      
      throw new Error(`生成客戶畫像失敗: ${error.message}`);
    }
  },

  /**
   * 清理 Markdown 格式，使其適合 Google Sheets 顯示
   */
  cleanMarkdownForSheets(text) {
    if (!text) return text;
    
    return text
      // 移除粗體標記 **text** -> 「text」
      .replace(/\*\*(.*?)\*\*/g, '「$1」')
      // 移除斜體標記 *text* -> text (但保留單個星號)
      .replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '$1')
      // 移除其他常見 markdown 符號
      .replace(/#{1,6}\s/g, '') // 移除標題標記
      .replace(/`([^`]+)`/g, '「$1」') // 移除程式碼標記，改用引號
      // 清理多餘的空行
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  /**
   * 生成三个信件切入点 - 改进版本
   */
  generateMailAngles(leadsProfile, firstName) {
    const prompt = `基於以下潛在客戶画像，請設計三個不同的銷售信件切入點。請用繁體中文回答。

客戶名稱：${firstName}
客戶畫像：${leadsProfile}

三個切入點都要包含研習活動的內容和具體的活動與產品名稱，目的是讓參加過活動的客人知道這則追蹤信件的來源
請嚴格按照以下格式回答，每個切入點獨立成段：

切入點1
主題：[簡短描述主題]
內容大綱：[50字內，包括價值主張、行動呼籲]

切入點2
主題：[簡短描述主題]
內容大綱：[50字內，包括價值主張、行動呼籲]

切入點3
主題：[簡短描述主題]
內容大綱：[50字內，包括價值主張、行動呼籲]

三個切入點應該根據客戶畫像選擇他們最在意的痛點與對他們影響最大的地方。

注意：
- 嚴禁生成不存在的資訊或案例，只能使用公司網站與搜尋結果的資訊。
- 請不要使用任何 Markdown 格式（如 **粗體** 或 *斜體*），請使用純文字格式，可以用「」符號來強調重點內容。`;

    try {
      console.log('开始生成邮件切入点...');
      const response = APIService.callPerplexityAPI(prompt);
      console.log('API 回应原始内容:', response);
      
      // 改进的解析方法
      const angles = this.parseMailAngles(response);
      console.log('解析后的切入点:', angles);
      
      return angles;
      
    } catch (error) {
      console.error('生成邮件切入点失败:', error);
      // 返回错误信息而不是默认值，这样更容易发现问题
      return {
        angle1: `錯誤：${error.message}`,
        angle2: `錯誤：${error.message}`,
        angle3: `錯誤：${error.message}`
      };
    }
  },

  /**
   * 解析邮件切入点的改进方法
   */
  parseMailAngles(response) {
    try {
      // 使用繁體中文關鍵字匹配
      const angle1Match = response.match(/切入點1[\s\S]*?(?=切入點2|$)/);
      const angle2Match = response.match(/切入點2[\s\S]*?(?=切入點3|$)/);
      const angle3Match = response.match(/切入點3[\s\S]*?$/);

      let angle1 = angle1Match ? angle1Match[0].replace('切入點1', '').trim() : '';
      let angle2 = angle2Match ? angle2Match[0].replace('切入點2', '').trim() : '';
      let angle3 = angle3Match ? angle3Match[0].replace('切入點3', '').trim() : '';

      // 如果繁體匹配失败，尝试简体中文
      if (!angle1 || !angle2 || !angle3) {
        console.log('繁體匹配失败，尝试简体中文...');
        const sections = response.split(/切入[点點][123]/);
        
        if (sections.length >= 4) {
          angle1 = sections[1]?.trim() || '';
          angle2 = sections[2]?.trim() || '';
          angle3 = sections[3]?.trim() || '';
        }
      }

      // 如果还是失败，尝试按行解析（支援繁簡體）
      if (!angle1 || !angle2 || !angle3) {
        console.log('分割方法失败，尝试按行解析...');
        const lines = response.split('\n');
        let currentAngle = '';
        let tempAngles = { angle1: '', angle2: '', angle3: '' };
        
        for (const line of lines) {
          if (line.includes('切入點1') || line.includes('切入点1')) {
            currentAngle = 'angle1';
            continue;
          } else if (line.includes('切入點2') || line.includes('切入点2')) {
            currentAngle = 'angle2';
            continue;
          } else if (line.includes('切入點3') || line.includes('切入点3')) {
            currentAngle = 'angle3';
            continue;
          }
          
          if (currentAngle && line.trim()) {
            tempAngles[currentAngle] += line.trim() + ' ';
          }
        }
        
        if (tempAngles.angle1) angle1 = tempAngles.angle1.trim();
        if (tempAngles.angle2) angle2 = tempAngles.angle2.trim();
        if (tempAngles.angle3) angle3 = tempAngles.angle3.trim();
      }

      // 最后检查，如果还是空的，返回原始回应的片段
      if (!angle1 && !angle2 && !angle3) {
        console.log('所有解析方法都失败，使用原始回应...');
        const responseLength = response.length;
        const third = Math.floor(responseLength / 3);
        
        return {
          angle1: response.substring(0, third) || '解析失敗，請檢查API回應格式',
          angle2: response.substring(third, third * 2) || '解析失敗，請檢查API回應格式',
          angle3: response.substring(third * 2) || '解析失敗，請檢查API回應格式'
        };
      }

      return {
        angle1: angle1 || '切入點1解析失敗',
        angle2: angle2 || '切入點2解析失敗',
        angle3: angle3 || '切入點3解析失敗'
      };

    } catch (error) {
      console.error('解析邮件切入点时发生错误:', error);
      return {
        angle1: `解析錯誤: ${error.message}`,
        angle2: `解析錯誤: ${error.message}`,
        angle3: `解析錯誤: ${error.message}`
      };
    }
  },


  /**
   * 生成單封追蹤信件
   */
  generateSingleFollowUpMail(leadsProfile, mailAngle, firstName, emailNumber) {
    try {
      const userInfo = UserInfoService.getUserInfo();
      let promptField, emailPrompt;
      
      // 根據郵件編號選擇對應的提示詞
      switch(emailNumber) {
        case 1:
          promptField = 'email1Prompt';
          emailPrompt = userInfo.email1Prompt;
          break;
        case 2:
          promptField = 'email2Prompt';  
          emailPrompt = userInfo.email2Prompt;
          break;
        case 3:
          promptField = 'email3Prompt';
          emailPrompt = userInfo.email3Prompt;
          break;
        default:
          throw new Error(`無效的郵件編號: ${emailNumber}`);
      }
      
      const prompt = `${emailPrompt}

收件人：${firstName}
Leads Profile：${leadsProfile}
Mail Angle：${mailAngle}

請按照以下格式提供：
主旨：[郵件主旨]
內容：[郵件正文]

注意：
- 嚴禁生成不存在的資訊或案例，只能使用公司網站與搜尋結果的資訊。
- 不要在信中提及客戶以外的個人姓名，只能提到公司名
- 請不要使用任何 Markdown 格式（如 **粗體** 或 *斜體*），請使用純文字格式，可以用「」符號來強調重點內容。
- 重要：不要包含任何簽名、敬祝商祺或聯絡方式，只寫郵件正文內容`;

      console.log(`生成第${emailNumber}封郵件...`);
      let mailContent = APIService.callPerplexityAPI(prompt);
      
      // 添加用戶簽名
      const signature = UserInfoService.generateEmailSignature();
      if (signature) {
        mailContent += signature;
      }
      
      console.log(`第${emailNumber}封郵件生成成功`);
      return mailContent;
      
    } catch (error) {
      console.error(`生成第${emailNumber}封郵件失敗:`, error);
      throw new Error(`生成第${emailNumber}封郵件失敗: ${error.message}`);
    }
  },

  /**
   * 测试单个切入点生成（用于调试）
   */
  testSingleAngleGeneration(leadsProfile, firstName) {
    const prompt = `基于以下客户画像，请设计一个销售信件切入点。请用繁体中文回答。

客户名称：${firstName}
客户画像：${leadsProfile}

请提供：
主题：解决客户最关心的痛点
内容大纲：100字内，包括价值主张和行动呼籲

请直接回答，不需要标号。`;

    try {
      const response = APIService.callPerplexityAPI(prompt);
      console.log('测试单个切入点生成成功:', response);
      return response;
    } catch (error) {
      console.error('测试单个切入点生成失败:', error);
      throw error;
    }
  }
};

// 全局函数包装器
function generateLeadsProfile(companyUrl, position, resourceUrl, firstName) {
  return ContentGenerator.generateLeadsProfile(companyUrl, position, resourceUrl, firstName);
}

function generateMailAngles(leadsProfile, firstName) {
  return ContentGenerator.generateMailAngles(leadsProfile, firstName);
}

function generateSingleFollowUpMail(leadsProfile, mailAngle, firstName, emailNumber) {
  return ContentGenerator.generateSingleFollowUpMail(leadsProfile, mailAngle, firstName, emailNumber);
}

// 添加测试函数
function testSingleAngleGeneration(leadsProfile, firstName) {
  return ContentGenerator.testSingleAngleGeneration(leadsProfile, firstName);
}