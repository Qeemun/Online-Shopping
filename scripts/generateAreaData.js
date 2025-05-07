// 生成element-china-area-data省市区数据的脚本
const fs = require('fs');
const path = require('path');

// 从 element-china-area-data 包中导入数据
const areaData = require('element-china-area-data');

// 打印对象的结构，以便了解数据格式
console.log('Available exports:', Object.keys(areaData));

// 使用 areaData 中提供的数据结构
const { provinceAndCityData, regionData, pcaTextArr } = areaData;

// 初始化数据结构
const provinces = [];
const cities = {};
const areas = {};

// 方法1：从regionData中提取数据（这是完整的省市区数据）
if (Array.isArray(regionData)) {
    console.log('从regionData提取省市区数据...');
    
    // 提取省份数据
    regionData.forEach(province => {
        // 添加省份
        provinces.push({
            value: province.value,
            label: province.label
        });
        
        // 如果省份有城市
        if (province.children && Array.isArray(province.children)) {
            cities[province.value] = [];
            
            province.children.forEach(city => {
                // 添加城市
                cities[province.value].push({
                    value: city.value,
                    label: city.label
                });
                
                // 如果城市有区县
                if (city.children && Array.isArray(city.children)) {
                    areas[city.value] = city.children.map(area => ({
                        value: area.value,
                        label: area.label
                    }));
                }
            });
        }
    });
}
// 如果按照索引方式组织的regionData
if (Object.keys(areas).length === 0 && typeof regionData === 'object' && !Array.isArray(regionData)) {
    console.log('尝试以索引方式解析regionData...');
    
    Object.values(regionData).forEach(province => {
        if (province && province.children && Array.isArray(province.children)) {
            province.children.forEach(city => {
                if (city && city.children && Array.isArray(city.children)) {
                    areas[city.value] = city.children.map(area => ({
                        value: area.value,
                        label: area.label
                    }));
                }
            });
        }
    });
}

// 如果所有方法都失败，使用codeToText提取
if (Object.keys(areas).length === 0 && areaData.codeToText) {
    console.log('使用codeToText提取区县数据...');
    
    Object.entries(areaData.codeToText).forEach(([code, name]) => {
        // 区县编码通常是6位数字
        if (code.length === 6 && /^\d+$/.test(code)) {
            // 找出对应的城市编码(前4位)
            const cityCode = code.substring(0, 4);
            if (!areas[cityCode]) {
                areas[cityCode] = [];
            }
            
            // 避免重复添加
            const exists = areas[cityCode].some(item => item.value === code);
            if (!exists) {
                areas[cityCode].push({
                    value: code,
                    label: name
                });
            }
        }
    });
}

// 创建数据对象
const areaCodeData = {
    provinces,
    cities,
    areas
};

// 打印区县数据统计
console.log(`总共找到 ${Object.keys(areas).length} 个城市的区县数据`);
if (Object.keys(areas).length > 0) {
    // 显示前三个城市的区县数量
    const sampleCityCodes = Object.keys(areas).slice(0, 3);
    sampleCityCodes.forEach(cityCode => {
        console.log(`城市 ${cityCode} 有 ${areas[cityCode].length} 个区县`);
    });
}

// 生成 JavaScript 文件内容
const fileContent = `// 自动生成的省市区数据，来源于 element-china-area-data
// 生成时间: ${new Date().toLocaleString()}
const areaCodeData = ${JSON.stringify(areaCodeData, null, 2)};
`;

// 写入文件
const outputPath = path.resolve(__dirname, '../public/js/area-data.js');
fs.writeFileSync(outputPath, fileContent);

console.log(`区域数据已成功写入: ${outputPath}`);
console.log(`共导出 ${provinces.length} 个省份, ${Object.keys(cities).length} 个城市数据组, ${Object.keys(areas).length} 个区县数据组`);