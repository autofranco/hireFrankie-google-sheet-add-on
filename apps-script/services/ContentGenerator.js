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

    // 使用當前語言生成提示詞
    const currentLang = LocalizationService.getCurrentLanguage();
    const prompt = LocalizationService.getLeadsProfilePrompt(companyUrl, currentLang);

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

    // 使用當前語言生成提示詞
    const currentLang = LocalizationService.getCurrentLanguage();
    const prompt = LocalizationService.getMailAnglesPrompt(seminarBrief, firstName, position, department, leadsProfile, currentLang);

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
   * 生成研習活動簡介 (Seminar Brief)
   */
  generateSeminarBrief(seminarInfo) {
    // 使用當前語言生成提示詞
    const currentLang = LocalizationService.getCurrentLanguage();
    const prompt = LocalizationService.getSeminarBriefPrompt(seminarInfo, currentLang);

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
   * 構建郵件生成提示詞
   * @private
   */
  buildMailPrompt(emailPrompt, data, seminarBrief) {
    // 取得當前語言的郵件提示詞模板
    const currentLang = LocalizationService.getCurrentLanguage();

    // Handle empty department
    const hasDepartment = data.department && data.department.toString().trim() !== '';
    const departmentContext = hasDepartment ? ` in the ${data.department} department` : '';
    const departmentLine = hasDepartment ? `\n- Department: ${data.department}` : '';
    const departmentContextChinese = hasDepartment ? `在${data.department}部門` : '';
    const departmentLineChinese = hasDepartment ? `\n- 部門: ${data.department}` : '';

    const promptTemplate = LocalizationService.getEmailPromptTemplate(currentLang)
      .replace(/{departmentContext}/g, departmentContext)
      .replace(/{departmentLine}/g, departmentLine)
      .replace(/{departmentContextChinese}/g, departmentContextChinese)
      .replace(/{departmentLineChinese}/g, departmentLineChinese)
      .replace(/{department}/g, data.department || '')
      .replace(/{position}/g, data.position)
      .replace(/{firstName}/g, data.firstName)
      .replace(/{leadsProfile}/g, data.leadsProfile)
      .replace(/{seminarBrief}/g, seminarBrief)
      .replace(/{mailAngle}/g, data.mailAngle);

    return `${emailPrompt}${promptTemplate}`;
  },

  /**
   * 批次生成郵件（統一函數處理所有郵件編號）
   * @param {Array} batchData - 批次資料陣列，每個元素包含 leadsProfile, mailAngle, firstName, department, position, emailNumber (1/2/3)
   * @param {Object} userInfo - 用戶資訊物件 (避免重複獲取)
   * @returns {Array} 生成結果陣列
   */
  generateMailsBatch(batchData, userInfo = null) {
    try {
      console.log(`開始批次生成 ${batchData.length} 封郵件...`);

      const user = userInfo || UserInfoService.getUserInfo();
      const seminarBrief = user.seminarBrief || '';

      // 準備所有 API 請求
      const requests = batchData.map((data) => {
        let emailPrompt;
        switch(data.emailNumber) {
          case 1: emailPrompt = user.email1Prompt; break;
          case 2: emailPrompt = user.email2Prompt; break;
          case 3: emailPrompt = user.email3Prompt; break;
          default: throw new Error(`無效的郵件編號: ${data.emailNumber}`);
        }

        return {
          prompt: this.buildMailPrompt(emailPrompt, data, seminarBrief),
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
      console.error('批次生成郵件失敗:', error);
      throw new Error(`批次生成郵件失敗: ${error.message}`);
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

      // 取得當前語言
      const currentLang = LocalizationService.getCurrentLanguage();

      // 準備所有 API 請求
      const requests = batchData.map((data, index) => {
        const prompt = LocalizationService.getLeadsProfilePrompt(data.companyUrl, currentLang);

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

      // 取得當前語言
      const currentLang = LocalizationService.getCurrentLanguage();

      // 準備所有 API 請求
      const requests = batchData.map((data, index) => {
        const prompt = LocalizationService.getMailAnglesPrompt(
          seminarBrief,
          data.firstName,
          data.position,
          data.department,
          data.leadsProfile,
          currentLang
        );

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

};

