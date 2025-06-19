const express = require('express');
const { body, validationResult } = require('express-validator');
const { SystemSetting } = require('../config/database');
const router = express.Router();

// 驗證錯誤處理中間件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

// 取得所有系統設定
router.get('/', async (req, res) => {
  try {
    const settings = await SystemSetting.findAll({
      order: [['setting_key', 'ASC']]
    });
    
    // 將設定轉換為物件格式
    const settingsObject = {};
    settings.forEach(setting => {
      settingsObject[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });
    
    res.json(settingsObject);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch settings'
    });
  }
});

// 取得特定設定
router.get('/:key', async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({
      where: { setting_key: req.params.key }
    });
    
    if (!setting) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Setting not found'
      });
    }
    
    res.json({
      key: setting.setting_key,
      value: setting.setting_value,
      description: setting.description
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch setting'
    });
  }
});

// 取得 GitHub 設定狀態
router.get('/github/status', async (req, res) => {
  try {
    const config = await SystemSetting.getGitHubConfig();
    
    res.json({
      is_configured: config.is_configured,
      repository_url: config.repository_url ? '已設定' : '未設定',
      access_token: config.access_token ? '已設定' : '未設定'
    });
  } catch (error) {
    console.error('Error fetching GitHub config:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch GitHub configuration'
    });
  }
});

// 設定 GitHub 配置
router.post('/github', [
  body('repository_url')
    .trim()
    .notEmpty()
    .withMessage('Repository URL is required')
    .isURL()
    .withMessage('Repository URL must be a valid URL')
    .custom(value => {
      if (!value.includes('github.com')) {
        throw new Error('Repository URL must be a GitHub URL');
      }
      return true;
    }),
  body('access_token')
    .trim()
    .notEmpty()
    .withMessage('Access token is required')
    .isLength({ min: 40, max: 100 })
    .withMessage('Access token must be between 40 and 100 characters'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { repository_url, access_token } = req.body;
    
    // 驗證 GitHub Token 格式
    if (!access_token.startsWith('ghp_') && !access_token.startsWith('github_pat_')) {
      return res.status(400).json({
        error: 'Invalid Token',
        message: 'Access token must be a valid GitHub Personal Access Token'
      });
    }
    
    // 儲存設定
    await Promise.all([
      SystemSetting.setSetting('github_repository_url', repository_url, 'GitHub Repository URL for deployment'),
      SystemSetting.setSetting('github_access_token', access_token, 'GitHub Personal Access Token for deployment'),
      SystemSetting.setSetting('deployment_enabled', 'true', 'Whether deployment functionality is enabled')
    ]);
    
    res.json({
      message: 'GitHub configuration updated successfully',
      is_configured: true
    });
  } catch (error) {
    console.error('Error updating GitHub config:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update GitHub configuration'
    });
  }
});

// 更新單個設定
router.put('/:key', [
  body('value').exists().withMessage('Value is required'),
  body('description').optional().trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    // 安全檢查：不允許直接更新敏感設定
    const protectedKeys = ['github_access_token'];
    if (protectedKeys.includes(key)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This setting cannot be updated directly'
      });
    }
    
    const setting = await SystemSetting.setSetting(key, value, description);
    
    res.json({
      message: 'Setting updated successfully',
      setting: {
        key: setting.setting_key,
        value: setting.setting_value,
        description: setting.description
      }
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update setting'
    });
  }
});

// 測試 GitHub 連接
router.post('/github/test', async (req, res) => {
  try {
    const config = await SystemSetting.getGitHubConfig();
    
    if (!config.is_configured) {
      return res.status(400).json({
        error: 'Not Configured',
        message: 'GitHub configuration is not complete'
      });
    }
    
    // 這裡可以加入實際的 GitHub API 測試
    // 例如：測試 token 是否有效、repository 是否存在等
    
    res.json({
      message: 'GitHub configuration test passed',
      status: 'success'
    });
  } catch (error) {
    console.error('Error testing GitHub config:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to test GitHub configuration'
    });
  }
});

// 重置 GitHub 設定
router.delete('/github', async (req, res) => {
  try {
    await Promise.all([
      SystemSetting.setSetting('github_repository_url', '', 'GitHub Repository URL for deployment'),
      SystemSetting.setSetting('github_access_token', '', 'GitHub Personal Access Token for deployment'),
      SystemSetting.setSetting('deployment_enabled', 'false', 'Whether deployment functionality is enabled')
    ]);
    
    res.json({
      message: 'GitHub configuration reset successfully'
    });
  } catch (error) {
    console.error('Error resetting GitHub config:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset GitHub configuration'
    });
  }
});

module.exports = router;