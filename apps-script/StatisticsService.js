/**
 * 統計服務 - 執行記錄和成本統計追蹤
 */

const StatisticsService = {

  /**
   * 執行統計數據
   */
  runStats: {
    startTime: null,
    endTime: null,
    seminarBrief: null,
    rows: [],
    totalCost: 0,
    totalDuration: 0
  },

  /**
   * 開始執行統計追蹤
   */
  startRun() {
    this.runStats = {
      startTime: Date.now(),
      endTime: null,
      seminarBrief: null,
      rows: [],
      totalCost: 0,
      totalDuration: 0
    };

    console.log('=== 開始執行統計追蹤 ===');
    console.log('開始時間:', new Date(this.runStats.startTime).toLocaleString());
  },

  /**
   * 記錄 Seminar Brief 統計
   */
  recordSeminarBrief(trackingData) {
    if (!trackingData || !trackingData.tracking) {
      console.warn('Seminar Brief 統計資料不完整');
      return;
    }

    const tracking = trackingData.tracking;
    const usage = trackingData.usage || {};

    this.runStats.seminarBrief = {
      model: `${trackingData.provider}/${trackingData.model}`,
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      cost: tracking.cost_twd || 0,
      duration: tracking.duration_ms || 0
    };

    this.runStats.totalCost += this.runStats.seminarBrief.cost;
    this.runStats.totalDuration += this.runStats.seminarBrief.duration;

    // 輸出格式化的統計日誌
    this.logAPICall('Seminar Brief', this.runStats.seminarBrief);
    this.logSummaryLine('Seminar brief', this.runStats.seminarBrief);
  },

  /**
   * 記錄單行處理統計
   */
  recordRowProcessing(rowIndex, leadProfile, mailAngles, mails) {
    const rowStats = {
      rowIndex: rowIndex,
      leadProfile: this.extractStats(leadProfile, 'Lead Profile'),
      mailAngles: this.extractStats(mailAngles, 'Mail Angles'),
      mails: []
    };

    // 記錄每封郵件的統計
    if (mails && Array.isArray(mails)) {
      mails.forEach((mail, index) => {
        const mailStats = this.extractStats(mail, `Mail${index + 1}`);
        rowStats.mails.push(mailStats);
      });
    }

    // 計算該行總成本和時間
    let rowTotalCost = 0;
    let rowTotalDuration = 0;

    if (rowStats.leadProfile) {
      rowTotalCost += rowStats.leadProfile.cost;
      rowTotalDuration += rowStats.leadProfile.duration;
    }
    if (rowStats.mailAngles) {
      rowTotalCost += rowStats.mailAngles.cost;
      rowTotalDuration += rowStats.mailAngles.duration;
    }
    rowStats.mails.forEach(mail => {
      if (mail) {
        rowTotalCost += mail.cost;
        rowTotalDuration += mail.duration;
      }
    });

    rowStats.totalCost = rowTotalCost;
    rowStats.totalDuration = rowTotalDuration;

    this.runStats.rows.push(rowStats);
    this.runStats.totalCost += rowTotalCost;
    this.runStats.totalDuration += rowTotalDuration;

    // 輸出該行的統計日誌
    this.logRowComplete(rowStats);
  },

  /**
   * 從 API 回應中提取統計資料
   */
  extractStats(apiResponse, stepName) {
    if (!apiResponse || !apiResponse.tracking) {
      console.warn(`${stepName} 統計資料不完整`);
      return null;
    }

    const tracking = apiResponse.tracking;
    const usage = apiResponse.usage || {};

    const stats = {
      model: `${apiResponse.provider}/${apiResponse.model}`,
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      cost: tracking.cost_twd || 0,
      duration: tracking.duration_ms || 0
    };

    // 輸出 API 調用日誌
    this.logAPICall(stepName, stats);

    return stats;
  },

  /**
   * 結束執行統計
   */
  endRun() {
    this.runStats.endTime = Date.now();
    const totalExecutionTime = this.runStats.endTime - this.runStats.startTime;

    // 輸出最終統計報告
    this.logFinalSummary(totalExecutionTime);
  },

  /**
   * 輸出 API 調用日誌
   */
  logAPICall(stepName, stats) {
    if (!stats) return;

    console.log(`=== ${stepName} API 調用 ===`);
    console.log(`Model: ${stats.model}`);
    console.log(`Input tokens: ${stats.inputTokens.toLocaleString()}`);
    console.log(`Output tokens: ${stats.outputTokens.toLocaleString()}`);
    console.log(`Cost: NT$${stats.cost.toFixed(4)}`);
    console.log(`Duration: ${(stats.duration / 1000).toFixed(2)}秒`);
    console.log('========================');
  },

  /**
   * 輸出摘要行日誌
   */
  logSummaryLine(stepName, stats) {
    if (!stats) return;

    const duration = (stats.duration / 1000).toFixed(2);
    console.log(`${stepName}: ${stats.model} / ${stats.inputTokens} / ${stats.outputTokens} / NT$${stats.cost.toFixed(4)} / ${duration}秒`);
  },

  /**
   * 輸出行完成日誌
   */
  logRowComplete(rowStats) {
    console.log(`\n=== 第 ${rowStats.rowIndex} 行處理完成 ===`);

    if (rowStats.leadProfile) {
      this.logSummaryLine('Lead profile', rowStats.leadProfile);
    }

    if (rowStats.mailAngles) {
      this.logSummaryLine('Mail angle', rowStats.mailAngles);
    }

    rowStats.mails.forEach((mail, index) => {
      if (mail) {
        this.logSummaryLine(`Mail${index + 1}`, mail);
      }
    });

    const rowDuration = (rowStats.totalDuration / 1000).toFixed(2);
    console.log(`行總計: NT$${rowStats.totalCost.toFixed(4)} / ${rowDuration}秒`);
    console.log('========================\n');
  },

  /**
   * 輸出最終統計報告
   */
  logFinalSummary(totalExecutionTime) {
    const totalMinutes = Math.floor(totalExecutionTime / 60000);
    const totalSeconds = Math.floor((totalExecutionTime % 60000) / 1000);
    const totalTimeStr = `${totalMinutes}分${totalSeconds}秒`;

    console.log('\n=== 執行完成總結 ===');
    console.log(`總執行時間: ${totalTimeStr}`);

    // Seminar brief 統計
    if (this.runStats.seminarBrief) {
      const seminarDuration = (this.runStats.seminarBrief.duration / 1000).toFixed(2);
      console.log(`Seminar brief: ${seminarDuration}秒 / NT$${this.runStats.seminarBrief.cost.toFixed(4)}`);
    }

    // 行處理統計
    const rowCount = this.runStats.rows.length;
    if (rowCount > 0) {
      const rowsTotalCost = this.runStats.rows.reduce((sum, row) => sum + row.totalCost, 0);
      const rowsTotalDuration = this.runStats.rows.reduce((sum, row) => sum + row.totalDuration, 0);
      const rowsMinutes = Math.floor(rowsTotalDuration / 60000);
      const rowsSeconds = Math.floor((rowsTotalDuration % 60000) / 1000);
      const rowsTimeStr = `${rowsMinutes}分${rowsSeconds}秒`;

      console.log(`處理 ${rowCount} 筆資料: ${rowsTimeStr} / NT$${rowsTotalCost.toFixed(4)}`);

      // 平均統計
      const avgCost = rowsTotalCost / rowCount;
      const avgDuration = rowsTotalDuration / rowCount;
      const avgMinutes = Math.floor(avgDuration / 60000);
      const avgSeconds = Math.floor((avgDuration % 60000) / 1000);
      const avgTimeStr = `${avgMinutes}分${avgSeconds}秒`;

      console.log(`平均每筆: ${avgTimeStr} / NT$${avgCost.toFixed(4)}`);
    }

    console.log(`總 Token 成本: NT$${this.runStats.totalCost.toFixed(4)}`);
    console.log('====================\n');

    // 重置統計資料
    this.resetStats();
  },

  /**
   * 重置統計資料
   */
  resetStats() {
    this.runStats = {
      startTime: null,
      endTime: null,
      seminarBrief: null,
      rows: [],
      totalCost: 0,
      totalDuration: 0
    };
  },

  /**
   * 獲取當前統計資料（用於調試）
   */
  getCurrentStats() {
    return this.runStats;
  },

  /**
   * 格式化時間顯示
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      return `${remainingSeconds}秒`;
    }
  }
};