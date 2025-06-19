const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const xlsx = require('node-xlsx');
const { body, validationResult } = require('express-validator');
const { User } = require('../config/database');
const router = express.Router();

// 設定檔案上傳
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/import');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.oasis.opendocument.spreadsheet', // .ods
    'text/csv' // .csv
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel (.xlsx, .xls), ODS (.ods) and CSV files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 限制
    files: 1
  }
});

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

// 下載匯入範本
router.get('/template', async (req, res) => {
  try {
    const templateData = [
      [
        'employee_id',
        'full_name', 
        'title',
        'department',
        'unit',
        'email',
        'phone',
        'address',
        'linkedin_url',
        'github_url'
      ],
      [
        'E001',
        '張三',
        '工程師',
        '資訊部',
        '系統開發組',
        'zhang.san@company.com',
        '+886-2-1234-5678',
        '台北市信義區信義路五段7號',
        'https://www.linkedin.com/in/zhang-san',
        'https://github.com/zhang-san'
      ],
      [
        'E002',
        '李四',
        '專案經理',
        '專案部',
        '專案管理組',
        'li.si@company.com',
        '+886-2-1234-5679',
        '台北市大安區敦化南路一段100號',
        '',
        ''
      ]
    ];

    // 生成 Excel 檔案
    const buffer = xlsx.build([{
      name: 'Users',
      data: templateData,
      options: {
        '!cols': [
          { wch: 12 }, // employee_id
          { wch: 15 }, // full_name
          { wch: 12 }, // title
          { wch: 12 }, // department
          { wch: 12 }, // unit
          { wch: 25 }, // email
          { wch: 18 }, // phone
          { wch: 30 }, // address
          { wch: 35 }, // linkedin_url
          { wch: 35 }  // github_url
        ]
      }
    }]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="digital-business-cards-template.xlsx"');
    res.send(buffer);

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate template file'
    });
  }
});

// 批次匯入使用者資料
router.post('/users', upload.single('file'), [
  body('update_existing').optional().isBoolean().withMessage('Update existing must be boolean'),
  handleValidationErrors
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const updateExisting = req.body.update_existing === 'true';
    
    // 解析檔案
    let data;
    try {
      data = parseSpreadsheetFile(filePath, req.file.mimetype);
    } catch (parseError) {
      await fs.unlink(filePath); // 清理檔案
      return res.status(400).json({
        error: 'Parse Error',
        message: `Failed to parse file: ${parseError.message}`
      });
    }

    if (!data || data.length === 0) {
      await fs.unlink(filePath);
      return res.status(400).json({
        error: 'Invalid Data',
        message: 'File contains no data'
      });
    }

    // 驗證檔案格式
    const validationResult = validateImportData(data);
    if (!validationResult.isValid) {
      await fs.unlink(filePath);
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid file format',
        details: validationResult.errors
      });
    }

    // 處理資料
    const results = await processImportData(data, updateExisting);
    
    // 清理上傳的檔案
    await fs.unlink(filePath);

    res.json({
      message: 'Import completed',
      summary: {
        total_rows: data.length - 1, // 扣除標題行
        created: results.created.length,
        updated: results.updated.length,
        skipped: results.skipped.length,
        errors: results.errors.length
      },
      details: results
    });

  } catch (error) {
    console.error('Error importing users:', error);
    
    // 清理上傳的檔案
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to import users'
    });
  }
});

// 預覽匯入資料
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    
    // 解析檔案
    let data;
    try {
      data = parseSpreadsheetFile(filePath, req.file.mimetype);
    } catch (parseError) {
      await fs.unlink(filePath);
      return res.status(400).json({
        error: 'Parse Error',
        message: `Failed to parse file: ${parseError.message}`
      });
    }

    // 清理檔案
    await fs.unlink(filePath);

    if (!data || data.length === 0) {
      return res.status(400).json({
        error: 'Invalid Data',
        message: 'File contains no data'
      });
    }

    // 驗證資料格式
    const validationResult = validateImportData(data);
    
    // 預覽前10行資料
    const preview = data.slice(0, Math.min(11, data.length)); // 標題行 + 10行資料
    
    res.json({
      message: 'File preview generated',
      is_valid: validationResult.isValid,
      validation_errors: validationResult.errors,
      total_rows: data.length - 1, // 扣除標題行
      preview: preview,
      columns: data[0] || []
    });

  } catch (error) {
    console.error('Error previewing import file:', error);
    
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to preview import file'
    });
  }
});

// 輔助函數：解析試算表檔案
function parseSpreadsheetFile(filePath, mimeType) {
  try {
    const workbook = xlsx.parse(filePath);
    
    if (!workbook || workbook.length === 0) {
      throw new Error('No worksheets found');
    }
    
    // 使用第一個工作表
    const worksheet = workbook[0];
    return worksheet.data;
    
  } catch (error) {
    throw new Error(`Failed to parse spreadsheet: ${error.message}`);
  }
}

// 輔助函數：驗證匯入資料
function validateImportData(data) {
  const errors = [];
  
  if (data.length < 2) {
    errors.push('File must contain at least header row and one data row');
    return { isValid: false, errors };
  }
  
  const expectedColumns = [
    'employee_id', 'full_name', 'title', 'department', 
    'unit', 'email', 'phone', 'address', 'linkedin_url', 'github_url'
  ];
  
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  
  // 檢查必要欄位
  const requiredColumns = ['employee_id', 'full_name', 'title', 'department', 'unit', 'email'];
  for (const col of requiredColumns) {
    if (!headers.includes(col)) {
      errors.push(`Missing required column: ${col}`);
    }
  }
  
  // 檢查資料行
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowErrors = [];
    
    // 檢查員工編號
    if (!row[0] || String(row[0]).trim() === '') {
      rowErrors.push('employee_id is required');
    }
    
    // 檢查姓名
    if (!row[1] || String(row[1]).trim() === '') {
      rowErrors.push('full_name is required');
    }
    
    // 檢查電子郵件格式
    if (row[5]) {
      const email = String(row[5]).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        rowErrors.push('invalid email format');
      }
    }
    
    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// 輔助函數：處理匯入資料
async function processImportData(data, updateExisting = false) {
  const results = {
    created: [],
    updated: [],
    skipped: [],
    errors: []
  };
  
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    try {
      // 建立使用者物件
      const userData = {};
      headers.forEach((header, index) => {
        if (row[index] !== undefined && row[index] !== null) {
          userData[header] = String(row[index]).trim();
        }
      });
      
      // 檢查必要欄位
      if (!userData.employee_id || !userData.full_name || !userData.email) {
        results.errors.push({
          row: i + 1,
          error: 'Missing required fields',
          data: userData
        });
        continue;
      }
      
      // 檢查是否已存在
      const existingUser = await User.findByEmployeeId(userData.employee_id);
      
      if (existingUser) {
        if (updateExisting) {
          // 更新現有使用者
          await existingUser.update(userData);
          results.updated.push({
            row: i + 1,
            employee_id: userData.employee_id,
            full_name: userData.full_name
          });
        } else {
          // 跳過現有使用者
          results.skipped.push({
            row: i + 1,
            employee_id: userData.employee_id,
            full_name: userData.full_name,
            reason: 'User already exists'
          });
        }
      } else {
        // 建立新使用者
        const newUser = await User.create(userData);
        results.created.push({
          row: i + 1,
          employee_id: newUser.employee_id,
          full_name: newUser.full_name
        });
      }
      
    } catch (error) {
      console.error(`Error processing row ${i + 1}:`, error);
      results.errors.push({
        row: i + 1,
        error: error.message,
        data: row
      });
    }
  }
  
  return results;
}

module.exports = router;