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
 * 当 Google Sheets 开启时，建立自订选单
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
 * 當儲存格編輯時觸發 - 由 EditHandler 處理
 */
function onEdit(e) {
  return EditHandler.onEdit(e);
}