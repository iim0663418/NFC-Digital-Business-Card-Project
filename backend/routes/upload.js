const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const router = express.Router();

// 設定檔案上傳
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // 檢查檔案類型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and GIF images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
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

// 圖片處理功能
const processImage = async (inputPath, outputPath) => {
  try {
    await sharp(inputPath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(outputPath);
      
    // 檢查輸出檔案大小
    const stats = await fs.stat(outputPath);
    const fileSizeInKB = stats.size / 1024;
    
    // 如果檔案太大，降低品質
    if (fileSizeInKB > 50) {
      await sharp(inputPath)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 70,
          progressive: true
        })
        .toFile(outputPath);
    }
    
    return {
      success: true,
      size: fileSizeInKB
    };
  } catch (error) {
    throw new Error(`Image processing failed: ${error.message}`);
  }
};

// 上傳單張照片
router.post('/photo', upload.single('photo'), [
  body('employee_id').optional().trim().isLength({ min: 1 }).withMessage('Employee ID cannot be empty'),
  handleValidationErrors
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No photo file uploaded'
      });
    }

    const tempPath = req.file.path;
    const fileName = `photo-${Date.now()}.jpg`;
    const outputDir = path.join(__dirname, '../uploads/photos');
    const outputPath = path.join(outputDir, fileName);
    
    // 確保輸出目錄存在
    await fs.mkdir(outputDir, { recursive: true });
    
    // 處理圖片
    const processResult = await processImage(tempPath, outputPath);
    
    // 刪除暫存檔案
    await fs.unlink(tempPath);
    
    const photoUrl = `/uploads/photos/${fileName}`;
    
    res.json({
      message: 'Photo uploaded and processed successfully',
      photo_url: photoUrl,
      file_size_kb: Math.round(processResult.size),
      processed_dimensions: '300x300'
    });
    
  } catch (error) {
    console.error('Error uploading photo:', error);
    
    // 清理暫存檔案
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File Too Large',
        message: 'File size exceeds 10MB limit'
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload and process photo'
    });
  }
});

// 批次上傳照片
router.post('/photos/batch', upload.array('photos', 10), async (req, res) => {
  const results = [];
  const errors = [];
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No photo files uploaded'
      });
    }
    
    const outputDir = path.join(__dirname, '../uploads/photos');
    await fs.mkdir(outputDir, { recursive: true });
    
    // 處理每張照片
    for (const file of req.files) {
      try {
        const tempPath = file.path;
        const fileName = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        const outputPath = path.join(outputDir, fileName);
        
        // 處理圖片
        const processResult = await processImage(tempPath, outputPath);
        
        // 刪除暫存檔案
        await fs.unlink(tempPath);
        
        results.push({
          original_name: file.originalname,
          photo_url: `/uploads/photos/${fileName}`,
          file_size_kb: Math.round(processResult.size),
          status: 'success'
        });
        
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        
        // 清理暫存檔案
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
        
        errors.push({
          original_name: file.originalname,
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Batch photo upload completed',
      processed: results.length,
      failed: errors.length,
      results: results,
      errors: errors
    });
    
  } catch (error) {
    console.error('Error in batch photo upload:', error);
    
    // 清理所有暫存檔案
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
      }
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process batch photo upload'
    });
  }
});

// 刪除照片
router.delete('/photo/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // 安全檢查：確保檔名不包含路徑遍歷
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid filename'
      });
    }
    
    const filePath = path.join(__dirname, '../uploads/photos', filename);
    
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      
      res.json({
        message: 'Photo deleted successfully'
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Photo file not found'
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete photo'
    });
  }
});

// 取得照片資訊
router.get('/photo/:filename/info', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // 安全檢查
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid filename'
      });
    }
    
    const filePath = path.join(__dirname, '../uploads/photos', filename);
    
    try {
      const stats = await fs.stat(filePath);
      
      // 取得圖片資訊
      const metadata = await sharp(filePath).metadata();
      
      res.json({
        filename: filename,
        file_size_bytes: stats.size,
        file_size_kb: Math.round(stats.size / 1024),
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        format: metadata.format,
        created_at: stats.birthtime,
        modified_at: stats.mtime
      });
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Photo file not found'
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error getting photo info:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get photo information'
    });
  }
});

module.exports = router;