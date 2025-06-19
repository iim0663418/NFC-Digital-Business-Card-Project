const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { User } = require('../config/database');
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

// 取得所有使用者列表
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query cannot be empty'),
  query('department').optional().trim(),
  query('unit').optional().trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;
    const department = req.query.department;
    const unit = req.query.unit;

    let whereClause = {};
    const { Op } = require('sequelize');

    // 搜尋條件
    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { employee_id: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // 部門篩選
    if (department) {
      whereClause.department = { [Op.iLike]: `%${department}%` };
    }

    // 單位篩選
    if (unit) {
      whereClause.unit = { [Op.iLike]: `%${unit}%` };
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: limit,
      offset: offset
    });

    res.json({
      users: rows,
      pagination: {
        total: count,
        page: page,
        limit: limit,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch users'
    });
  }
});

// 根據員工編號取得單個使用者
router.get('/:employee_id', [
  param('employee_id').trim().notEmpty().withMessage('Employee ID is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const user = await User.findByEmployeeId(req.params.employee_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user'
    });
  }
});

// 建立新使用者
router.post('/', [
  body('employee_id').trim().notEmpty().withMessage('Employee ID is required'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('unit').trim().notEmpty().withMessage('Unit is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('linkedin_url').optional().isURL().withMessage('LinkedIn URL must be valid'),
  body('github_url').optional().isURL().withMessage('GitHub URL must be valid'),
  body('photo_url').optional().trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    // 檢查員工編號是否已存在
    const existingUser = await User.findByEmployeeId(req.body.employee_id);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Employee ID already exists'
      });
    }

    // 檢查電子郵件是否已存在
    const existingEmail = await User.findOne({
      where: { email: req.body.email.toLowerCase() }
    });
    if (existingEmail) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Email already exists'
      });
    }

    const user = await User.create(req.body);
    
    res.status(201).json({
      message: 'User created successfully',
      user: user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user'
    });
  }
});

// 更新使用者資料
router.put('/:employee_id', [
  param('employee_id').trim().notEmpty().withMessage('Employee ID is required'),
  body('full_name').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('department').optional().trim().notEmpty().withMessage('Department cannot be empty'),
  body('unit').optional().trim().notEmpty().withMessage('Unit cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('linkedin_url').optional().isURL().withMessage('LinkedIn URL must be valid'),
  body('github_url').optional().isURL().withMessage('GitHub URL must be valid'),
  body('photo_url').optional().trim(),
  handleValidationErrors
], async (req, res) => {
  try {
    const user = await User.findByEmployeeId(req.params.employee_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // 如果更新電子郵件，檢查是否與其他使用者衝突
    if (req.body.email && req.body.email !== user.email) {
      const existingEmail = await User.findOne({
        where: { 
          email: req.body.email.toLowerCase(),
          id: { [require('sequelize').Op.ne]: user.id }
        }
      });
      
      if (existingEmail) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Email already exists'
        });
      }
    }

    await user.update(req.body);
    
    res.json({
      message: 'User updated successfully',
      user: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.errors.map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user'
    });
  }
});

// 刪除使用者
router.delete('/:employee_id', [
  param('employee_id').trim().notEmpty().withMessage('Employee ID is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const user = await User.findByEmployeeId(req.params.employee_id);
    
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    await user.destroy();
    
    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user'
    });
  }
});

// 搜尋使用者
router.get('/search/:query', [
  param('query').trim().notEmpty().withMessage('Search query is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const users = await User.searchUsers(req.params.query);
    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search users'
    });
  }
});

module.exports = router;