/**
 * =============================================================================
 *                    AUTO LEAD WARMER - BETA TESTING VERSION
 * =============================================================================
 *
 * 🚨 重要聲明：此軟體為專有軟體測試版本
 *
 * ⚠️  嚴格禁止事項：
 * • 禁止複製、分享或傳播此程式碼給任何第三方
 * • 禁止用於商業用途或生產環境
 * • 禁止反編譯、修改或建立衍生作品
 * • 禁止移除此版權聲明
 *
 * 📋 授權範圍：
 * • 僅限測試和評估使用
 * • 使用者須對軟體內容保密
 * • 本授權可隨時撤銷
 *
 * 📞 聯絡資訊：frankie@hirefrankie.ai
 * 🌐 官方網站：https://hirefrankie.ai
 *
 * Copyright (c) 2025 HireFrankie.ai. All rights reserved.
 * =============================================================================
 *
 * 主入口文件 - 核心入口函數和選單設置
 * @OnlyCurrentDoc
 *
 * 必要权限：
 * - https://www.googleapis.com/auth/script.external_request
 * - https://www.googleapis.com/auth/gmail.send
 * - 電子表格權限由 @OnlyCurrentDoc 自動提供 (容器綁定腳本)
 */

/**
 * 當 Google Sheets 開啟時，建立自訂選單
 * 設置 Auto Lead Warmer 的主選單和子選單項目
 *
 * @function onOpen
 * @description 初始化插件的用戶介面選單，包含主要功能和調試工具
 * @returns {void}
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  // Get current language for language switcher display
  const currentLang = LocalizationService.getCurrentLanguage();
  const languageDisplayName = LocalizationService.getLanguageDisplayName(currentLang);

  // Menu labels remain in English
  // Note: Credit balance shows "?" in menu due to onOpen() permission limits
  // Click the menu item to see actual credit balance
  ui.createMenu('Auto Lead Warmer')
    .addItem('⚙️ Initial Setup & Format', 'setupHeadersAndFormat')
    .addItem('🚀 Run', 'runAutoLeadWarmer')
    .addItem('📧 Send Now', 'sendNowFromMenu')
    .addItem('👀 Check Opens & Replies', 'checkOpenAndReplies')
    .addSeparator()
    .addItem('🌐 Mail Language: ' + languageDisplayName, 'toggleLanguageMenu')
    .addItem('💳 My Credits', 'showCreditsInfo')
    .addToUi();
}

// 全局函數已拆分到各個專門的服務文件中
// 這裡只保留必要的全局函數包裝器，以維持向後兼容性

/**
 * 初始設置和格式化 - 組合函數
 * 執行表頭設置並格式化所有行
 *
 * @function setupHeadersAndFormat
 * @description 結合初始設置和格式化功能，簡化用戶操作
 * @returns {void}
 */
async function setupHeadersAndFormat() {
  try {
    // 先執行表頭設置
    await SheetService.setupHeaders();

    // 等待一下讓設置完成
    Utilities.sleep(1000);

    // 然後執行格式化
    SheetService.formatAllLeadRows();

    // 設置 User Info 工作表
    setupUserInfoSheet();

    // 初始化統計資料儀表板
    console.log('初始化統計資料儀表板...');
    const statsResult = AnalyticsService.updateSummaryStatistics();
    if (statsResult.success) {
      console.log('統計資料儀表板初始化成功');
    } else {
      console.error('統計資料儀表板初始化失敗:', statsResult.error);
    }

    // 使用非阻塞toast通知顯示初始設置完成
    ToastService.showSuccess('Setup done! Headers set, format done, dashboard init done', 4);

  } catch (error) {
    console.error('初始設置和格式化失敗:', error);
    SpreadsheetApp.getUi().alert('❌ Setup fail', `Setup fail: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 當儲存格編輯時觸發的事件處理函數
 * 將編輯事件委派給 EditHandler 服務處理
 * 
 * @function onEdit
 * @description 處理 Google Sheets 的編輯事件，主要用於監聽狀態變更和觸發相關操作
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e - Google Sheets 編輯事件物件
 * @returns {void}
 */
function onEdit(e) {
  return EditHandler.onEdit(e);
}