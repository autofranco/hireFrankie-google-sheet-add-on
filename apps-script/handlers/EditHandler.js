/**
 * 編輯處理器 - 處理工作表編輯事件
 */

const EditHandler = {
  
  /**
   * 處理工作表編輯事件
   */
  onEdit(e) {
    try {
      // 首先驗證字符限制（適用於所有工作表和欄位）
      SheetService.validateCellCharacterLimit(e);

      const sheet = e.source.getActiveSheet();
      const range = e.range;

      // 只處理主要工作表的其他邏輯
      if (!this.isMainSheet(sheet)) {
        return;
      }

      // 只處理資料行（非表頭）
      if (!this.isDataRow(range)) {
        return;
      }

      const rowIndex = range.getRow();
      const col = range.getColumn();

      // 處理狀態欄位變更
      if (this.isStatusColumn(col)) {
        this.handleStatusChange(sheet, rowIndex, e.value);
      }

      // Send Now 現在透過選單處理，不依賴 onEdit 觸發器

    } catch (error) {
      console.error('onEdit 觸發錯誤:', error);
    }
  },

  /**
   * 檢查是否為主要工作表
   */
  isMainSheet(sheet) {
    return sheet.getName() === SHEET_NAME;
  },

  /**
   * 檢查是否為資料行（非表頭）
   */
  isDataRow(range) {
    return range.getRow() > 1;
  },

  /**
   * 檢查是否為狀態欄位
   */
  isStatusColumn(col) {
    return col === COLUMNS.STATUS + 1;
  },

  /**
   * 處理狀態變更
   */
  handleStatusChange(sheet, rowIndex, newValue) {
    // 當狀態欄位被修改時，更新 Send Now 按鈕
    SheetService.setupSendNowButton(sheet, rowIndex);
    
    // 處理狀態改為 Done 的情況（手動停止）
    if (newValue === 'Done') {
      SheetService.updateInfo(sheet, rowIndex, 'Stopped by you');
      console.log(`第 ${rowIndex} 行狀態手動更改為 Done`);
    }
    
    console.log(`第 ${rowIndex} 行狀態更改為: ${newValue}`);
  }
};

// 全局函數包裝器
function onEdit(e) {
  return EditHandler.onEdit(e);
}