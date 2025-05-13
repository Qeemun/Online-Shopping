// filepath: d:\JavaCode\Online-Shopping\scripts\seedProducts.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Faker, zh_CN } = require('@faker-js/faker');
const faker = new Faker({ locale: [zh_CN] });

// 导入数据库模型
const db = require('../server/models');
const { Product } = db;

// 添加日志函数
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

(async () => {
  // 允许通过命令行参数设置产品数量
  const TOTAL_PRODUCTS = process.argv[2] ? parseInt(process.argv[2]) : 200;
  const BATCH_SIZE = 100;

  // 商品类别 - 使用与系统兼容的类别
  // 这些类别应该与数据库中的categories表保持一致
  const baseCategories = [
    '电子产品', '服装', '家居', '厨房用品', '图书',
    '玩具', '运动器材', '美妆', '食品', '办公用品'
  ];
  
  // 新增类别，仅在确认数据库支持的情况下使用
  const newCategories = [
    '户外装备', '健康保健', '母婴产品', '宠物用品', '汽车配件'
  ];
  
  // 默认只使用基础类别，避免与数据库不一致
  let categories = [...baseCategories];

  const categoryTemplates = {
    电子产品: ['智能手机', '笔记本电脑', '蓝牙耳机', '投影仪', '显示器'],
    服装: ['T恤', '牛仔裤', '卫衣', '羽绒服', '休闲裤'],
    家居: ['床垫', '书桌', '衣柜', '沙发', '椅子'],
    厨房用品: ['电饭煲', '榨汁机', '炒锅', '微波炉', '碗筷套装'],
    图书: ['历史书籍', '科幻小说', '工具书', '英语教材', '漫画'],
    玩具: ['遥控车', '积木', '拼图', '布娃娃', '滑板'],
    运动器材: ['瑜伽垫', '哑铃', '跑步机', '篮球', '滑板车'],
    美妆: ['口红', '粉底液', '眼影盘', '化妆刷', '面膜'],
    食品: ['牛奶', '饼干', '咖啡', '方便面', '坚果'],
    办公用品: ['签字笔', '文件夹', '笔记本', '打印纸', '鼠标垫']
  };

  // 更新类别模板，添加新类别
  categoryTemplates['户外装备'] = ['帐篷', '睡袋', '登山杖', '登山鞋', '头灯'];
  categoryTemplates['健康保健'] = ['血压计', '按摩仪', '体重秤', '健康手环', '护腰带'];
  categoryTemplates['母婴产品'] = ['婴儿奶瓶', '尿不湿', '婴儿推车', '婴儿床', '婴儿玩具'];
  categoryTemplates['宠物用品'] = ['宠物窝', '宠物食盆', '猫砂', '宠物玩具', '宠物服装'];
  categoryTemplates['汽车配件'] = ['车载充电器', '方向盘套', '挂饰', '座椅套', '应急工具'];

  const descriptionTemplates = {
    电子产品: [
      '高性能设计，满足您的日常与办公需求。',
      '轻薄便携，打造高效生活方式。',
      '长续航与高清屏幕，提升使用体验。'
    ],
    服装: [
      '舒适面料，时尚百搭，彰显品味。',
      '适合四季穿着，贴身柔软不刺激。',
      '潮流设计，展现你的个性风格。'
    ],
    家居: [
      '高品质材质，舒适贴心的设计。',
      '多功能收纳，节省空间，简约现代。',
      '适合各种家庭装修风格，打造温馨家居。'
    ],
    厨房用品: [
      '创新设计，提升厨房效率。',
      '节能环保，便捷操作。',
      '高品质材料，耐用且易清洗。'
    ],
    图书: [
      '内容丰富，拓展视野。',
      '助力学习与思考的理想读物。',
      '知识的海洋，心灵的归宿。'
    ],
    玩具: [
      '有趣的设计，培养孩子的动手能力。',
      '安全环保材质，放心使用。',
      '富有创意，启发孩子的思维和想象力。'
    ],
    运动器材: [
      '增强体力与灵活性，助您实现健康目标。',
      '便于家庭使用，占地小，效果显著。',
      '专为运动爱好者设计，提升运动效果。'
    ],
    美妆: [
      '滋润保湿，给肌肤最自然的呵护。',
      '轻盈透气，完美贴合，持久不脱妆。',
      '为你带来焕然一新的完美妆容。'
    ],
    食品: [
      '新鲜出厂，健康营养，适合全家食用。',
      '精心调配，口感独特。',
      '精选优质食材，确保食品的安全与美味。'
    ],
    办公用品: [
      '高效办公，从一支好笔开始。',
      '简约设计，满足日常工作所需。',
      '办公必备，便捷高效，助你提升工作效率。'
    ]
  };

  // 更新描述模板，添加新类别的描述
  descriptionTemplates['户外装备'] = [
    '专为户外冒险设计，轻便且耐用。',
    '防水防晒，适应各种户外环境。',
    '专业户外装备，让你的旅程更加舒适安全。'
  ];
  
  descriptionTemplates['健康保健'] = [
    '关注健康，从日常监测开始。',
    '科技赋能健康生活，让保健更简单。',
    '精准检测，为您的健康保驾护航。'
  ];
  
  descriptionTemplates['母婴产品'] = [
    '专为宝宝设计，安全无害材质。',
    '关爱宝宝成长的每一步。',
    '让育儿更轻松，给宝宝更多呵护。'
  ];
  
  descriptionTemplates['宠物用品'] = [
    '让您的宠物享受舒适生活。',
    '专为宠物设计，满足它们的各种需求。',
    '优质材料，呵护您的爱宠健康。'
  ];
  
  descriptionTemplates['汽车配件'] = [
    '提升驾驶体验，让每一次出行更舒适。',
    '耐用实用，为您的爱车增添实用功能。',
    '高品质汽车配件，让您的座驾与众不同。'
  ];

  try {
    log('正在连接数据库...');
    await db.sequelize.authenticate();
    log('数据库连接成功');

    // 获取当前数据库中的商品数量
    const existingCount = await Product.count();
    log(`当前数据库中已有 ${existingCount} 个商品`);
    
    // 获取数据库中存在的类别
    try {
      const Category = db.Category;
      if (Category) {
        const existingCategories = await Category.findAll({
          attributes: ['name']
        });
        
        const existingCategoryNames = existingCategories.map(cat => cat.name);
        log(`数据库中已有以下类别: ${existingCategoryNames.join(', ')}`);
        
        // 检查新类别是否已存在于数据库中
        const supportedNewCategories = newCategories.filter(cat => 
          existingCategoryNames.includes(cat)
        );
        
        if (supportedNewCategories.length > 0) {
          log(`将使用以下额外类别: ${supportedNewCategories.join(', ')}`);
          categories = [...baseCategories, ...supportedNewCategories];
        } else {
          log('数据库中未找到新类别，仅使用基础类别');
        }
      }
    } catch (categoryError) {
      log('无法获取类别信息，将使用基础类别', true);
      console.error(categoryError);
    }
    
    const products = [];

    for (let i = 0; i < TOTAL_PRODUCTS; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const itemNames = categoryTemplates[category];
      const itemName = itemNames[Math.floor(Math.random() * itemNames.length)];

      const brand = faker.company.name();
      // 生成更多样化的商品名称
      const adjective = faker.commerce.productAdjective();
      const name = `${brand}  ${itemName}`;

      const descList = descriptionTemplates[category] || ['品质优良，值得信赖。'];
      // 构建更详细的产品描述
      const baseDesc = descList[Math.floor(Math.random() * descList.length)];
      const features = [
        faker.commerce.productMaterial() + "材质",
        faker.number.int({ min: 1, max: 5 }) + "年保修",
        Math.random() > 0.5 ? "支持退换货" : "限量版"
      ].join("，");
      
      const description = `这款 ${adjective} ${itemName} 来自品牌「${brand}」，${baseDesc} 产品特点：${features}。`;

      // 构建随机图片URL，添加时间戳避免重复
      const timestamp = Date.now() + i;
      const imageUrl = `https://picsum.photos/seed/product${i}_${timestamp}/400/300`;

      products.push({
        name,
        description,
        price: faker.commerce.price({ min: 10, max: 500, dec: 2 }),
        stock: faker.number.int({ min: 10, max: 100 }),
        category,
        status: Math.random() > 0.9 ? 'discontinued' : 'active', // 10%的商品设置为已停产
        imageUrl
      });
    }

    log(`准备插入 ${TOTAL_PRODUCTS} 条商品数据...`);
    
    try {
      for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        await Product.bulkCreate(batch);
        log(`已插入第 ${i + 1} 到 ${Math.min(i + BATCH_SIZE, TOTAL_PRODUCTS)} 条`);
      }
      
      // 验证插入结果
      const newCount = await Product.count();
      log(`插入完成，数据库中现有 ${newCount} 个商品（新增 ${newCount - existingCount} 个）`);
      
      log('全部商品数据插入完成');
    } catch (insertErr) {
      log(`批量插入过程中发生错误: ${insertErr.message}`, true);
      throw insertErr;
    }
  } catch (err) {
    log(`插入失败: ${err.message}`, true);
    console.error(err.stack);
  } finally {
    try {
      await db.sequelize.close();
      log('数据库连接已关闭');
    } catch (err) {
      log(`关闭连接出错: ${err.message}`, true);
    }
    
    // 添加总结信息
    const endTime = new Date();
    const startTime = new Date(process.hrtime()[0] * 1000);
    const duration = (endTime - startTime) / 1000;
    log(`脚本执行完毕，耗时: ${duration.toFixed(2)}秒`);
    
    process.exit(0);
  }
})();
