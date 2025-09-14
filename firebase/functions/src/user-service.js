const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

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
    // 1. 驗證用戶認證
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '需要登入才能創建用戶資料');
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email;

    if (!email) {
      throw new HttpsError('invalid-argument', '無法獲取用戶 email 地址');
    }

    // 2. 檢查用戶是否已存在
    const userRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    if (userDoc.exists) {
      // 更新現有用戶的最後登入時間
      await userRef.update({
        lastLoginAt: now,
        ...(request.data.displayName && { displayName: request.data.displayName })
      });
      
      const userData = userDoc.data();
      return {
        isNewUser: false,
        email: userData.email,
        paymentStatus: userData.paymentStatus,
        usage: userData.usage
      };
    } else {
      // 創建新用戶資料
      const userData = {
        email: email,
        paymentStatus: 'unpaid',
        createdAt: now,
        lastLoginAt: now,
        usage: {
          currentMonth: {
            sonar: {
              inputTokens: 0,
              outputTokens: 0
            },
            sonarPro: {
              inputTokens: 0,
              outputTokens: 0
            }
          },
          lastUpdated: now
        },
        ...(request.data.displayName && { displayName: request.data.displayName })
      };

      await userRef.set(userData);

      return {
        isNewUser: true,
        email: userData.email,
        paymentStatus: userData.paymentStatus,
        usage: userData.usage
      };
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
    // 1. 驗證用戶認證
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '需要登入才能查詢用戶資訊');
    }

    // 2. 查詢用戶資料
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', '用戶資料不存在，請先完成註冊');
    }

    const userData = userDoc.data();

    return {
      email: userData.email,
      paymentStatus: userData.paymentStatus,
      ...(userData.displayName && { displayName: userData.displayName }),
      usage: userData.usage,
      memberSince: userData.createdAt?.toDate().toISOString() || null,
      lastLogin: userData.lastLoginAt?.toDate().toISOString() || null
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
    // 1. 驗證用戶認證
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '需要登入才能更新使用量');
    }

    // 2. 驗證請求數據
    const { model, inputTokens, outputTokens } = request.data;
    
    if (!model || !['sonar', 'sonar-pro'].includes(model)) {
      throw new HttpsError('invalid-argument', '模型類型必須是 sonar 或 sonar-pro');
    }

    if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
      throw new HttpsError('invalid-argument', 'Token 數量必須是數字');
    }

    if (inputTokens < 0 || outputTokens < 0) {
      throw new HttpsError('invalid-argument', 'Token 數量不能為負數');
    }

    // 3. 更新用戶使用量
    const userRef = admin.firestore().collection('users').doc(request.auth.uid);
    const modelKey = model === 'sonar-pro' ? 'sonarPro' : 'sonar';

    await userRef.update({
      [`usage.currentMonth.${modelKey}.inputTokens`]: admin.firestore.FieldValue.increment(inputTokens),
      [`usage.currentMonth.${modelKey}.outputTokens`]: admin.firestore.FieldValue.increment(outputTokens),
      'usage.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
    });

    // 4. 獲取更新後的資料
    const updatedDoc = await userRef.get();
    if (!updatedDoc.exists) {
      throw new HttpsError('not-found', '用戶資料不存在');
    }

    return {
      success: true,
      newUsage: updatedDoc.data().usage
    };

  } catch (error) {
    console.error('updateUserUsage 錯誤:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', '更新使用量時發生錯誤，請稍後重試');
  }
});