/**
 * 内容生成服务 - 处理所有 AI 内容生成
 */

const ContentGenerator = {
  
  /**
   * 生成潜在客户画像
   */
  generateLeadsProfile(companyUrl, position, resourceUrl, firstName) {
    const prompt = `基於以下客戶資訊，請協助分析並生成詳細的潛在客戶畫像。請用繁體中文回答。

客戶名稱：${firstName}
公司網站：${companyUrl}
職位：${position}
資源/研習活動網站：${resourceUrl}

請分析以下面向：
1. 根據公司網站分析公司規模、行業背景、業務特色與近期新聞
2. 根據職位分析決策權力和關注重點
3. 參與研習活動的可能動機和需求
4. 針對此職位可能面臨的痛點和挑戰
5. 最適合的溝通方式和價值主張

請提供具體且實用的分析，幫助進行精準的後續追蹤。

注意：請不要使用任何 Markdown 格式（如 **粗體** 或 *斜體*），請使用純文字格式，可以用「」符號來強調重點內容。`;

    try {
      const response = APIService.callPerplexityAPI(prompt);
      console.log('生成客户画像成功:', response.substring(0, 100) + '...');
      
      // 清理 Markdown 格式，使其適合 Google Sheets 顯示
      const cleanedResponse = this.cleanMarkdownForSheets(response);
      return cleanedResponse;
    } catch (error) {
      console.error('生成客户画像失败:', error);
      throw new Error(`生成客户画像失败: ${error.message}`);
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
    const prompt = `基于以下潜在客户画像，请设计三个不同的销售信件切入点。请用繁体中文回答。

客户名称：${firstName}
客户画像：${leadsProfile}

請嚴格按照以下格式回答，每個切入點獨立成段：

切入點1
主題：[簡短描述主題]
內容大綱：[100字內，包括價值主張、行動呼籲]

切入點2
主題：[簡短描述主題]
內容大綱：[100字內，包括價值主張、行動呼籲]

切入點3
主題：[簡短描述主題]
內容大綱：[100字內，包括價值主張、行動呼籲]

三個切入點應該根據客戶畫像選擇他們最在意的痛點與對他們影響最大的地方。`;

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
        angle1: `错误：${error.message}`,
        angle2: `错误：${error.message}`,
        angle3: `错误：${error.message}`
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
          angle1: response.substring(0, third) || '解析失败，请检查API回应格式',
          angle2: response.substring(third, third * 2) || '解析失败，请检查API回应格式',
          angle3: response.substring(third * 2) || '解析失败，请检查API回应格式'
        };
      }

      return {
        angle1: angle1 || '切入点1解析失败',
        angle2: angle2 || '切入点2解析失败',
        angle3: angle3 || '切入点3解析失败'
      };

    } catch (error) {
      console.error('解析邮件切入点时发生错误:', error);
      return {
        angle1: `解析错误: ${error.message}`,
        angle2: `解析错误: ${error.message}`,
        angle3: `解析错误: ${error.message}`
      };
    }
  },

  /**
   * 生成三封追踪信件 - 改进版本
   */
  generateFollowUpMails(leadsProfile, mailAngles, firstName) {
    const results = {};
    
    try {
      // 生成第一封信件
      const prompt1 = `请根据以下资讯撰写一封专业的追踪信件。请用繁体中文撰写。

收件人：${firstName}
客户画像：${leadsProfile}
信件切入点：${mailAngles.angle1}

信件要求：
- 主旨要吸引人
- 开场要个人化
- 内容要简洁有力
- 包含明确的行动呼籲
- 語调要专业但友善
- 长度控制在200字以内
- 重要：不要包含任何签名、敬祝商祺或联系方式，只写邮件正文内容

请按照以下格式提供：
主旨：[邮件主旨]
内容：[邮件正文]`;

      console.log('生成第一封邮件...');
      results.mail1 = APIService.callPerplexityAPI(prompt1);
      
      // 添加用戶簽名
      const signature = UserInfoService.generateEmailSignature();
      if (signature) {
        results.mail1 += signature;
      }

      // 生成第二封信件
      const prompt2 = `请根据以下资讯撰写第二封追踪信件。请用繁体中文撰写。

收件人：${firstName}
客户画像：${leadsProfile}
信件切入点：${mailAngles.angle2}

信件要求：
- 这是第二次接触，語调可以更直接一些
- 强调价值和机会
- 包含社会证明或案例
- 明确的行动呼籲
- 长度控制在200字以内
- 重要：不要包含任何签名、敬祝商祺或联系方式，只写邮件正文内容

请按照以下格式提供：
主旨：[邮件主旨]
内容：[邮件正文]`;

      console.log('生成第二封邮件...');
      results.mail2 = APIService.callPerplexityAPI(prompt2);
      
      // 添加用戶簽名
      if (signature) {
        results.mail2 += signature;
      }

      // 生成第三封信件
      const prompt3 = `请根据以下资讯撰写第三封追踪信件。请用繁体中文撰写。

收件人：${firstName}
客户画像：${leadsProfile}
信件切入点：${mailAngles.angle3}

信件要求：
- 这是最后一次追踪，要有紧迫感
- 强调错过的成本
- 提供最后的价值
- 留下好印象，为未来合作铺路
- 长度控制在200字以内
- 重要：不要包含任何签名、敬祝商祺或联系方式，只写邮件正文内容

请按照以下格式提供：
主旨：[邮件主旨]
内容：[邮件正文]`;

      console.log('生成第三封邮件...');
      results.mail3 = APIService.callPerplexityAPI(prompt3);
      
      // 添加用戶簽名
      if (signature) {
        results.mail3 += signature;
      }

      console.log('所有邮件生成完成');
      return results;

    } catch (error) {
      console.error('生成追踪邮件失败:', error);
      
      // 确保返回的对象包含错误信息
      return {
        mail1: results.mail1 || `生成第一封邮件失败: ${error.message}`,
        mail2: results.mail2 || `生成第二封邮件失败: ${error.message}`,
        mail3: results.mail3 || `生成第三封邮件失败: ${error.message}`
      };
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

function generateFollowUpMails(leadsProfile, mailAngles, firstName) {
  return ContentGenerator.generateFollowUpMails(leadsProfile, mailAngles, firstName);
}

// 添加测试函数
function testSingleAngleGeneration(leadsProfile, firstName) {
  return ContentGenerator.testSingleAngleGeneration(leadsProfile, firstName);
}