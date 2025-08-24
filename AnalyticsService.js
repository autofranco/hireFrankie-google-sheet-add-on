/**
 * Google Analytics 追蹤服務 - 收集用戶行為數據
 */

const AnalyticsService = {
  
  /**
   * 獲取用戶ID（匿名化處理）
   */
  getUserId() {
    try {
      const userEmail = Session.getActiveUser().getEmail();
      // 使用 SHA-256 哈希來匿名化用戶 email
      const hashedUserId = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, userEmail);
      return Utilities.base64Encode(hashedUserId).substring(0, 16);
    } catch (error) {
      console.error('無法獲取用戶ID:', error);
      return 'anonymous_' + Utilities.getUuid().substring(0, 8);
    }
  },

  /**
   * 發送事件到 Google Analytics
   */
  trackEvent(eventName, eventParameters = {}) {
    try {
      if (!GOOGLE_ANALYTICS.MEASUREMENT_ID || GOOGLE_ANALYTICS.MEASUREMENT_ID === 'G-XXXXXXXXXX') {
        console.log('Google Analytics 未設定，跳過追蹤');
        return;
      }

      const userId = this.getUserId();
      const clientId = `${userId}.${Date.now()}`;
      
      const payload = {
        client_id: clientId,
        user_id: userId,
        events: [{
          name: eventName,
          params: {
            engagement_time_msec: '1000',
            session_id: this.getSessionId(),
            timestamp_micros: (Date.now() * 1000).toString(),
            ...eventParameters
          }
        }]
      };

      const url = `${GOOGLE_ANALYTICS.ENDPOINT}?measurement_id=${GOOGLE_ANALYTICS.MEASUREMENT_ID}&api_secret=${GOOGLE_ANALYTICS.API_SECRET}`;
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      };

      UrlFetchApp.fetch(url, options);
      console.log(`已追蹤事件: ${eventName}`);
      
    } catch (error) {
      console.error('Google Analytics 追蹤失敗:', error);
    }
  },

  /**
   * 獲取會話ID
   */
  getSessionId() {
    const now = Date.now();
    const sessionDuration = 30 * 60 * 1000; // 30分鐘
    return Math.floor(now / sessionDuration);
  },

  /**
   * 追蹤用戶首次安裝
   */
  trackInstall() {
    this.trackEvent('first_open', {
      method: 'google_workspace_addon'
    });
  },

  /**
   * 追蹤工作表開啟
   */
  trackSheetOpen() {
    this.trackEvent('sheet_open', {
      content_type: 'spreadsheet'
    });
  },

  /**
   * 追蹤客戶畫像生成
   */
  trackLeadsProfileGeneration(success = true) {
    this.trackEvent('generate_leads_profile', {
      success: success,
      content_type: 'ai_generated'
    });
  },

  /**
   * 追蹤郵件切入點生成
   */
  trackMailAnglesGeneration(success = true) {
    this.trackEvent('generate_mail_angles', {
      success: success,
      content_type: 'ai_generated'
    });
  },

  /**
   * 追蹤郵件生成
   */
  trackEmailGeneration(emailCount = 3, success = true) {
    this.trackEvent('generate_emails', {
      success: success,
      email_count: emailCount,
      content_type: 'ai_generated'
    });
  },

  /**
   * 追蹤郵件發送
   */
  trackEmailSent(emailType = 'follow_up') {
    this.trackEvent('send_email', {
      email_type: emailType,
      method: 'gmail_api'
    });
  },

  /**
   * 追蹤用戶設定更新
   */
  trackUserSettingsUpdate(settingType = 'user_info') {
    this.trackEvent('update_settings', {
      setting_type: settingType
    });
  },

  /**
   * 追蹤功能使用
   */
  trackFeatureUsage(featureName) {
    this.trackEvent('feature_usage', {
      feature_name: featureName
    });
  },

  /**
   * 追蹤錯誤
   */
  trackError(errorType, errorMessage = '') {
    this.trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100) // 限制錯誤訊息長度
    });
  }
};

// 全局函數包裝器
function trackInstall() {
  AnalyticsService.trackInstall();
}

function trackSheetOpen() {
  AnalyticsService.trackSheetOpen();
}