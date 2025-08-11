/**
 * 内容生成服务 - 处理所有 AI 内容生成
 */

const ContentGenerator = {
  
  /**
   * 生成潜在客户画像
   */
  generateLeadsProfile(context, firstName) {
    const prompt = `基于以下客户背景资讯，请协助分析并生成详细的潜在客户画像。请用繁体中文回答。

客户名称：${firstName}
背景资讯：${context}

请分析以下面向：
1. 客户的行业背景和职位
2. 可能的痛点和挑战
3. 决策影响因素
4. 溝通偏好
5. 潛在需求

请提供具体且实用的分析，帮助业务人员更好地了解这位潜在客户。`;

    try {
      const response = APIService.callPerplexityAPI(prompt);
      console.log('生成客户画像成功:', response.substring(0, 100) + '...');
      return response;
    } catch (error) {
      console.error('生成客户画像失败:', error);
      throw new Error(`生成客户画像失败: ${error.message}`);
    }
  },

  /**
   * 生成三个信件切入点 - 改进版本
   */
  generateMailAngles(leadsProfile, firstName) {
    const prompt = `基于以下潜在客户画像，请设计三个不同的销售信件切入点。请用繁体中文回答。

客户名称：${firstName}
客户画像：${leadsProfile}

请严格按照以下格式回答，每个切入点独立成段：

切入点1
主题：[简短描述主题]
内容大纲：[100字内，包括价值主张、行动呼籲]

切入点2
主题：[简短描述主题]
内容大纲：[100字内，包括价值主张、行动呼籲]

切入点3
主题：[简短描述主题]
内容大纲：[100字内，包括价值主张、行动呼籲]

三个切入点应该根據客戶畫像選擇他們最在意的痛點與對他們影響最大的地方。`;

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
      // 方法1: 使用正则表达式匹配
      const angle1Match = response.match(/切入点1[\s\S]*?(?=切入点2|$)/);
      const angle2Match = response.match(/切入点2[\s\S]*?(?=切入点3|$)/);
      const angle3Match = response.match(/切入点3[\s\S]*?$/);

      let angle1 = angle1Match ? angle1Match[0].replace('切入点1', '').trim() : '';
      let angle2 = angle2Match ? angle2Match[0].replace('切入点2', '').trim() : '';
      let angle3 = angle3Match ? angle3Match[0].replace('切入点3', '').trim() : '';

      // 方法2: 如果正则匹配失败，尝试简单分割
      if (!angle1 || !angle2 || !angle3) {
        console.log('正则匹配失败，尝试简单分割...');
        const sections = response.split(/切入点[123]/);
        
        if (sections.length >= 4) {
          angle1 = sections[1]?.trim() || '';
          angle2 = sections[2]?.trim() || '';
          angle3 = sections[3]?.trim() || '';
        }
      }

      // 方法3: 如果还是失败，尝试按行解析
      if (!angle1 || !angle2 || !angle3) {
        console.log('分割方法失败，尝试按行解析...');
        const lines = response.split('\n');
        let currentAngle = '';
        let tempAngles = { angle1: '', angle2: '', angle3: '' };
        
        for (const line of lines) {
          if (line.includes('切入点1')) {
            currentAngle = 'angle1';
            continue;
          } else if (line.includes('切入点2')) {
            currentAngle = 'angle2';
            continue;
          } else if (line.includes('切入点3')) {
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
function generateLeadsProfile(context, firstName) {
  return ContentGenerator.generateLeadsProfile(context, firstName);
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