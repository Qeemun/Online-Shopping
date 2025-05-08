/**
 * reports.js - 统一销售报表控制脚本
 * 整合了商品销售报表和销售概览报表的功能
 */

// 主选项卡切换功能
function switchMainTab(tabId) {
    // 隐藏所有报表区域
    document.querySelectorAll('.report-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 移除所有主选项卡的active类
    document.querySelectorAll('.main-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 显示选中的报表区域
    document.getElementById(tabId).classList.add('active');
    
    // 激活选中的选项卡
    document.getElementById(`${tabId}-tab`).classList.add('active');
    
    // 根据选择的选项卡加载相应的数据
    if (tabId === 'product-report') {
        // 如果某些图表在加载之前不存在，手动触发加载
        if (typeof loadSalesOverview === 'function') {
            loadSalesOverview();
        }
        if (typeof loadCategorySales === 'function') {
            loadCategorySales();
        }
        if (typeof loadInventoryStatus === 'function') {
            loadInventoryStatus();
        }
        if (typeof loadTopProducts === 'function') {
            loadTopProducts();
        }
    } else if (tabId === 'sales-report') {
        // 手动触发销售报表数据加载
        if (typeof loadSalesSummary === 'function') {
            loadSalesSummary();
        }
        if (typeof loadProductSales === 'function') {
            loadProductSales();
        }
        if (typeof loadSalesByPeriod === 'function') {
            loadSalesByPeriod();
        }
        if (typeof loadStaffPerformance === 'function') {
            loadStaffPerformance();
        }
    }
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户权限
    AuthUtils.checkAuth(['admin', 'sales']);
    
    // 默认加载商品销售报表
    switchMainTab('product-report');
});