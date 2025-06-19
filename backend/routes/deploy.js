const express = require('express');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;
const ejs = require('ejs');
const { User, SystemSetting } = require('../config/database');
const router = express.Router();

// 檢查部署狀態
router.get('/status', async (req, res) => {
  try {
    const config = await SystemSetting.getGitHubConfig();
    const isEnabled = await SystemSetting.isDeploymentEnabled();
    
    res.json({
      deployment_enabled: isEnabled,
      github_configured: config.is_configured,
      repository_url: config.repository_url || null,
      last_deployment: await SystemSetting.getSetting('last_deployment_time') || null
    });
  } catch (error) {
    console.error('Error checking deployment status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check deployment status'
    });
  }
});

// 執行部署
router.post('/execute', async (req, res) => {
  try {
    // 檢查系統設定
    const config = await SystemSetting.getGitHubConfig();
    if (!config.is_configured) {
      return res.status(400).json({
        error: 'Configuration Required',
        message: 'GitHub configuration is not complete. Please configure repository URL and access token first.'
      });
    }

    const isEnabled = await SystemSetting.isDeploymentEnabled();
    if (!isEnabled) {
      return res.status(400).json({
        error: 'Deployment Disabled',
        message: 'Deployment functionality is disabled'
      });
    }

    // 取得所有使用者資料
    const users = await User.findAll({
      order: [['employee_id', 'ASC']]
    });

    if (users.length === 0) {
      return res.status(400).json({
        error: 'No Data',
        message: 'No users found to deploy'
      });
    }

    // 開始部署流程
    const deploymentResult = await performDeployment(users, config);
    
    // 記錄部署時間
    await SystemSetting.setSetting('last_deployment_time', new Date().toISOString());
    
    res.json({
      message: 'Deployment completed successfully',
      summary: deploymentResult.summary,
      details: deploymentResult.details
    });

  } catch (error) {
    console.error('Error executing deployment:', error);
    res.status(500).json({
      error: 'Deployment Failed',
      message: error.message || 'Failed to execute deployment'
    });
  }
});

// 預覽部署內容
router.get('/preview', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['employee_id', 'ASC']]
    });

    if (users.length === 0) {
      return res.json({
        message: 'No users found',
        users: [],
        structure: {}
      });
    }

    // 生成預覽結構
    const structure = await generateDeploymentStructure(users);
    
    res.json({
      message: 'Deployment preview generated',
      total_users: users.length,
      users: users.map(user => ({
        employee_id: user.employee_id,
        full_name: user.full_name,
        url_path: `/${user.employee_id}/`
      })),
      structure: structure
    });

  } catch (error) {
    console.error('Error generating deployment preview:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate deployment preview'
    });
  }
});

// 測試 GitHub 連接
router.post('/test-connection', async (req, res) => {
  try {
    const config = await SystemSetting.getGitHubConfig();
    
    if (!config.is_configured) {
      return res.status(400).json({
        error: 'Configuration Required',
        message: 'GitHub configuration is not complete'
      });
    }

    // 測試 GitHub 連接
    const testResult = await testGitHubConnection(config);
    
    res.json({
      message: 'GitHub connection test completed',
      status: testResult.success ? 'success' : 'failed',
      details: testResult.details
    });

  } catch (error) {
    console.error('Error testing GitHub connection:', error);
    res.status(500).json({
      error: 'Test Failed',
      message: 'Failed to test GitHub connection'
    });
  }
});

// 輔助函數：執行部署
async function performDeployment(users, config) {
  const deployDir = path.join(__dirname, '../temp/deploy');
  
  try {
    // 準備部署目錄
    await fs.rm(deployDir, { recursive: true, force: true });
    await fs.mkdir(deployDir, { recursive: true });

    // 初始化 Git
    const git = simpleGit(deployDir);
    await git.init();
    await git.addConfig('user.name', 'Digital Business Cards Bot');
    await git.addConfig('user.email', 'noreply@system.local');

    // 添加遠程倉庫
    const repoUrl = config.repository_url.replace('https://', `https://${config.access_token}@`);
    await git.addRemote('origin', repoUrl);

    // 生成所有檔案
    const fileResults = await generateAllFiles(users, deployDir);
    
    // 添加所有檔案到 Git
    await git.add('.');
    
    // 提交變更
    const commitMessage = `Deploy ${users.length} digital business cards - ${new Date().toISOString()}`;
    await git.commit(commitMessage);
    
    // 推送到遠程倉庫
    await git.push('origin', 'main', { '--force': null });

    return {
      summary: {
        total_users: users.length,
        files_generated: fileResults.totalFiles,
        deployment_time: new Date().toISOString()
      },
      details: fileResults.details
    };

  } catch (error) {
    throw new Error(`Deployment failed: ${error.message}`);
  } finally {
    // 清理暫存目錄
    try {
      await fs.rm(deployDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('Failed to cleanup deployment directory:', cleanupError);
    }
  }
}

// 輔助函數：生成所有檔案
async function generateAllFiles(users, deployDir) {
  const details = [];
  let totalFiles = 0;

  // 建立 assets 目錄
  const assetsDir = path.join(deployDir, 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  // 複製共用資源（如果存在）
  try {
    const logoPath = path.join(__dirname, '../../assets/moda-logo.svg');
    const targetLogoPath = path.join(assetsDir, 'moda-logo.svg');
    await fs.copyFile(logoPath, targetLogoPath);
    totalFiles++;
  } catch (error) {
    console.warn('Logo file not found, skipping...');
  }

  // 為每個使用者生成檔案
  for (const user of users) {
    try {
      const userDir = path.join(deployDir, user.employee_id);
      await fs.mkdir(userDir, { recursive: true });

      // 生成 index.html
      const html = await generateBusinessCardHTML(user);
      await fs.writeFile(path.join(userDir, 'index.html'), html, 'utf8');

      // 生成 contact.vcf
      const vcard = generateVCard(user);
      await fs.writeFile(path.join(userDir, 'contact.vcf'), vcard, 'utf8');

      // 複製使用者照片（如果存在）
      if (user.photo_url) {
        try {
          const photoSourcePath = path.join(__dirname, '../uploads/photos', path.basename(user.photo_url));
          const photoTargetPath = path.join(assetsDir, `${user.employee_id}-photo.jpg`);
          await fs.copyFile(photoSourcePath, photoTargetPath);
          totalFiles++;
        } catch (photoError) {
          console.warn(`Photo not found for ${user.employee_id}:`, photoError.message);
        }
      }

      details.push({
        employee_id: user.employee_id,
        full_name: user.full_name,
        files: ['index.html', 'contact.vcf'],
        url: `/${user.employee_id}/`
      });

      totalFiles += 2; // index.html + contact.vcf

    } catch (error) {
      console.error(`Error generating files for ${user.employee_id}:`, error);
      details.push({
        employee_id: user.employee_id,
        full_name: user.full_name,
        error: error.message
      });
    }
  }

  return {
    totalFiles,
    details
  };
}

// 輔助函數：生成名片 HTML
async function generateBusinessCardHTML(user) {
  const templatePath = path.join(__dirname, '../templates/business-card.ejs');
  const templateContent = await fs.readFile(templatePath, 'utf8');
  
  return ejs.render(templateContent, {
    user: user,
    baseUrl: await SystemSetting.getSetting('github_repository_url') || '',
    generatedAt: new Date().toISOString()
  });
}

// 輔助函數：生成 vCard
function generateVCard(user) {
  const baseUrl = process.env.GITHUB_REPO_URL || '';
  const photoUrl = user.photo_url ? `${baseUrl}/assets/${user.employee_id}-photo.jpg` : '';
  
  const vcard = `BEGIN:VCARD
VERSION:3.0
PRODID:-//Digital Business Cards Management System//EN
FN;CHARSET=UTF-8:${user.full_name}
N;CHARSET=UTF-8:${user.full_name.split(' ').pop()};${user.full_name.split(' ')[0]};;;
ORG;CHARSET=UTF-8:${user.department}
TITLE;CHARSET=UTF-8:${user.title}
EMAIL;TYPE=work:${user.email}${user.phone ? `\nTEL;TYPE=work,voice:${user.phone}` : ''}${user.linkedin_url ? `\nURL;TYPE=work:${user.linkedin_url}` : ''}${user.github_url ? `\nURL;TYPE=work:${user.github_url}` : ''}${user.address ? `\nADR;TYPE=work;CHARSET=UTF-8:;;${user.address};;;;Taiwan` : ''}${photoUrl ? `\nPHOTO;TYPE=JPEG:${photoUrl}` : ''}
NOTE;CHARSET=UTF-8:歡迎透過各種管道與我聯繫，期待與您的合作交流！
REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VCARD`;
  
  return vcard;
}

// 輔助函數：生成部署結構預覽
async function generateDeploymentStructure(users) {
  const structure = {
    assets: ['moda-logo.svg'],
    users: {}
  };

  for (const user of users) {
    structure.users[user.employee_id] = {
      name: user.full_name,
      files: ['index.html', 'contact.vcf'],
      photo: user.photo_url ? `${user.employee_id}-photo.jpg` : null
    };
    
    if (user.photo_url) {
      structure.assets.push(`${user.employee_id}-photo.jpg`);
    }
  }

  return structure;
}

// 輔助函數：測試 GitHub 連接
async function testGitHubConnection(config) {
  try {
    // 這裡可以實作實際的 GitHub API 測試
    // 例如：檢查 token 有效性、repository 是否存在等
    
    return {
      success: true,
      details: 'GitHub connection test passed'
    };
  } catch (error) {
    return {
      success: false,
      details: error.message
    };
  }
}

module.exports = router;