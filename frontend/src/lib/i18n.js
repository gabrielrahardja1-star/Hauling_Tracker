export const translations = {
  id: {
    // Language toggle
    langLabel: 'ID',

    // Layout
    signOut: 'Keluar',
    backToHome: 'Kembali ke Home',

    // Roles
    roleStockpile: 'Operator Stockpile',
    roleJetty: 'Operator Jetty',
    roleAdmin: 'Admin',
    roleAnalytics: 'Analytics',

    // Login
    loginTitle: 'Masuk',
    loginEmail: 'Email',
    loginPassword: 'Password',
    loginButton: 'Masuk',
    loginLoading: 'Memproses...',
    loginError: 'Email atau password salah',

    // Nav / Admin actions
    navUsers: 'Users',
    navAnalytics: 'Analytics',
    navStockpile: 'Stockpile',
    navJetty: 'Jetty',
    navExport: 'Export .xlsx',

    // Filters
    filters: 'Filters',
    filterDate: 'Date',
    filterJetty: 'Jetty',
    filterStatus: 'Status',
    allJettys: 'All Jettys',
    allStatuses: 'All Statuses',

    // KPI cards
    grossSite: 'Gross Site',
    nettoSite: 'Netto Site',
    grossJetty: 'Gross Jetty',
    nettoJetty: 'Netto Jetty',
    bargeLoading: 'Barge Loading',
    endingCoalBalance: 'Ending Coal Balance',

    // Table headers
    colNo: '#',
    colTruck: 'Truck',
    colJetty: 'Jetty',
    colStatus: 'Status',
    colCoal: 'Coal',
    colWeather: 'Cuaca',
    colTareSite: 'Tare Site',
    colGrossSite: 'Gross Site',
    colNettoSite: 'Netto Site',
    colCP1: 'CP1',
    colGrossJetty: 'Gross Jetty',
    colNettoJetty: 'Netto Jetty',
    colCompGross: 'Comp.Gross',
    colDeviasi: 'Deviasi',
    colAdjustment: 'Adjustment',
    colCP2: 'CP2',
    colCP3: 'CP3',

    // Trips table
    trips: 'Trips',
    records: 'records',
    of: 'of',
    noTrips: 'No trips found',
    searchTrucks: 'Search truck, status...',
    refresh: 'Segarkan',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',

    // Status labels
    statusPending: 'Pending',
    statusInTransit: 'In Transit',
    statusCompleted: 'Completed',
    statusPendingLong: 'Di Stockpile',
    statusInTransitLong: 'Perjalanan',
    statusCompletedLong: 'Selesai',

    // Coal quality
    coalClean: 'Clean',
    coalRaw: 'Raw',

    // Stockpile tabs
    tabMasuk: 'Masuk',
    tabKeluar: 'Keluar',
    tabTrip: 'Trip',
    tabEkspor: 'Ekspor',
    tabAnalytics: 'Analytics',

    // Jetty tabs
    tabTimbang: 'Timbang',
    tabBarge: 'Barge',

    // CP1 Form
    cp1Title: 'Catat Kedatangan',
    cp1NoLambung: 'No. Lambung',
    cp1JettyDest: 'Tujuan Jetty',
    cp1CoalQuality: 'Kualitas Batubara',
    cp1Weather: 'Cuaca MMI',
    cp1TareSite: 'Tare Site (kg)',
    cp1Submit: 'Catat Masuk',
    cp1Success: 'Truk tercatat masuk',

    // CP2 Form
    cp2Title: 'Catat Keberangkatan',
    cp2GrossSite: 'Gross Site (kg)',
    cp2Submit: 'Catat Keluar',
    cp2Success: 'Truk tercatat keluar',

    // CP3 Form
    cp3Title: 'Timbang di Jetty',
    cp3SearchPlaceholder: 'Cari no. lambung...',
    cp3GrossJetty: 'Gross Jetty (kg)',
    cp3Submit: 'Simpan Timbangan',
    cp3Success: 'Timbang jetty selesai',
    cp3TambahLagi: 'Tambah lagi',

    // Today list
    todayTitle: 'Trip Hari Ini',
    todayEmpty: 'Belum ada trip hari ini',
    truckCount: 'truk',

    // Barge panel
    bargeTitle: 'Catat Muat Tongkang',
    bargeName: 'Nama Tongkang',
    tugBoat: 'Nama Tugboat',
    loadingDate: 'Tanggal Muat',
    loadingQty: 'Jumlah Muat (kg)',
    bargeSubmit: 'Simpan',
    bargeHistory: 'Riwayat Muat',
    bargeEmpty: 'Belum ada data muat',

    // Export panel
    exportTitle: 'Unduh Data',
    exportDate: 'Tanggal',
    exportJetty: 'Jetty',
    exportButton: 'Unduh Excel',
    exportEmpty: 'Tidak ada trip untuk pilihan ini',
    exportTruk: 'truk',
    exportTotal: 'TOTAL',
    exportTare: 'Tare',
    exportMasuk: 'Masuk',
    exportKeluar: 'Keluar',
    exportJettyCol: 'Jetty',

    // Analytics
    analyticsFrom: 'Dari',
    analyticsTo: 'Sampai',
    analyticsJetty: 'Jetty',
    analyticsAll: 'Semua',
    analyticsHauled: 'Hauled',
    analyticsBarged: 'Barged',
    analyticsBalance: 'Balance',
    analyticsPerJetty: 'Per Jetty',
    analyticsNettoSite: 'Netto Site',
    analyticsNettoJetty: 'Netto Jetty',
    analyticsHauledLabel: 'Hauled',
    analyticsDaily: 'Harian',
    analyticsDate: 'Tanggal',
    analyticsTrips: 'Trips',
    analyticsNet: 'Netto (t)',
    analyticsTotal: 'Total',
    analyticsOverview: 'Overview',
    analyticsMonitoring: 'Monitoring',
    analyticsTonnes: 'tonnes',
    analyticsLoadings: 'loadings',
    analyticsTripsCount: 'trips',

    // Monitoring
    monitoringTitle: 'Ringkasan Pelanggaran',
    monitoringDeviation: 'Deviasi',
    monitoringSLATransit: 'SLA Transit',
    monitoringNoViolations: 'Tidak ada pelanggaran dalam periode ini',
    monitoringDeviationLabel: 'deviasi > 0.5%',
    monitoringSLALabel: 'SLA transit >4j',
    monitoringNoData: 'Tidak ada pelanggaran.',
    monitoringTruck: 'Truk',
    monitoringNettoSite: 'Netto Site',
    monitoringNettoJetty: 'Netto Jetty',
    monitoringDevLabel: 'Deviasi',
    monitoringKeluar: 'Keluar Site',
    monitoringTiba: 'Tiba Jetty',
    monitoringDuration: 'Durasi',
    monitoringJam: 'jam',
    monitoringEligible: 'pengiriman dengan data jetty',

    // User management
    userTitle: 'User Management',
    userEmail: 'Email',
    userPassword: 'Password',
    userRole: 'Role',
    userCreate: 'Buat User',
    userCreating: 'Membuat...',
    userDelete: 'Hapus',
    userClose: 'Tutup',
  },

  zh: {
    // Language toggle
    langLabel: '中',

    // Layout
    signOut: '退出',
    backToHome: '返回主页',

    // Roles
    roleStockpile: '现场操作员',
    roleJetty: '码头操作员',
    roleAdmin: '管理员',
    roleAnalytics: '数据分析',

    // Login
    loginTitle: '登录',
    loginEmail: '邮箱',
    loginPassword: '密码',
    loginButton: '登录',
    loginLoading: '登录中...',
    loginError: '邮箱或密码错误',

    // Nav / Admin actions
    navUsers: '用户',
    navAnalytics: '数据分析',
    navStockpile: '现场',
    navJetty: '码头',
    navExport: '导出 .xlsx',

    // Filters
    filters: '筛选',
    filterDate: '日期',
    filterJetty: '码头',
    filterStatus: '状态',
    allJettys: '所有码头',
    allStatuses: '所有状态',

    // KPI cards
    grossSite: '现场毛重',
    nettoSite: '现场净重',
    grossJetty: '码头毛重',
    nettoJetty: '码头净重',
    bargeLoading: '驳船装载量',
    endingCoalBalance: '结余煤炭量',

    // Table headers
    colNo: '序号',
    colTruck: '车辆',
    colJetty: '码头',
    colStatus: '状态',
    colCoal: '煤质',
    colWeather: '天气',
    colTareSite: '皮重',
    colGrossSite: '现场毛重',
    colNettoSite: '现场净重',
    colCP1: 'CP1',
    colGrossJetty: '码头毛重',
    colNettoJetty: '码头净重',
    colCompGross: '毛重对比',
    colDeviasi: '偏差',
    colAdjustment: '调整',
    colCP2: 'CP2',
    colCP3: 'CP3',

    // Trips table
    trips: '运输记录',
    records: '条记录',
    of: '共',
    noTrips: '暂无运输记录',
    searchTrucks: '搜索车辆、状态...',
    refresh: '刷新',
    fullscreen: '全屏',
    exitFullscreen: '退出全屏',

    // Status labels
    statusPending: '待处理',
    statusInTransit: '运输中',
    statusCompleted: '已完成',
    statusPendingLong: '在现场',
    statusInTransitLong: '运输中',
    statusCompletedLong: '已完成',

    // Coal quality
    coalClean: '精煤',
    coalRaw: '原煤',

    // Stockpile tabs
    tabMasuk: '进场',
    tabKeluar: '出场',
    tabTrip: '行程',
    tabEkspor: '导出',
    tabAnalytics: '数据分析',

    // Jetty tabs
    tabTimbang: '称重',
    tabBarge: '驳船',

    // CP1 Form
    cp1Title: '记录进场',
    cp1NoLambung: '车辆编号',
    cp1JettyDest: '目的码头',
    cp1CoalQuality: '煤炭品质',
    cp1Weather: '天气',
    cp1TareSite: '皮重 (kg)',
    cp1Submit: '记录进场',
    cp1Success: '车辆已记录进场',

    // CP2 Form
    cp2Title: '记录出场',
    cp2GrossSite: '毛重 (kg)',
    cp2Submit: '记录出场',
    cp2Success: '车辆已记录出场',

    // CP3 Form
    cp3Title: '码头称重',
    cp3SearchPlaceholder: '搜索车辆编号...',
    cp3GrossJetty: '码头毛重 (kg)',
    cp3Submit: '保存称重',
    cp3Success: '码头称重完成',
    cp3TambahLagi: '继续添加',

    // Today list
    todayTitle: '今日行程',
    todayEmpty: '今日暂无行程',
    truckCount: '辆',

    // Barge panel
    bargeTitle: '记录驳船装载',
    bargeName: '驳船名称',
    tugBoat: '拖轮名称',
    loadingDate: '装载日期',
    loadingQty: '装载量 (kg)',
    bargeSubmit: '保存',
    bargeHistory: '装载历史',
    bargeEmpty: '暂无装载数据',

    // Export panel
    exportTitle: '下载数据',
    exportDate: '日期',
    exportJetty: '码头',
    exportButton: '下载 Excel',
    exportEmpty: '所选条件无数据',
    exportTruk: '辆',
    exportTotal: '合计',
    exportTare: '皮重',
    exportMasuk: '进场',
    exportKeluar: '出场',
    exportJettyCol: '码头',

    // Analytics
    analyticsFrom: '开始日期',
    analyticsTo: '结束日期',
    analyticsJetty: '码头',
    analyticsAll: '全部',
    analyticsHauled: '运输量',
    analyticsBarged: '装船量',
    analyticsBalance: '结余',
    analyticsPerJetty: '各码头',
    analyticsNettoSite: '现场净重',
    analyticsNettoJetty: '码头净重',
    analyticsHauledLabel: '运输量',
    analyticsDaily: '日报',
    analyticsDate: '日期',
    analyticsTrips: '行程',
    analyticsNet: '净重 (吨)',
    analyticsTotal: '合计',
    analyticsOverview: '概览',
    analyticsMonitoring: '监控',
    analyticsTonnes: '吨',
    analyticsLoadings: '次装载',
    analyticsTripsCount: '次行程',

    // Monitoring
    monitoringTitle: '违规汇总',
    monitoringDeviation: '偏差',
    monitoringSLATransit: 'SLA 运输',
    monitoringNoViolations: '本期内无违规记录',
    monitoringDeviationLabel: '偏差 > 0.5%',
    monitoringSLALabel: 'SLA 运输 >4小时',
    monitoringNoData: '无违规记录。',
    monitoringTruck: '车辆',
    monitoringNettoSite: '现场净重',
    monitoringNettoJetty: '码头净重',
    monitoringDevLabel: '偏差',
    monitoringKeluar: '离场时间',
    monitoringTiba: '到港时间',
    monitoringDuration: '时长',
    monitoringJam: '小时',
    monitoringEligible: '条有码头数据的记录',

    // User management
    userTitle: '用户管理',
    userEmail: '邮箱',
    userPassword: '密码',
    userRole: '角色',
    userCreate: '创建用户',
    userCreating: '创建中...',
    userDelete: '删除',
    userClose: '关闭',
  },
};

export function t(lang, key) {
  return translations[lang]?.[key] ?? translations['id'][key] ?? key;
}
