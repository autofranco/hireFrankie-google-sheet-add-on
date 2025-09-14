/**
 * 主入口文件 - 核心入口函數和選單設置
 * @OnlyCurrentDoc
 * 
 * 必要权限：
 * - https://www.googleapis.com/auth/script.external_request
 * - https://www.googleapis.com/auth/gmail.send 
 * - https://www.googleapis.com/auth/spreadsheets
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
  
  ui.createMenu('Auto Lead Warmer')
    .addItem('⚙️ Initial Setup', 'setupHeaders')
    .addItem('🚀 Run', 'runAutoLeadWarmer')
    .addItem('📧 Send Now', 'sendNowFromMenu')
    .addItem('⏸️ Stop New Processing', 'stopNewProcessing')
    .addItem('🎨 Format All Rows', 'formatAllLeadRows')
    .addSeparator()
    .addSubMenu(ui.createMenu('🔧 Debug Tools')
      .addItem('🔗 Test API Connection', 'testAPIConnection')
      .addItem('🌐 Test Network', 'testNetworkConnection')
      .addSeparator()
      .addItem('📧 Test Global Email Check', 'testGlobalEmailCheckManually')
      .addItem('📬 Test Reply Detection', 'testReplyDetectionManually')
      .addItem('Show Trigger Stats', 'showTriggerStats')
      .addItem('🗑️ Delete All Triggers', 'deleteAllTriggersMenu'))
    .addToUi();
}

// 全局函數已拆分到各個專門的服務文件中
// 這裡只保留必要的全局函數包裝器，以維持向後兼容性

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