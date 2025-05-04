const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Faker, zh_CN } = require('@faker-js/faker');
const faker = new Faker({ locale: [zh_CN] });

const db = require('../server/models');
const { Product } = db;

(async () => {
  const TOTAL_PRODUCTS = 200;
  const BATCH_SIZE = 100;

  const categories = [
    '电子产品', '服装', '家居', '厨房用品', '图书',
    '玩具', '运动器材', '美妆', '食品', '办公用品'
  ];

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

  try {
    console.log('正在连接数据库...');
    await db.sequelize.authenticate();
    console.log('✅ 数据库连接成功');

    const products = [];

    for (let i = 0; i < TOTAL_PRODUCTS; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const itemNames = categoryTemplates[category];
      const itemName = itemNames[Math.floor(Math.random() * itemNames.length)];

      const brand = faker.company.name();
      const name = `${brand} ${itemName}`;

      const descList = descriptionTemplates[category] || ['品质优良，值得信赖。'];
      const baseDesc = descList[Math.floor(Math.random() * descList.length)];
      const description = `这款 ${itemName} 来自品牌「${brand}」，${baseDesc}`;

      const imageUrl = `https://picsum.photos/seed/product${i}/400/300`;

      products.push({
        name,
        description,
        price: faker.commerce.price({ min: 10, max: 500, dec: 2 }),
        stock: faker.number.int({ min: 10, max: 100 }),
        category,
        imageUrl
      });
    }

    console.log(`准备插入 ${TOTAL_PRODUCTS} 条商品数据...`);
    for (let i = 0; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      await Product.bulkCreate(batch);
      console.log(`已插入第 ${i + 1} 到 ${Math.min(i + BATCH_SIZE, TOTAL_PRODUCTS)} 条`);
    }

    console.log('✅ 全部商品数据插入完成');
  } catch (err) {
    console.error('❌ 插入失败:', err.message);
    console.error(err.stack);
  } finally {
    try {
      await db.sequelize.close();
      console.log('✅ 数据库连接已关闭');
    } catch (err) {
      console.error('关闭连接出错:', err.message);
    }
    process.exit(0);
  }
})();
