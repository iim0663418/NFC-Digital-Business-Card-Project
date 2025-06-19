const express = require('express');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises;
const { User } = require('../config/database');
const router = express.Router();

// 生成單個使用者的 HTML 名片
router.get('/generate/:employee_id', async (req, res) => {
  try {
    const user = await User.findByEmployeeId(req.params.employee_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // 讀取 HTML 模板
    const templatePath = path.join(__dirname, '../templates/business-card.ejs');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    
    // 渲染 HTML
    const html = ejs.render(templateContent, {
      user: user,
      baseUrl: process.env.GITHUB_REPO_URL || '',
      generatedAt: new Date().toISOString()
    });
    
    res.set('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('Error generating HTML template:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate HTML template'
    });
  }
});

// 生成單個使用者的 vCard 檔案
router.get('/vcard/:employee_id', async (req, res) => {
  try {
    const user = await User.findByEmployeeId(req.params.employee_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // 生成 vCard 內容
    const vcard = generateVCard(user);
    
    res.set({
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${user.full_name}.vcf"`
    });
    res.send(vcard);
    
  } catch (error) {
    console.error('Error generating vCard:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate vCard'
    });
  }
});

// 預覽名片 HTML
router.get('/preview/:employee_id', async (req, res) => {
  try {
    const user = await User.findByEmployeeId(req.params.employee_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }
    
    // 讀取預覽模板
    const templatePath = path.join(__dirname, '../templates/preview.ejs');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    
    // 渲染預覽頁面
    const html = ejs.render(templateContent, {
      user: user,
      baseUrl: process.env.GITHUB_REPO_URL || 'http://localhost:3000',
      isPreview: true
    });
    
    res.set('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate preview'
    });
  }
});

// 批次生成所有使用者的檔案
router.post('/generate-all', async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['created_at', 'DESC']]
    });
    
    if (users.length === 0) {
      return res.json({
        message: 'No users found',
        generated: 0
      });
    }
    
    const results = [];
    const errors = [];
    
    // 為每個使用者生成檔案
    for (const user of users) {
      try {
        // 生成 HTML
        const html = await generateBusinessCardHTML(user);
        
        // 生成 vCard
        const vcard = generateVCard(user);
        
        results.push({
          employee_id: user.employee_id,
          full_name: user.full_name,
          files: {
            html: `${user.employee_id}/index.html`,
            vcard: `${user.employee_id}/contact.vcf`
          },
          status: 'success'
        });
        
      } catch (error) {
        console.error(`Error generating files for ${user.employee_id}:`, error);
        errors.push({
          employee_id: user.employee_id,
          full_name: user.full_name,
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Batch generation completed',
      total_users: users.length,
      generated: results.length,
      failed: errors.length,
      results: results,
      errors: errors
    });
    
  } catch (error) {
    console.error('Error in batch generation:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate files for all users'
    });
  }
});

// 輔助函數：生成 vCard 內容
function generateVCard(user) {
  const photoUrl = user.photo_url ? 
    `${process.env.GITHUB_REPO_URL}/assets/${path.basename(user.photo_url)}` : 
    '';
  
  const vcard = `BEGIN:VCARD
VERSION:3.0
PRODID:-//Digital Business Cards//Management System//EN
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

// 輔助函數：生成名片 HTML
async function generateBusinessCardHTML(user) {
  const templatePath = path.join(__dirname, '../templates/business-card.ejs');
  const templateContent = await fs.readFile(templatePath, 'utf8');
  
  return ejs.render(templateContent, {
    user: user,
    baseUrl: process.env.GITHUB_REPO_URL || '',
    generatedAt: new Date().toISOString()
  });
}

module.exports = router;