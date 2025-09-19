const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {GoogleSpreadsheet} = require('google-spreadsheet');
const {JWT} = require('google-auth-library');

/**
 * 創建或更新用戶資料
 * 
 * 當用戶首次登入或需要更新資料時調用。自動收集用戶的 Gmail 地址，
 * 並設定初始付費狀態為 unpaid。如果用戶已存在則更新最後登入時間。
 * 
 * @function createUser
 * @async
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.auth - Firebase Auth 認證資訊
 * @param {string} request.auth.uid - 用戶唯一識別碼
 * @param {Object} request.data - 請求數據
 * @param {string} [request.data.displayName] - 用戶顯示名稱（選填）
 * 
 * @returns {Promise<Object>} 用戶創建結果
 * @returns {boolean} returns.isNewUser - 是否為新用戶
 * @returns {string} returns.email - 用戶 Gmail 地址
 * @returns {string} returns.paymentStatus - 付費狀態 ('paid' | 'unpaid')
 * @returns {Object} returns.usage - Token 使用量統計
 * 
 * @throws {HttpsError} unauthenticated - 用戶未登入
 * @throws {HttpsError} invalid-argument - 用戶 email 不存在
 * @throws {HttpsError} internal - Firestore 操作錯誤
 * 
 * @example
 * // 在 Apps Script 中調用
 * const createUser = firebase.functions().httpsCallable('createUser');
 * const result = await createUser({
 *   displayName: "Franco Hamada"
 * });
 * console.log('用戶狀態:', result.data.paymentStatus);
 * console.log('是否新用戶:', result.data.isNewUser);
 */
exports.createUser = onCall(async (request) => {
  try {
    // 1. 從 Apps Script 獲取用戶 email
    const email = request.data.email;

    if (!email) {
      throw new HttpsError('invalid-argument', '請提供用戶 email 地址');
    }

    console.log(`Apps Script 用戶: ${email}`);

    // 2. 檢查用戶是否已存在於 Google Sheets
    const users = await readUsersFromSheet();
    const existingUser = users.find(u => u.email === email.toLowerCase());

    if (existingUser) {
      // 用戶已存在，回傳現有資料
      console.log(`用戶 ${email} 已存在於 Google Sheets`);
      return {
        isNewUser: false,
        email: existingUser.email,
        paymentStatus: existingUser.paymentStatus
      };
    } else {
      // 用戶不存在，創建新用戶
      const isPaidUser = await checkPaidUser(email);

      try {
        await updateUserPaymentStatusInSheet(
          email.toLowerCase(),
          isPaidUser ? 'paid' : 'unpaid',
          'Auto-Create'
        );
        console.log(`用戶 ${email} 已自動添加到 Google Sheets (${isPaidUser ? 'paid' : 'unpaid'})`);

        return {
          isNewUser: true,
          email: email.toLowerCase(),
          paymentStatus: isPaidUser ? 'paid' : 'unpaid'
        };
      } catch (sheetError) {
        console.error('添加用戶到 Google Sheets 失敗:', sheetError);
        // 不洩漏內部技術細節給前端
        throw new HttpsError('internal', '無法創建用戶資料，請稍後重試或聯繫管理員');
      }
    }

  } catch (error) {
    console.error('createUser 錯誤:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '創建用戶時發生錯誤，請稍後重試');
  }
});

/**
 * 獲取用戶資訊和使用統計
 * 
 * 返回用戶的基本資訊、付費狀態和 Token 使用量統計。
 * 只有用戶本人可以查詢自己的資訊。
 * 
 * @function getUserInfo
 * @async
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.auth - Firebase Auth 認證資訊
 * @param {string} request.auth.uid - 用戶唯一識別碼
 * 
 * @returns {Promise<Object>} 用戶資訊
 * @returns {string} returns.email - 用戶 Gmail 地址
 * @returns {string} returns.paymentStatus - 付費狀態 ('paid' | 'unpaid')
 * @returns {string} [returns.displayName] - 用戶顯示名稱
 * @returns {Object} returns.usage - Token 使用量統計
 * @returns {Object} returns.usage.currentMonth - 當月使用量
 * @returns {Object} returns.usage.currentMonth.sonar - Sonar 模型使用量
 * @returns {Object} returns.usage.currentMonth.sonarPro - Sonar Pro 模型使用量
 * @returns {string} returns.memberSince - 註冊時間
 * @returns {string} returns.lastLogin - 最後登入時間
 * 
 * @throws {HttpsError} unauthenticated - 用戶未登入
 * @throws {HttpsError} not-found - 用戶資料不存在
 * @throws {HttpsError} internal - Firestore 操作錯誤
 * 
 * @example
 * // 在 Apps Script 中調用
 * const getUserInfo = firebase.functions().httpsCallable('getUserInfo');
 * const result = await getUserInfo();
 * console.log('付費狀態:', result.data.paymentStatus);
 * console.log('本月 Sonar 使用:', result.data.usage.currentMonth.sonar.inputTokens);
 */
exports.getUserInfo = onCall(async (request) => {
  try {
    // 1. 從 Apps Script 獲取用戶 email
    const email = request.data.email;

    if (!email) {
      throw new HttpsError('invalid-argument', '請提供用戶 email 地址');
    }

    // 2. 從 Google Sheets 查詢用戶資料
    const users = await readUsersFromSheet();
    const userData = users.find(u => u.email === email.toLowerCase());

    if (!userData) {
      throw new HttpsError('not-found', '用戶資料不存在，請先完成註冊');
    }

    return {
      email: userData.email,
      paymentStatus: userData.paymentStatus,
      memberSince: userData.addedDate || null,
      updatedBy: userData.updatedBy || null
    };

  } catch (error) {
    console.error('getUserInfo 錯誤:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '查詢用戶資訊時發生錯誤，請稍後重試');
  }
});

/**
 * 更新用戶 Token 使用量
 * 
 * 當 AI API 調用完成後，自動增加用戶的 Token 使用量統計。
 * 使用原子性操作確保數據一致性。通常由其他 Cloud Functions 內部調用。
 * 
 * @function updateUserUsage
 * @async
 * @param {Object} request - Firebase Functions 請求物件
 * @param {Object} request.auth - Firebase Auth 認證資訊
 * @param {string} request.auth.uid - 用戶唯一識別碼
 * @param {Object} request.data - 請求數據
 * @param {string} request.data.model - AI 模型類型 ('sonar' | 'sonar-pro')
 * @param {number} request.data.inputTokens - 輸入 Token 數量
 * @param {number} request.data.outputTokens - 輸出 Token 數量
 * 
 * @returns {Promise<Object>} 更新結果
 * @returns {boolean} returns.success - 更新是否成功
 * @returns {Object} returns.newUsage - 更新後的使用量統計
 * 
 * @throws {HttpsError} unauthenticated - 用戶未登入
 * @throws {HttpsError} invalid-argument - 參數無效
 * @throws {HttpsError} not-found - 用戶資料不存在
 * @throws {HttpsError} internal - Firestore 操作錯誤
 * 
 * @example
 * // 通常由其他 Cloud Functions 內部調用
 * const updateUserUsage = firebase.functions().httpsCallable('updateUserUsage');
 * const result = await updateUserUsage({
 *   model: 'sonar-pro',
 *   inputTokens: 150,
 *   outputTokens: 300
 * });
 * console.log('使用量更新成功:', result.data.success);
 */
exports.updateUserUsage = onCall(async (request) => {
  try {
    // Token 使用量統計已移到 Apps Script 端的 TokenTracker 處理
    // 此函數暫時停用，直接返回成功
    console.log('updateUserUsage 被調用，但已停用（使用 Apps Script TokenTracker）');

    return {
      success: true,
      message: 'Token 統計已移到 Apps Script 端處理'
    };

  } catch (error) {
    console.error('updateUserUsage 錯誤:', error);
    throw new HttpsError('internal', '更新使用量時發生錯誤，請稍後重試');
  }
});

/**
 * 檢查是否為預設付費用戶
 * 
 * 檢查指定的 Email 是否在預設付費用戶清單中。
 * 這允許管理員預先設定某些用戶為付費狀態。
 * 
 * @function checkPrePaidUser
 * @async
 * @private
 * @param {string} email - 用戶 Email 地址
 * 
 * @returns {Promise<boolean>} 是否為預設付費用戶
 * 
 * @example
 * // 檢查用戶是否為預設付費用戶
 * const isPaid = await checkPrePaidUser('user@example.com');
 * console.log('是否為預設付費用戶:', isPaid);
 */
/**
 * === 用戶管理已簡化 ===
 * 
 * 管理員現在可以直接在 Google Sheets 中管理所有用戶的付費狀態
 * Google Sheets 格式：
 * - 欄位 A：Email
 * - 欄位 B：Payment Status (paid/unpaid)
 * - 欄位 C：Added Date
 * - 欄位 D：Updated By
 * 
 * 系統會自動從 Google Sheets 讀取用戶付費狀態
 */

/**
 * 檢查是否為付費用戶（內部函數）
 * 從開發方的 Google Sheets 中讀取付費用戶清單
 * 
 * @function checkPaidUser
 * @async
 * @private
 * @param {string} email - 用戶 Email
 * @returns {Promise<boolean>} 是否為付費用戶
 */
/**
 * 取得 Google Sheets 用戶管理實例
 * 
 * @function getUserManagementSheet
 * @async
 * @private
 * @returns {Promise<Object>} Google Sheets 物件和工作表
 */
async function getUserManagementSheet() {
  const sheetsConfig = process.env.PAID_USERS_SHEET_CONFIG;
  if (!sheetsConfig) {
    throw new Error('未設定 PAID_USERS_SHEET_CONFIG 環境變數');
  }

  const config = JSON.parse(sheetsConfig);
  const serviceAccountAuth = new JWT({
    email: config.client_email,
    key: config.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(config.sheet_id, serviceAccountAuth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByIndex[0];
  return { doc, sheet };
}

/**
 * 從 Google Sheets 讀取所有用戶資料
 * 
 * @function readUsersFromSheet
 * @async
 * @private
 * @returns {Promise<Array<{email: string, paymentStatus: string, addedDate: string, updatedBy: string}>>} 所有用戶資料
 */
async function readUsersFromSheet() {
  try {
    const { sheet } = await getUserManagementSheet();
    const rows = await sheet.getRows();
    
    return rows.map(row => ({
      email: row._rawData[0]?.toLowerCase() || '',
      paymentStatus: row._rawData[1]?.toLowerCase() || 'unpaid',
      addedDate: row._rawData[2] || '',
      updatedBy: row._rawData[3] || ''
    })).filter(user => user.email);
    
  } catch (error) {
    console.error('讀取 Google Sheets 用戶資料錯誤:', error);
    return [];
  }
}

/**
 * 向 Google Sheets 寫入所有用戶資料
 * 
 * @function writeUsersToSheet
 * @async
 * @private
 * @param {Array<{email: string, paymentStatus: string, updatedBy: string}>} users - 用戶資料陣列
 */
async function writeUsersToSheet(users) {
  const { sheet } = await getUserManagementSheet();
  
  // 清空現有資料
  await sheet.clear();
  
  // 設定標題行
  await sheet.setHeaderRow(['Email', 'Payment Status', 'Added Date', 'Updated By']);
  
  // 添加用戶資料
  const rows = users.map(user => ({
    Email: user.email,
    'Payment Status': user.paymentStatus,
    'Added Date': user.addedDate || new Date().toISOString(),
    'Updated By': user.updatedBy || 'Firebase Functions'
  }));
  
  if (rows.length > 0) {
    await sheet.addRows(rows);
  }
}

/**
 * 在 Google Sheets 中更新用戶的付費狀態
 * 
 * @function updateUserPaymentStatusInSheet
 * @async
 * @private
 * @param {string} email - 用戶 Email
 * @param {string} paymentStatus - 付費狀態 ('paid' | 'unpaid')
 * @param {string} updatedBy - 更新者
 */
async function updateUserPaymentStatusInSheet(email, paymentStatus, updatedBy) {
  const users = await readUsersFromSheet();
  const lowerEmail = email.toLowerCase();
  
  // 尋找現有用戶
  const existingUserIndex = users.findIndex(user => user.email === lowerEmail);
  
  if (existingUserIndex >= 0) {
    // 更新現有用戶
    users[existingUserIndex].paymentStatus = paymentStatus;
    users[existingUserIndex].updatedBy = updatedBy;
  } else {
    // 添加新用戶
    users.push({
      email: lowerEmail,
      paymentStatus: paymentStatus,
      addedDate: new Date().toISOString(),
      updatedBy: updatedBy
    });
  }
  
  // 寫回 Google Sheets
  await writeUsersToSheet(users);
  return users;
}

async function checkPaidUser(email) {
  try {
    // 從 Google Sheets 讀取所有用戶資料
    const users = await readUsersFromSheet();
    const lowerEmail = email.toLowerCase();
    
    // 尋找用戶並檢查付費狀態
    const user = users.find(u => u.email === lowerEmail);
    
    if (user) {
      return user.paymentStatus === 'paid';
    }
    
    // 如果用戶不存在於 Google Sheets 中，預設為未付費
    return false;
    
  } catch (error) {
    console.error('從 Google Sheets 檢查付費用戶錯誤:', error);
    // 如果 Google Sheets 讀取失敗，回退到 Firestore
    try {
      const paidUsersDoc = await admin.firestore()
        .collection('settings')
        .doc('paidUsers')
        .get();
      
      if (paidUsersDoc.exists) {
        const paidData = paidUsersDoc.data();
        const paidEmails = paidData.emails || [];
        return paidEmails.includes(email.toLowerCase());
      }
    } catch (firestoreError) {
      console.error('Firestore 回退檢查也失敗:', firestoreError);
    }
    
    return false;
  }
}