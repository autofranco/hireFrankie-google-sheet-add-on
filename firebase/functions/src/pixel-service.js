/**
 * 像素追蹤服務 - Gmail 開信檢測
 *
 * 提供像素追蹤端點和開信記錄管理功能
 * 支援 1x1 透明像素圖片和 Firestore 數據存儲
 */

const {onRequest, onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/**
 * 像素追蹤端點 - 處理郵件中的追蹤像素請求
 *
 * 當收件者開啟包含追蹤像素的郵件時，瀏覽器會自動請求此端點
 * 記錄開信事件到 Firestore 並返回 1x1 透明 GIF 圖片
 *
 * @function pixelTracker
 * @async
 * @param {Object} req - HTTP 請求物件
 * @param {Object} req.query - URL 查詢參數
 * @param {string} req.query.id - Google Sheets ID
 * @param {number} req.query.row - 行索引
 * @param {string} req.query.type - 郵件類型 (mail1, mail2, mail3)
 * @param {string} [req.query.email] - 收件者郵件地址（選填）
 * @param {Object} res - HTTP 回應物件
 *
 * @returns {Buffer} 1x1 透明 GIF 圖片
 *
 * @example
 * // 郵件中的像素 HTML
 * <img src="https://your-project.cloudfunctions.net/pixelTracker?id=SHEET_ID&row=5&type=mail1"
 *      width="1" height="1" style="display:none;">
 *
 * // Firestore 記錄格式
 * {
 *   spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
 *   rowIndex: 5,
 *   emailType: "mail1",
 *   openedTime: Timestamp,
 *   processed: false,
 *   userAgent: "Mozilla/5.0...",
 *   ipAddress: "192.168.1.1"
 * }
 */
exports.pixelTracker = onRequest({
  region: 'asia-east1',
  memory: '256MiB',
  timeoutSeconds: 30
}, async (req, res) => {
  try {
    // 設定 CORS 和快取標頭
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // 處理 preflight 請求
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // 只接受 GET 請求
    if (req.method !== 'GET') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // 解析查詢參數
    const { id: spreadsheetId, row: rowIndex, type: emailType, email } = req.query;

    // 驗證必要參數
    if (!spreadsheetId || !rowIndex || !emailType) {
      console.error('像素追蹤參數不完整:', { spreadsheetId, rowIndex, emailType });
      // 即使參數錯誤也返回透明圖片，避免影響郵件顯示
      return sendTransparentGif(res);
    }

    // 記錄開信事件到 Firestore
    try {
      const openRecord = {
        spreadsheetId: spreadsheetId,
        rowIndex: parseInt(rowIndex),
        emailType: emailType,
        openedTime: admin.firestore.FieldValue.serverTimestamp(),
        processed: false,
        userAgent: req.get('User-Agent') || '',
        ipAddress: req.ip || '',
        referer: req.get('Referer') || ''
      };

      // 如果有提供收件者郵件，也記錄下來
      if (email) {
        openRecord.recipientEmail = email;
      }

      // 寫入 Firestore
      await admin.firestore()
        .collection('pixel_opens')
        .add(openRecord);

      console.log(`像素追蹤記錄成功: ${spreadsheetId} Row ${rowIndex} ${emailType}`);

    } catch (firestoreError) {
      console.error('Firestore 寫入錯誤:', firestoreError);
      // 即使記錄失敗也返回透明圖片，不影響用戶體驗
    }

    // 返回 1x1 透明 GIF
    return sendTransparentGif(res);

  } catch (error) {
    console.error('像素追蹤端點錯誤:', error);
    // 即使發生錯誤也返回透明圖片
    return sendTransparentGif(res);
  }
});

/**
 * 獲取像素開信記錄 - 供 Apps Script 查詢使用
 *
 * Apps Script 定期調用此 API 獲取指定 Google Sheets 的開信記錄
 * 支援標記記錄為已處理，避免重複處理
 *
 * @function getPixelOpens
 * @async
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.data - 請求數據
 * @param {string} request.data.spreadsheetId - Google Sheets ID
 * @param {boolean} [request.data.markAsProcessed=true] - 是否標記為已處理
 * @param {number} [request.data.limit=100] - 返回記錄數量限制
 *
 * @returns {Promise<Object>} 開信記錄查詢結果
 * @returns {Array<Object>} returns.opens - 開信記錄陣列
 * @returns {number} returns.opens[].rowIndex - 行索引
 * @returns {string} returns.opens[].emailType - 郵件類型
 * @returns {string} returns.opens[].openedTime - 開信時間
 * @returns {string} [returns.opens[].recipientEmail] - 收件者郵件
 * @returns {number} returns.totalCount - 總記錄數
 * @returns {boolean} returns.success - 查詢是否成功
 *
 * @throws {HttpsError} invalid-argument - 參數無效
 * @throws {HttpsError} internal - Firestore 操作錯誤
 *
 * @example
 * // 在 Apps Script 中調用
 * const getPixelOpens = firebase.functions().httpsCallable('getPixelOpens');
 * const result = await getPixelOpens({
 *   spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId()
 * });
 *
 * console.log('開信記錄:', result.data.opens);
 * console.log('總數:', result.data.totalCount);
 */
exports.getPixelOpens = onCall({
  region: 'asia-east1',
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request) => {
  try {
    const { spreadsheetId, markAsProcessed = true, limit = 100 } = request.data;

    // 驗證必要參數
    if (!spreadsheetId) {
      throw new HttpsError('invalid-argument', '請提供 spreadsheetId 參數');
    }

    console.log(`查詢像素開信記錄: ${spreadsheetId}`);

    // 查詢未處理的開信記錄
    // 注意：orderBy 需要複合索引，暫時移除以避免索引錯誤
    const query = admin.firestore()
      .collection('pixel_opens')
      .where('spreadsheetId', '==', spreadsheetId)
      .where('processed', '==', false)
      .limit(limit);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log(`沒有找到未處理的開信記錄: ${spreadsheetId}`);
      return {
        success: true,
        opens: [],
        totalCount: 0
      };
    }

    // 處理查詢結果
    const opens = [];
    const batch = admin.firestore().batch();

    snapshot.forEach(doc => {
      const data = doc.data();

      // 格式化開信記錄
      opens.push({
        recordId: doc.id,
        rowIndex: data.rowIndex,
        emailType: data.emailType,
        openedTime: data.openedTime ? data.openedTime.toDate().toISOString() : null,
        recipientEmail: data.recipientEmail || null,
        userAgent: data.userAgent || '',
        ipAddress: data.ipAddress || ''
      });

      // 如果需要標記為已處理
      if (markAsProcessed) {
        batch.update(doc.ref, {
          processed: true,
          processedTime: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    // 執行批次更新（如果需要）
    if (markAsProcessed && opens.length > 0) {
      await batch.commit();
      console.log(`已標記 ${opens.length} 個記錄為已處理`);
    }

    console.log(`查詢成功: 找到 ${opens.length} 個開信記錄`);

    return {
      success: true,
      opens: opens,
      totalCount: opens.length
    };

  } catch (error) {
    console.error('查詢像素開信記錄錯誤:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', '查詢開信記錄時發生錯誤，請稍後重試');
  }
});

/**
 * 發送 1x1 透明 GIF 圖片
 *
 * @function sendTransparentGif
 * @private
 * @param {Object} res - HTTP 回應物件
 */
function sendTransparentGif(res) {
  // 1x1 透明 GIF 的 Base64 編碼
  // 這是一個標準的最小透明 GIF 圖片
  const transparentGif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  res.set('Content-Type', 'image/gif');
  res.set('Content-Length', transparentGif.length.toString());
  res.status(200).send(transparentGif);
}

/**
 * 清理舊的像素開信記錄（可用於定期維護）
 *
 * @function cleanupOldPixelRecords
 * @async
 * @private
 * @param {number} daysToKeep - 保留天數，預設 30 天
 * @returns {Promise<number>} 清理的記錄數量
 */
async function cleanupOldPixelRecords(daysToKeep = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const query = admin.firestore()
      .collection('pixel_opens')
      .where('openedTime', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
      .limit(500); // 批次處理，避免一次刪除太多

    const snapshot = await query.get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`清理了 ${snapshot.docs.length} 個舊的像素記錄`);
    return snapshot.docs.length;

  } catch (error) {
    console.error('清理舊像素記錄錯誤:', error);
    return 0;
  }
}