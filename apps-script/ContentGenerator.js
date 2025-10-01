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

      // 返回包含統計資訊的完整結果
      return {
        content: cleanedResponse,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        tracking: result.tracking
      };
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
  generateMailAngles(leadsProfile, firstName, position, department) {
    const userInfo = UserInfoService.getUserInfo();
    const seminarBrief = userInfo.seminarBrief || '';

    const prompt = `# 我方舉辦的活動資訊: ${seminarBrief}
# 參與活動的客戶方資訊:
客戶姓名：${firstName}
客戶職位：${position}
客戶部門：${department}
客戶公司資訊：${leadsProfile}
# 任務
基於以上我方活動與客戶方資訊，請協助分析並簡潔的生成以下2個面向和3個信件內容切入點。
用戶已經參加過我方舉辦的活動，信件的目的是邀約客戶做後續的動作，信件切入點以研習活動的內容為主軸。
三個切入點應該根據客戶本人選擇最在意的痛點與對他影響最大的地方，特別考慮其在${department}部門擔任${position}職位的特殊需求和關注重點。

請嚴格按照以下格式回答，每個切入點獨立成段：

<aspect1>(**職權與挑戰，100字內，決策權力和關注重點與此職位在${department}部門常見的痛點**)</aspect1>

<aspect2>(**參與動機與溝通策略，100字內，客戶參加本研習活動的可能需求，以及活動後最適合的追蹤方式和價值主張**)</aspect2>

<angle1>(**信件1內容大綱，50字內，包括價值主張、行動呼籲**)</angle1>

<angle2>(**信件2大綱，50字內，包括價值主張、行動呼籲**)</angle2>

<angle3>(**信件3大綱，50字內，包括價值主張、行動呼籲**)</angle3>

# 格式要求
- 在parentheses()中被**包起來的說明文字不要輸出
- 必須使用XML格式，如 <aspect1>內容</aspect1> 和 <angle1>內容</angle1>
- 請用繁體中文回答，總字數必須控制在320~380個字
- 每個面向用簡潔的段落表達，避免冗長描述
- 特別考慮${department}部門的工作特性和該職位的業務重點
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

      // 返回包含統計資訊的完整結果
      return {
        content: angles,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        tracking: result.tracking
      };
      
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
   * 解析邮件切入点 - 使用XML標籤格式的簡化版本
   */
  parseMailAngles(response) {
    try {
      console.log('開始解析 Mail Angles，原始回應長度:', response.length);

      // 使用簡單的XML標籤解析
      const parseTag = (tagName) => {
        const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
        const match = response.match(regex);
        if (match && match[1]) {
          // 清理內容：移除說明文字和多餘空白
          let content = match[1]
            .replace(/\*\*[^*]*\*\*/g, '') // 移除 **說明文字**
            .replace(/\([^)]*\)/g, '')     // 移除 (說明文字)
            .replace(/【[^】]*】/g, '')     // 移除 【說明文字】
            .trim();
          return content;
        }
        return '';
      };

      // 解析各個標籤
      const aspect1 = parseTag('aspect1');
      const aspect2 = parseTag('aspect2');
      const angle1 = parseTag('angle1');
      const angle2 = parseTag('angle2');
      const angle3 = parseTag('angle3');

      // 記錄解析結果
      console.log(`解析結果: aspect1=${!!aspect1}, aspect2=${!!aspect2}, angle1=${!!angle1}, angle2=${!!angle2}, angle3=${!!angle3}`);

      // 記錄解析失敗的項目
      if (!aspect1) console.log('⚠️ aspect1 解析失敗');
      if (!aspect2) console.log('⚠️ aspect2 解析失敗');
      if (!angle1) console.log('⚠️ angle1 解析失敗');
      if (!angle2) console.log('⚠️ angle2 解析失敗');
      if (!angle3) console.log('⚠️ angle3 解析失敗');

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
   * 測試解析邮件切入点功能
   * 用於驗證新的XML標籤解析是否正常工作
   */
  testParseMailAngles() {
    const testResponse = `
<aspect1>負責公司數位轉型決策，面臨技術選擇與投資效益評估的挑戰，需要平衡創新與風險控制</aspect1>

<aspect2>參加活動是為了解決數位化轉型痛點，最適合透過具體案例分享和量化效益證明來建立信任</aspect2>

<angle1>強調數位轉型ROI計算方法，邀請參與一對一諮詢會議</angle1>

<angle2>分享同業成功轉型案例，提供免費評估服務</angle2>

<angle3>提醒錯過數位轉型黃金時機的風險，最後機會預約專家諮詢</angle3>
    `;

    console.log('=== 測試新的解析功能 ===');
    const result = this.parseMailAngles(testResponse);
    console.log('解析結果:', result);
    return result;
  },


  /**
   * 生成單封追蹤信件
   */
  generateSingleFollowUpMail(leadsProfile, mailAngle, firstName, emailNumber, department, position) {
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
- 特別考慮客戶在${department}部門擔任${position}職位的特殊需求和關注重點

# 客戶方資訊
- 收件人: ${firstName}
- 職位: ${position}
- 部門: ${department}
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

      // 返回包含統計資訊的完整結果
      return {
        content: mailContent,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        tracking: result.tracking
      };
      
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

      // 返回包含統計資訊的完整結果
      return {
        content: cleanedResponse,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        tracking: result.tracking
      };
    } catch (error) {
      console.error('生成研習活動簡介失敗:', error);
      throw new Error(`生成研習活動簡介失敗: ${error.message}`);
    }
  },

  /**
   * 批次生成多個潛在客戶畫像，這段只做公司研究，不進行職位分析-->mail angle才做
   * @param {Array} batchData - 批次資料陣列，每個元素包含 companyUrl, position, firstName
   * @param {Object} userInfo - 用戶資訊物件 (避免重複獲取)
   * @returns {Array} 生成結果陣列
   */
  generateLeadsProfilesBatch(batchData, userInfo = null) {
    try {
      console.log(`開始批次生成 ${batchData.length} 個客戶畫像...`);

      // 準備所有 API 請求
      const requests = batchData.map((data, index) => {
        const prompt = `# 參與活動的客戶方資訊
客戶公司：${data.companyUrl}

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
- 不使用 Markdown 或 HTML 格式，用「」符號強調重點`;

        return {
          prompt: prompt,
          provider: 'perplexity',
          model: 'sonar-pro'
        };
      });

      // 批次調用 API
      const responses = APIService.callLLMAPIBatch(requests);

      // 處理回應結果
      const results = responses.map((response, index) => {
        if (response.success) {
          const cleanedContent = this.cleanMarkdownForSheets(response.result.content);

          return {
            success: true,
            content: cleanedContent,
            provider: response.result.provider,
            model: response.result.model,
            usage: response.result.usage,
            tracking: response.result.tracking
          };
        } else {
          console.error(`客戶畫像 ${index + 1} 生成失敗:`, response.error);
          return {
            success: false,
            error: response.error,
            content: null
          };
        }
      });

      return results;

    } catch (error) {
      console.error('批次生成客戶畫像失敗:', error);
      throw new Error(`批次生成客戶畫像失敗: ${error.message}`);
    }
  },

  /**
   * 批次生成多個郵件切入點
   * @param {Array} batchData - 批次資料陣列，每個元素包含 leadsProfile, firstName, position, department
   * @param {Object} userInfo - 用戶資訊物件 (避免重複獲取)
   * @returns {Array} 生成結果陣列
   */
  generateMailAnglesBatch(batchData, userInfo = null) {
    try {
      console.log(`開始批次生成 ${batchData.length} 個郵件切入點...`);

      // 使用傳入的 userInfo 或獲取新的（向後兼容）
      const user = userInfo || UserInfoService.getUserInfo();
      const seminarBrief = user.seminarBrief || '';

      // 準備所有 API 請求
      const requests = batchData.map((data, index) => {
        const prompt = `# 我方舉辦的活動資訊: ${seminarBrief}
# 參與活動的客戶方資訊:
客戶姓名：${data.firstName}
客戶職位：${data.position}
客戶部門：${data.department}
客戶公司資訊：${data.leadsProfile}
# 任務
基於以上我方活動與客戶方資訊，請協助分析並簡潔的生成以下2個面向和3個信件內容切入點。
用戶已經參加過我方舉辦的活動，信件的目的是邀約客戶做後續的動作，信件切入點以研習活動的內容為主軸。
三個切入點應該根據客戶本人選擇最在意的痛點與對他影響最大的地方，特別考慮其在${data.department}部門擔任${data.position}職位的特殊需求和關注重點。

請嚴格按照以下格式回答，每個切入點獨立成段：

<aspect1>(**職權與挑戰，100字內，決策權力和關注重點與此職位在${data.department}部門常見的痛點**)</aspect1>

<aspect2>(**參與動機與溝通策略，100字內，客戶參加本研習活動的可能需求，以及活動後最適合的追蹤方式和價值主張**)</aspect2>

<angle1>(**信件1內容大綱，50字內，包括價值主張、行動呼籲**)</angle1>

<angle2>(**信件2大綱，50字內，包括價值主張、行動呼籲**)</angle2>

<angle3>(**信件3大綱，50字內，包括價值主張、行動呼籲**)</angle3>

# 格式要求
- 在parentheses()中被**包起來的說明文字不要輸出
- 必須使用XML格式，如 <aspect1>內容</aspect1> 和 <angle1>內容</angle1>
- 請用繁體中文回答，總字數必須控制在320~380個字
- 每個面向用簡潔的段落表達，避免冗長描述
- 特別考慮${data.department}部門的工作特性和該職位的業務重點
- 嚴禁生成不存在的公司、品牌、解決方案、產品、案例、數據，只能使用上述的資訊
- 不使用 Markdown 格式，用「」符號強調重點`;

        return {
          prompt: prompt,
          provider: 'gpt',
          model: 'gpt-5-mini-2025-08-07'
        };
      });

      // 批次調用 API
      const responses = APIService.callLLMAPIBatch(requests);

      // 處理回應結果
      const results = responses.map((response, index) => {
        if (response.success) {
          const angles = this.parseMailAngles(response.result.content);

          return {
            success: true,
            content: angles,
            provider: response.result.provider,
            model: response.result.model,
            usage: response.result.usage,
            tracking: response.result.tracking
          };
        } else {
          console.error(`郵件切入點 ${index + 1} 生成失敗:`, response.error);
          return {
            success: false,
            error: response.error,
            content: null
          };
        }
      });

      return results;

    } catch (error) {
      console.error('批次生成郵件切入點失敗:', error);
      throw new Error(`批次生成郵件切入點失敗: ${error.message}`);
    }
  },

  /**
   * 批次生成多封第一封追蹤郵件
   * @param {Array} batchData - 批次資料陣列，每個元素包含 leadsProfile, mailAngle, firstName, department, position
   * @param {Object} userInfo - 用戶資訊物件 (避免重複獲取)
   * @returns {Array} 生成結果陣列
   */
  generateFirstMailsBatch(batchData, userInfo = null) {
    try {
      console.log(`開始批次生成 ${batchData.length} 封第一封追蹤郵件...`);

      // 使用傳入的 userInfo 或獲取新的（向後兼容）
      const user = userInfo || UserInfoService.getUserInfo();
      const seminarBrief = user.seminarBrief || '';
      const emailPrompt = user.email1Prompt;

      // 準備所有 API 請求
      const requests = batchData.map((data, index) => {
        const prompt = `${emailPrompt}
- 開場使用Leads Profile的資訊展現對客戶職位與其公司的了解
- 內容要使用 Mail Angle 的角度切入，使用Leads Profile的資訊讓客戶感覺此封信件是專門為'他'和'他的公司'寫的
- 特別考慮客戶在${data.department}部門擔任${data.position}職位的特殊需求和關注重點
- 客戶稱謂只有中階管理層以上才需要加上職稱，不然用姓名即可
- 在撰寫郵件時，請根據Leads Profile中的客戶公司的國家或文化的商業信件書寫慣例，判斷在正式郵件中最合適的客戶稱謂。郵件主旨與郵件正文務必使用同樣稱呼

# 客戶方資訊
- 收件人: ${data.firstName}
- 職位: ${data.position}
- 部門: ${data.department}
- Leads Profile : ${data.leadsProfile}

# 我方舉辦的活動資訊
${seminarBrief}

# 信件切入點
Mail Angle: ${data.mailAngle}

# 輸出
請按照以下格式提供：
主旨：[郵件主旨]
內容：[郵件正文]

# 注意
- 嚴禁生成不存在的公司、品牌、解決方案、產品、案例、數據，只能使用上的資訊。
- 不要在信中提及客戶以外的個人姓名，只能提到公司名
- 請不要使用任何 Markdown 格式（如 **粗體** 或 *斜體*），請使用純文字格式，可以用「」符號來強調重點內容。
- 嚴禁輸出任何簽名、祝福或聯絡方式，只寫郵件正文內容
- 嚴格限制不在郵件正文中提及客戶公司的資本額與人數
- 郵件正文請分行排版，避免過長段落。相同主題或邏輯相關的內容，請群聚為同一段落。不同段落之間請空一行，確保層次清楚、內容更易讀。`;

        return {
          prompt: prompt,
          provider: 'gpt',
          model: 'gpt-5-mini-2025-08-07'
        };
      });

      // 批次調用 API
      const responses = APIService.callLLMAPIBatch(requests);

      // 處理回應結果
      const results = responses.map((response, index) => {
        if (response.success) {
          let mailContent = response.result.content;

          // 添加用戶簽名
          const signature = UserInfoService.generateEmailSignature();
          if (signature) {
            mailContent += signature;
          }

          return {
            success: true,
            content: mailContent,
            provider: response.result.provider,
            model: response.result.model,
            usage: response.result.usage,
            tracking: response.result.tracking
          };
        } else {
          console.error(`第一封郵件 ${index + 1} 生成失敗:`, response.error);
          return {
            success: false,
            error: response.error,
            content: null
          };
        }
      });

      return results;

    } catch (error) {
      console.error('批次生成第一封郵件失敗:', error);
      throw new Error(`批次生成第一封郵件失敗: ${error.message}`);
    }
  },

  /**
   * 批次生成多封後續追蹤郵件（第二/三封）
   * @param {Array} batchData - 批次資料陣列，每個元素包含 leadsProfile, mailAngle, firstName, emailNumber, department, position
   * @returns {Array} 生成結果陣列
   */
  generateFollowUpMailsBatch(batchData) {
    try {
      console.log(`開始批次生成 ${batchData.length} 封後續追蹤郵件...`);

      const userInfo = UserInfoService.getUserInfo();
      const seminarBrief = userInfo.seminarBrief || '';

      // 準備所有 API 請求
      const requests = batchData.map((data, index) => {
        // 根據郵件編號選擇對應的提示詞
        let emailPrompt;
        switch(data.emailNumber) {
          case 2:
            emailPrompt = userInfo.email2Prompt;
            break;
          case 3:
            emailPrompt = userInfo.email3Prompt;
            break;
          default:
            throw new Error(`無效的郵件編號: ${data.emailNumber}`);
        }

        const prompt = `${emailPrompt}
- 開場使用Leads Profile的資訊展現對客戶職位與其公司的了解
- 內容要使用 Mail Angle 的角度切入，使用Leads Profile的資訊讓客戶感覺此封信件是專門為'他'和'他的公司'寫的
- 特別考慮客戶在${data.department}部門擔任${data.position}職位的特殊需求和關注重點
- 客戶稱謂只有中階管理層以上才需要加上職稱，不然用姓名即可
- 在撰寫郵件時，請根據Leads Profile中的客戶公司的國家或文化的商業信件書寫慣例，判斷在正式郵件中最合適的客戶稱謂。郵件主旨與郵件正文務必使用同樣稱呼

# 客戶方資訊
- 收件人: ${data.firstName}
- 職位: ${data.position}
- 部門: ${data.department}
- Leads Profile : ${data.leadsProfile}

# 我方舉辦的活動資訊
${seminarBrief}

# 信件切入點
Mail Angle: ${data.mailAngle}

# 輸出
請按照以下格式提供：
主旨：[郵件主旨]
內容：[郵件正文]

# 注意
- 嚴禁生成不存在的公司、品牌、解決方案、產品、案例、數據，只能使用上的資訊。
- 不要在信中提及客戶以外的個人姓名，只能提到公司名
- 請不要使用任何 Markdown 格式（如 **粗體** 或 *斜體*），請使用純文字格式，可以用「」符號來強調重點內容。
- 嚴禁輸出任何簽名、祝福或聯絡方式，只寫郵件正文內容
- 嚴格限制不在郵件正文中提及客戶公司的資本額與人數
- 郵件正文請分段排版，避免過長段落。相同主題或邏輯相關的內容，請群聚為同一段落。不同段落之間請空一行，確保層次清楚、內容更易讀。`;

        return {
          prompt: prompt,
          provider: 'gpt',
          model: 'gpt-5-mini-2025-08-07'
        };
      });

      // 批次調用 API
      const responses = APIService.callLLMAPIBatch(requests);

      // 處理回應結果
      const results = responses.map((response, index) => {
        if (response.success) {
          let mailContent = response.result.content;

          // 添加用戶簽名
          const signature = UserInfoService.generateEmailSignature();
          if (signature) {
            mailContent += signature;
          }

          console.log(`第${batchData[index].emailNumber}封郵件 ${index + 1} 生成成功`);

          return {
            success: true,
            content: mailContent,
            provider: response.result.provider,
            model: response.result.model,
            usage: response.result.usage,
            tracking: response.result.tracking
          };
        } else {
          console.error(`第${batchData[index].emailNumber}封郵件 ${index + 1} 生成失敗:`, response.error);
          return {
            success: false,
            error: response.error,
            content: null
          };
        }
      });

      return results;

    } catch (error) {
      console.error('批次生成後續追蹤郵件失敗:', error);
      throw new Error(`批次生成後續追蹤郵件失敗: ${error.message}`);
    }
  }
};

