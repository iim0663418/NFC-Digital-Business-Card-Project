const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    employee_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 50]
      }
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    unit: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        len: [0, 50]
      }
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [0, 255]
      }
    },
    linkedin_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true,
        len: [0, 255]
      }
    },
    github_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isUrl: true,
        len: [0, 255]
      }
    },
    photo_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [0, 255]
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    indexes: [
      {
        unique: true,
        fields: ['employee_id']
      },
      {
        fields: ['email']
      },
      {
        fields: ['full_name']
      },
      {
        fields: ['department']
      },
      {
        fields: ['unit']
      }
    ],
    
    hooks: {
      beforeValidate: (user) => {
        // 確保 employee_id 為大寫
        if (user.employee_id) {
          user.employee_id = user.employee_id.toUpperCase().trim();
        }
        
        // 清理空白字元
        if (user.full_name) {
          user.full_name = user.full_name.trim();
        }
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }
      }
    }
  });

  // 實例方法
  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    
    // 產生名片網址
    values.business_card_url = `${process.env.GITHUB_REPO_URL}/${values.employee_id}/`;
    
    return values;
  };

  // 類別方法
  User.findByEmployeeId = function(employeeId) {
    return this.findOne({
      where: {
        employee_id: employeeId.toUpperCase()
      }
    });
  };

  User.searchUsers = function(query) {
    const { Op } = require('sequelize');
    
    return this.findAll({
      where: {
        [Op.or]: [
          { full_name: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } },
          { employee_id: { [Op.iLike]: `%${query}%` } },
          { department: { [Op.iLike]: `%${query}%` } },
          { unit: { [Op.iLike]: `%${query}%` } }
        ]
      },
      order: [['created_at', 'DESC']]
    });
  };

  return User;
};