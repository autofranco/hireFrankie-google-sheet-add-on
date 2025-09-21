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
    
    const prompt = `# 參與活動的客戶方資訊
客戶公司：${companyUrl}

# 任務
請分析客戶公司背景，並嚴格用此格式輸出：
- 規模:
- 業務特色:
- 近期公司活動:
- 近期產業新聞:

# 格式要求
- 總字數必須控制在170~200字，用繁體中文回答
- 簡潔的段落表達，避免冗長描述
- 嚴禁生成不存在的公司、品牌、解決方案、產品、案例、數據，只能使用搜尋結果的資訊
- 不使用 Markdown 或 HTML 格式，用「」符號強調重點
`;

    try {
      const result = APIService.callLLMAPI(prompt, 'perplexity', 'sonar-pro');
      console.log('生成客户画像成功:', result.content.substring(0, 100) + '...');

      // 清理 Markdown 格式，使其適合 Google Sheets 顯示
      const cleanedResponse = this.cleanMarkdownForSheets(result.content);
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
  generateMailAngles(leadsProfile, firstName, position) {
    const userInfo = UserInfoService.getUserInfo();
    const seminarBrief = userInfo.seminarBrief || '';

    const prompt = `# 我方舉辦的活動資訊: ${seminarBrief}
# 參與活動的客戶方資訊:
客戶姓名：${firstName}
客戶職位：${position}
客戶公司資訊：${leadsProfile}
# 任務
基於以上我方活動與客戶方資訊，請協助分析並簡潔的生成以下2個面向和3個切入點。
信件的主題切入點以研習活動的內容為主軸。
三個切入點應該根據客戶本人選擇最在意的痛點與對他影響最大的地方。
請按照以下格式回答，每個切入點獨立成段：

<aspect1> 職權與挑戰(100字內，決策權力和關注重點與此職位常見的痛點)

<aspect2> 參與動機與溝通策略(100字內，客戶參加本研習活動的可能需求，以及活動後最適合的追蹤方式和價值主張)

<angle1> 內容大綱(50字內，包括價值主張、行動呼籲)

<angle2> 內容大綱(50字內，包括價值主張、行動呼籲)

<angle3> 內容大綱(50字內，包括價值主張、行動呼籲)
 
# 格式要求
- 請用繁體中文回答，總字數必須控制在320~380個字
- 每個面向用簡潔的段落表達，避免冗長描述
- 嚴禁生成不存在的公司、品牌、解決方案、產品、案例、數據，只能使用上述的資訊
- 不使用 Markdown 格式，用「」符號強調重點
`;

    try {
      console.log('开始生成邮件切入点...');
      const result = APIService.callLLMAPI(prompt, 'gpt', 'gpt-5-mini-2025-08-07');
      console.log('API 回应原始内容:', result.content);

      // 改进的解析方法
      const angles = this.parseMailAngles(result.content);
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
      // 解析 aspect1 和 aspect2
      const aspect1Match = response.match(/<aspect1>[\s\S]*?(?=<aspect2>|<angle1>|$)/);
      const aspect2Match = response.match(/<aspect2>[\s\S]*?(?=<angle1>|$)/);

      let aspect1 = aspect1Match ? aspect1Match[0].replace('<aspect1>', '').replace(/職權與挑戰：?/, '').trim() : '';
      let aspect2 = aspect2Match ? aspect2Match[0].replace('<aspect2>', '').replace(/參與動機與溝通策略：?/, '').trim() : '';

      // 解析 angle1, angle2, angle3
      const angle1Match = response.match(/<angle1>[\s\S]*?(?=<angle2>|$)/);
      const angle2Match = response.match(/<angle2>[\s\S]*?(?=<angle3>|$)/);
      const angle3Match = response.match(/<angle3>[\s\S]*?$/);

      let angle1 = angle1Match ? angle1Match[0].replace('<angle1>', '').replace(/內容大綱：?/, '').trim() : '';
      let angle2 = angle2Match ? angle2Match[0].replace('<angle2>', '').replace(/內容大綱：?/, '').trim() : '';
      let angle3 = angle3Match ? angle3Match[0].replace('<angle3>', '').replace(/內容大綱：?/, '').trim() : '';

      // 如果任何項目解析失敗，記錄日誌但繼續
      if (!aspect1) console.log('aspect1 解析失敗');
      if (!aspect2) console.log('aspect2 解析失敗');
      if (!angle1) console.log('angle1 解析失敗');
      if (!angle2) console.log('angle2 解析失敗');
      if (!angle3) console.log('angle3 解析失敗');

      return {
        aspect1: aspect1 || 'aspect1解析失敗',
        aspect2: aspect2 || 'aspect2解析失敗',
        angle1: angle1 || 'angle1解析失敗',
        angle2: angle2 || 'angle2解析失敗',
        angle3: angle3 || 'angle3解析失敗'
      };

    } catch (error) {
      console.error('解析邮件切入点时发生错误:', error);
      return {
        aspect1: `解析錯誤: ${error.message}`,
        aspect2: `解析錯誤: ${error.message}`,
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
      const seminarBrief = userInfo.seminarBrief || '';
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
- 開場使用Leads Profile的資訊展現對客戶職位與其公司的了解
- 內容要使用 Mail Angle 的角度切入，使用Leads Profile的資訊讓客戶感覺此封信件是專門為'他'和'他的公司'寫的

# 客戶方資訊
- 收件人: ${firstName}
- Leads Profile : ${leadsProfile} 

# 我方舉辦的活動資訊
${seminarBrief}

# 信件切入點
Mail Angle: ${mailAngle}

# 輸出
請按照以下格式提供：
主旨：[郵件主旨]
內容：[郵件正文]

# 注意
- 嚴禁生成不存在的公司、品牌、解決方案、產品、案例、數據，只能使用上的資訊。
- 不要在信中提及客戶以外的個人姓名，只能提到公司名
- 請不要使用任何 Markdown 格式（如 **粗體** 或 *斜體*），請使用純文字格式，可以用「」符號來強調重點內容。
- 嚴禁輸出任何簽名、祝福或聯絡方式，只寫郵件正文內容
`;

      console.log(`生成第${emailNumber}封郵件...`);
      const result = APIService.callLLMAPI(prompt, 'gpt', 'gpt-5-mini-2025-08-07');
      let mailContent = result.content;

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
   * 生成研習活動簡介 (Seminar Brief)
   */
  generateSeminarBrief(seminarInfo) {
    const prompt = `請根據以下研習活動資訊，搜索相關資料並整理出簡潔的活動簡介。請用繁體中文回答，總字數控制在400字內。

研習活動資訊：${seminarInfo}

請簡潔分析以下五個面向（每個面向約80-100字）：
1. 活動概要：名稱、主辦單位、基本資訊
2. 主題重點：活動核心內容和學習要點
3. 目標族群：參加者職業背景和特質
4. 學習價值：參與者可獲得的具體收穫
5. 行業趨勢：相關領域的發展背景

格式要求：
- 每個面向用簡潔段落表達，避免冗長描述
- 基於搜索結果提供準確資訊，嚴禁生成虛假內容
- 不使用 Markdown 格式，用「」符號強調重點
- 確保五個面向都完整呈現，有助後續潛客分析`;

    try {
      console.log('開始生成研習活動簡介...');

      // 檢查用戶付費狀態
      APIService.checkUserPaymentStatus();
      console.log('✅ 用戶付費狀態驗證通過');

      const result = APIService.callLLMAPI(prompt, 'perplexity', 'sonar-pro');
      console.log('研習活動簡介生成成功:', result.content.substring(0, 100) + '...');

      // 清理 Markdown 格式
      const cleanedResponse = this.cleanMarkdownForSheets(result.content);

      // 立即儲存到工作表
      UserInfoService.updateSeminarBrief(cleanedResponse);

      return cleanedResponse;
    } catch (error) {
      console.error('生成研習活動簡介失敗:', error);
      throw new Error(`生成研習活動簡介失敗: ${error.message}`);
    }
  }
};

