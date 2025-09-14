/**
 * 測試環境設定
 */

const sinon = require('sinon');

// 設定測試環境變數
process.env.NODE_ENV = 'test';
process.env.GCLOUD_PROJECT = 'demo-test';

// 全域測試 hooks
beforeEach(function() {
  sinon.restore();
});

afterEach(function() {
  sinon.restore();
});

// 測試結束後清理
after(function() {
  // 清理模組快取
  Object.keys(require.cache).forEach(key => {
    if (key.includes('/src/') || key.includes('/index.js')) {
      delete require.cache[key];
    }
  });
});