/**
 * reports.js - 统一销售报表控制脚本
 * 整合了商品销售报表和销售概览报表的功能
 */

// 全局变量
const salesUtils = new SalesUtils();
let currentUserRole = null;

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

// 根据用户权限调整界面
function adjustUIByRole() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    currentUserRole = user.role;
    
    if (currentUserRole === 'sales') {
        // 销售人员只能查看与其相关的数据
        // 隐藏销售概览报表选项卡（如果有需要）
        const salesReportTab = document.getElementById('sales-report-tab');
        if (salesReportTab) {
            salesReportTab.style.display = 'none';
        }
        
        // 隐藏库存状态区域（销售员可能无权查看库存相关信息）
        const inventorySection = document.querySelector('section.report-container:nth-of-type(3)');
        if (inventorySection) {
            inventorySection.style.display = 'none';
        }
        
        // 隐藏销售人员业绩的某些操作按钮
        hideStaffPerformanceActions();
    }
}

// 隐藏销售人员业绩表中的操作按钮
function hideStaffPerformanceActions() {
    // 设置一个MutationObserver来监视DOM变化
    const observer = new MutationObserver((mutations) => {
        const staffPerformanceBody = document.getElementById('staff-performance-body');
        if (staffPerformanceBody) {
            // 隐藏所有操作按钮（对于非管理员）
            if (currentUserRole !== 'admin') {
                const actionButtons = staffPerformanceBody.querySelectorAll('.action-button');
                actionButtons.forEach(button => {
                    button.style.display = 'none';
                });
            }
        }
    });
    
    // 开始观察文档变化
    observer.observe(document.body, { childList: true, subtree: true });
}

// 加载销售数据时根据用户权限过滤
async function loadDataWithRoleFilter(apiEndpoint, params = {}) {
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // 如果是销售人员，只加载其负责的商品相关数据
        if (user.role === 'sales') {
            params.salesStaffId = user.id;
        }
        
        const queryParams = new URLSearchParams(params).toString();
        const url = `http://localhost:3000/api/${apiEndpoint}${queryParams ? '?' + queryParams : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败，状态码: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`加载数据失败: ${error.message}`);
        salesUtils.showNotification(`加载数据失败: ${error.message}`, 'error');
        return null;
    }
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户权限
    if (salesUtils.checkAuthAndPermission(['admin', 'sales'])) {
        // 根据用户角色调整界面
        adjustUIByRole();
        
        // 默认加载商品销售报表
        switchMainTab('product-report');
    }
});