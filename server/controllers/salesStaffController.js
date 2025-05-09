const db = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

/**
 * 销售人员管理控制器
 * 提供销售人员账户管理功能
 */
class SalesStaffController {
  /**
   * 创建新销售人员账户
   * @param {Object} req - 请求对象 
   * @param {Object} res - 响应对象
   */
  async createSalesStaff(req, res) {
    try {
      const { username, email, password, fullName, phone, assignedCategories } = req.body;
      
      // 验证必填字段
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email and password are required'
        });
      }
      
      // 检查用户名或邮箱是否已存在
      const existingUser = await db.User.findOne({
        where: {
          [Op.or]: [
            { username: username },
            { email: email }
          ]
        }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already exists'
        });
      }
      
      // 创建事务以确保数据一致性
      const transaction = await db.sequelize.transaction();
      
      try {
        // 哈希密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // 创建用户账号，设置角色为sales
        const newUser = await db.User.create({
          username,
          email,
          password: hashedPassword,
          role: 'sales',
          isActive: true
        }, { transaction });
        
        // 创建用户档案
        await db.UserProfile.create({
          userId: newUser.id,
          fullName: fullName || username,
          phone: phone || '',
          address: '',
          profileComplete: !!fullName && !!phone
        }, { transaction });
        
        // 分配销售类别（如果提供）
        if (assignedCategories && Array.isArray(assignedCategories) && assignedCategories.length > 0) {
          // 获取指定类别下的所有产品
          const products = await db.Product.findAll({
            where: {
              categoryId: { [Op.in]: assignedCategories }
            },
            attributes: ['id'],
            transaction
          });
          
          // 创建销售人员与产品的关联
          const assignments = products.map(product => ({
            salesId: newUser.id,
            productId: product.id
          }));
          
          if (assignments.length > 0) {
            await db.SalesProductAssignment.bulkCreate(assignments, { transaction });
          }
        }
        
        // 提交事务
        await transaction.commit();
        
        res.status(201).json({
          success: true,
          message: 'Sales staff account created successfully',
          data: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role
          }
        });
      } catch (error) {
        // 回滚事务
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating sales staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create sales staff account',
        error: error.message
      });
    }
  }
  
  /**
   * 获取所有销售人员列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getAllSalesStaff(req, res) {
    try {
      const salesStaff = await db.User.findAll({
        where: { role: 'sales' },
        attributes: ['id', 'username', 'email', 'createdAt', 'updatedAt', 'isActive'],
        include: [
          {
            model: db.UserProfile,
            as: 'profile',
            attributes: ['fullName', 'phone']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      // 获取每个销售人员负责的产品类别数量
      const staffWithMetrics = await Promise.all(salesStaff.map(async (staff) => {
        // 查询分配给该销售人员的所有产品
        const assignedProducts = await db.SalesProductAssignment.findAll({
          where: { salesId: staff.id },
          include: [
            {
              model: db.Product,
              as: 'product',
              attributes: ['id', 'categoryId']
            }
          ]
        });
        
        // 计算分配的唯一产品类别数量
        const uniqueCategories = new Set(assignedProducts.map(ap => ap.product.categoryId));
        
        // 计算上个月的销售业绩
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const productIds = assignedProducts.map(ap => ap.productId);
        
        const monthlyOrders = await db.OrderItem.findAll({
          where: {
            productId: { [Op.in]: productIds },
            createdAt: { [Op.gte]: lastMonth }
          },
          include: [
            {
              model: db.Order,
              as: 'order',
              where: {
                status: { [Op.in]: ['completed', 'shipped', 'delivered'] }
              }
            }
          ]
        });
        
        const monthlySales = monthlyOrders.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);
        
        return {
          ...staff.toJSON(),
          assignedCategories: uniqueCategories.size,
          assignedProducts: assignedProducts.length,
          lastMonthSales: monthlySales
        };
      }));
      
      res.status(200).json({
        success: true,
        data: staffWithMetrics
      });
    } catch (error) {
      console.error('Error fetching sales staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales staff',
        error: error.message
      });
    }
  }
  
  /**
   * 获取单个销售人员详情
   * @param {Object} req - 请求对象 
   * @param {Object} res - 响应对象
   */
  async getSalesStaffById(req, res) {
    try {
      const { id } = req.params;
      
      const salesStaff = await db.User.findOne({
        where: { 
          id: id,
          role: 'sales'
        },
        attributes: ['id', 'username', 'email', 'createdAt', 'updatedAt', 'isActive'],
        include: [
          {
            model: db.UserProfile,
            as: 'profile'
          }
        ]
      });
      
      if (!salesStaff) {
        return res.status(404).json({
          success: false,
          message: 'Sales staff not found'
        });
      }
      
      // 查询分配给该销售人员的所有产品
      const assignedProducts = await db.SalesProductAssignment.findAll({
        where: { salesId: id },
        include: [
          {
            model: db.Product,
            as: 'product',
            attributes: ['id', 'name', 'categoryId', 'price', 'stock']
          }
        ]
      });
      
      // 获取分配的产品类别
      const assignedCategoryIds = [
        ...new Set(assignedProducts.map(ap => ap.product.categoryId))
      ];
      
      // 获取类别信息
      const categories = [];
      if (assignedCategoryIds.length > 0) {
        // 这里假设有一个Category模型，实际应根据项目结构调整
        for (const categoryId of assignedCategoryIds) {
          categories.push({
            id: categoryId,
            productCount: assignedProducts.filter(ap => ap.product.categoryId === categoryId).length
          });
        }
      }
      
      // 获取最近30天的销售业绩
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const productIds = assignedProducts.map(ap => ap.productId);
      
      const recentOrders = await db.OrderItem.findAll({
        where: {
          productId: { [Op.in]: productIds },
          createdAt: { [Op.gte]: thirtyDaysAgo }
        },
        include: [
          {
            model: db.Order,
            as: 'order',
            where: {
              status: { [Op.in]: ['completed', 'shipped', 'delivered'] }
            },
            attributes: ['id', 'createdAt', 'status']
          }
        ]
      });
      
      const salesMetrics = {
        totalSales: recentOrders.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        totalOrders: new Set(recentOrders.map(item => item.orderId)).size,
        totalQuantity: recentOrders.reduce((sum, item) => sum + item.quantity, 0)
      };
      
      res.status(200).json({
        success: true,
        data: {
          ...salesStaff.toJSON(),
          categories,
          assignedProducts: assignedProducts.map(ap => ({
            productId: ap.productId,
            productName: ap.product.name,
            categoryId: ap.product.categoryId,
            price: ap.product.price,
            stock: ap.product.stock
          })),
          salesMetrics
        }
      });
    } catch (error) {
      console.error('Error fetching sales staff details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales staff details',
        error: error.message
      });
    }
  }
  
  /**
   * 更新销售人员信息
   * @param {Object} req - 请求对象 
   * @param {Object} res - 响应对象
   */
  async updateSalesStaff(req, res) {
    try {
      const { id } = req.params;
      const { username, email, fullName, phone, isActive } = req.body;
      
      // 检查销售人员是否存在
      const salesStaff = await db.User.findOne({
        where: {
          id: id,
          role: 'sales'
        }
      });
      
      if (!salesStaff) {
        return res.status(404).json({
          success: false,
          message: 'Sales staff not found'
        });
      }
      
      // 创建事务
      const transaction = await db.sequelize.transaction();
      
      try {
        // 更新用户基本信息
        const updateData = {};
        
        if (username && username !== salesStaff.username) {
          // 检查用户名是否已被占用
          const existingUsername = await db.User.findOne({
            where: {
              username,
              id: { [Op.ne]: id }
            }
          });
          
          if (existingUsername) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Username already exists'
            });
          }
          
          updateData.username = username;
        }
        
        if (email && email !== salesStaff.email) {
          // 检查邮箱是否已被占用
          const existingEmail = await db.User.findOne({
            where: {
              email,
              id: { [Op.ne]: id }
            }
          });
          
          if (existingEmail) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: 'Email already exists'
            });
          }
          
          updateData.email = email;
        }
        
        if (isActive !== undefined) {
          updateData.isActive = isActive;
        }
        
        // 只有在有更新数据时才更新
        if (Object.keys(updateData).length > 0) {
          await salesStaff.update(updateData, { transaction });
        }
        
        // 更新用户档案
        if (fullName || phone) {
          const profileData = {};
          
          if (fullName) {
            profileData.fullName = fullName;
          }
          
          if (phone) {
            profileData.phone = phone;
          }
          
          await db.UserProfile.update(profileData, {
            where: { userId: id },
            transaction
          });
        }
        
        // 提交事务
        await transaction.commit();
        
        res.status(200).json({
          success: true,
          message: 'Sales staff updated successfully',
          data: {
            id: salesStaff.id,
            username: updateData.username || salesStaff.username,
            email: updateData.email || salesStaff.email,
            isActive: isActive !== undefined ? isActive : salesStaff.isActive
          }
        });
      } catch (error) {
        // 回滚事务
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating sales staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update sales staff',
        error: error.message
      });
    }
  }
  
  /**
   * 删除销售人员账户
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deleteSalesStaff(req, res) {
    try {
      const { id } = req.params;
      
      // 检查销售人员是否存在
      const salesStaff = await db.User.findOne({
        where: {
          id: id,
          role: 'sales'
        }
      });
      
      if (!salesStaff) {
        return res.status(404).json({
          success: false,
          message: 'Sales staff not found'
        });
      }
      
      // 创建事务
      const transaction = await db.sequelize.transaction();
      
      try {
        // 删除销售人员的产品分配
        await db.SalesProductAssignment.destroy({
          where: { salesId: id },
          transaction
        });
        
        // 标记为非活跃，而不是真正删除
        await salesStaff.update(
          { isActive: false },
          { transaction }
        );
        
        // 提交事务
        await transaction.commit();
        
        res.status(200).json({
          success: true,
          message: 'Sales staff deactivated successfully'
        });
      } catch (error) {
        // 回滚事务
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error deleting sales staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete sales staff',
        error: error.message
      });
    }
  }
  
  /**
   * 重置销售人员密码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async resetSalesStaffPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      // 验证密码
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }
      
      // 检查销售人员是否存在
      const salesStaff = await db.User.findOne({
        where: {
          id: id,
          role: 'sales'
        }
      });
      
      if (!salesStaff) {
        return res.status(404).json({
          success: false,
          message: 'Sales staff not found'
        });
      }
      
      // 哈希新密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // 更新密码
      await salesStaff.update({ password: hashedPassword });
      
      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Error resetting sales staff password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
        error: error.message
      });
    }
  }
  
  /**
   * 分配产品给销售人员
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async assignProducts(req, res) {
    try {
      const { id } = req.params;
      const { productIds, categoryIds } = req.body;
      
      // 验证请求体
      if ((!productIds || !Array.isArray(productIds) || productIds.length === 0) &&
          (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Either productIds or categoryIds must be provided'
        });
      }
      
      // 检查销售人员是否存在
      const salesStaff = await db.User.findOne({
        where: {
          id: id,
          role: 'sales'
        }
      });
      
      if (!salesStaff) {
        return res.status(404).json({
          success: false,
          message: 'Sales staff not found'
        });
      }
      
      // 创建事务
      const transaction = await db.sequelize.transaction();
      
      try {
        let productsToAssign = [];
        
        // 如果提供了类别ID，则查询这些类别下的所有产品
        if (categoryIds && categoryIds.length > 0) {
          const productsByCategory = await db.Product.findAll({
            where: {
              categoryId: { [Op.in]: categoryIds }
            },
            attributes: ['id'],
            transaction
          });
          
          productsToAssign = [...productsToAssign, ...productsByCategory.map(p => p.id)];
        }
        
        // 如果提供了产品ID，则直接添加
        if (productIds && productIds.length > 0) {
          productsToAssign = [...productsToAssign, ...productIds];
        }
        
        // 去重
        productsToAssign = [...new Set(productsToAssign)];
        
        if (productsToAssign.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'No products found to assign'
          });
        }
        
        // 查询已经分配给该销售人员的产品
        const existingAssignments = await db.SalesProductAssignment.findAll({
          where: {
            salesId: id,
            productId: { [Op.in]: productsToAssign }
          },
          attributes: ['productId'],
          transaction
        });
        
        const existingProductIds = existingAssignments.map(a => a.productId);
        
        // 过滤出未分配的产品
        const newAssignments = productsToAssign
          .filter(pid => !existingProductIds.includes(pid))
          .map(productId => ({
            salesId: parseInt(id),
            productId
          }));
        
        if (newAssignments.length > 0) {
          // 批量创建新的分配
          await db.SalesProductAssignment.bulkCreate(newAssignments, { transaction });
        }
        
        // 提交事务
        await transaction.commit();
        
        res.status(200).json({
          success: true,
          message: `${newAssignments.length} products assigned successfully`,
          data: {
            assignedProducts: newAssignments.length,
            alreadyAssigned: existingProductIds.length
          }
        });
      } catch (error) {
        // 回滚事务
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error assigning products to sales staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign products',
        error: error.message
      });
    }
  }
  
  /**
   * 取消分配产品给销售人员
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async unassignProducts(req, res) {
    try {
      const { id } = req.params;
      const { productIds, categoryIds } = req.body;
      
      // 验证请求体
      if ((!productIds || !Array.isArray(productIds) || productIds.length === 0) &&
          (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Either productIds or categoryIds must be provided'
        });
      }
      
      // 检查销售人员是否存在
      const salesStaff = await db.User.findOne({
        where: {
          id: id,
          role: 'sales'
        }
      });
      
      if (!salesStaff) {
        return res.status(404).json({
          success: false,
          message: 'Sales staff not found'
        });
      }
      
      // 创建事务
      const transaction = await db.sequelize.transaction();
      
      try {
        let productsToUnassign = [];
        
        // 如果提供了类别ID，则查询这些类别下的所有产品
        if (categoryIds && categoryIds.length > 0) {
          const productsByCategory = await db.Product.findAll({
            where: {
              categoryId: { [Op.in]: categoryIds }
            },
            attributes: ['id'],
            transaction
          });
          
          productsToUnassign = [...productsToUnassign, ...productsByCategory.map(p => p.id)];
        }
        
        // 如果提供了产品ID，则直接添加
        if (productIds && productIds.length > 0) {
          productsToUnassign = [...productsToUnassign, ...productIds];
        }
        
        // 去重
        productsToUnassign = [...new Set(productsToUnassign)];
        
        if (productsToUnassign.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'No products found to unassign'
          });
        }
        
        // 删除指定的分配
        const result = await db.SalesProductAssignment.destroy({
          where: {
            salesId: id,
            productId: { [Op.in]: productsToUnassign }
          },
          transaction
        });
        
        // 提交事务
        await transaction.commit();
        
        res.status(200).json({
          success: true,
          message: `${result} product assignments removed successfully`,
          data: {
            unassignedProducts: result
          }
        });
      } catch (error) {
        // 回滚事务
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error unassigning products from sales staff:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unassign products',
        error: error.message
      });
    }
  }
}

module.exports = new SalesStaffController();