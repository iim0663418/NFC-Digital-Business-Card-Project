const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemSetting = sequelize.define('SystemSetting', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    setting_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    setting_value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'system_settings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    indexes: [
      {
        unique: true,
        fields: ['setting_key']
      }
    ]
  });

  // 類別方法
  SystemSetting.getSetting = async function(key) {
    const setting = await this.findOne({
      where: { setting_key: key }
    });
    
    return setting ? setting.setting_value : null;
  };

  SystemSetting.setSetting = async function(key, value, description = null) {
    const [setting, created] = await this.findOrCreate({
      where: { setting_key: key },
      defaults: {
        setting_key: key,
        setting_value: value,
        description: description
      }
    });

    if (!created) {
      setting.setting_value = value;
      if (description !== null) {
        setting.description = description;
      }
      await setting.save();
    }

    return setting;
  };

  SystemSetting.getGitHubConfig = async function() {
    const [repoUrl, accessToken] = await Promise.all([
      this.getSetting('github_repository_url'),
      this.getSetting('github_access_token')
    ]);

    return {
      repository_url: repoUrl,
      access_token: accessToken,
      is_configured: !!(repoUrl && accessToken)
    };
  };

  SystemSetting.isDeploymentEnabled = async function() {
    const enabled = await this.getSetting('deployment_enabled');
    return enabled === 'true';
  };

  return SystemSetting;
};