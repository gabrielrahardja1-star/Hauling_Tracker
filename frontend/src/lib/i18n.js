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
    colCP1: 'Jam Masuk',
    colGrossJetty: 'Gross Jetty',
    colNettoJetty: 'Netto Jetty',
    colCompGross: 'Comp.Gross',
    colDeviasi: 'Deviasi',
    colAdjustment: 'Adjustment',
    colCP2: 'Jam Keluar',
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

    // Trip row meta
    tripTara: 'Tara',
    tripNettoSite: 'Netto site',
    tripNetto: 'Netto',
    tripDev: 'dev',

    // Coal quality
    coalClean: 'Clean',
    coalCleanSub: 'Bersih',
    coalRaw: 'Raw',
    coalRawSub: 'Mentah',

    // Weather
    weatherCerah: 'Cerah',
    weatherBerawan: 'Berawan',
    weatherHujan: 'Hujan',

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
    cp1NoLambung: 'No. Lambung Truk',
    cp1JettyDest: 'Tujuan Jetty',
    cp1CoalQuality: 'Kualitas Batubara',
    cp1Weather: 'Cuaca',
    cp1TareLabel: 'Berat Kosong',
    cp1TareHint: 'Tara - kg',
    cp1TareError: 'Berat tara harus lebih dari 0 kg.',
    cp1Submit: 'Catat Jam Masuk',
    cp1BannerTitle: 'Jam Masuk tercatat',

    // CP2 Form
    cp2BannerTitle: 'Jam Keluar tercatat',
    cp2Done: 'Selesai',
    cp2SearchPlaceholder: 'Cari no. lambung',
    cp2DetailTitle: 'Detail Trip',
    cp2TareSiteLabel: 'Tara Site',
    cp2JamMasukLabel: 'Jam Masuk',
    cp2GrossLabel: 'Berat Isi',
    cp2GrossHint: 'Bruto - kg',
    cp2GrossError: 'Berat bruto harus lebih dari 0 kg.',
    cp2NettoLabel: 'Netto Muatan',
    cp2Cancel: 'Batal',
    cp2Submit: 'Jam Keluar',
    cp2PickPrompt: 'Pilih truk yang akan keluar',
    cp2WaitingTitle: 'Menunggu Keluar',
    cp2WaitingSub: 'truk di stockpile',

    // Today list
    todaySub: 'truk - diperbarui tiap 30 dtk',
    todayCta: 'Catat keluar',

    // Barge panel
    bargeBannerTitle: 'Loading barge tercatat',
    bargeAddSection: 'Tambah Loading Barge',
    bargePickJetty: 'Pilih jetty…',
    bargeLoadingDate: 'Tanggal Loading',
    bargeQtyError: 'Qty harus lebih dari 0 kg.',
    bargeTotal: 'Total',

    // CP3 form
    cp3BannerTitle: 'Timbang jetty selesai',
    cp3Done: 'Selesai',
    cp3SearchPlaceholder: 'Cari no. lambung',
    cp3CompletedSection: 'Trip selesai - ',
    cp3InTransitSection: 'Timbang ulang - ',
    cp3NettoJetty: 'Netto Jetty',
    cp3Deviasi: 'Deviasi',
    cp3GrossJetty: 'Gross Jetty',
    cp3JamMasukJetty: 'Jam Masuk Jetty',
    cp3Close: 'Tutup',
    cp3NettoSite: 'Netto Site',
    cp3GrossSite: 'Gross Site',
    cp3JamMasuk: 'Jam Masuk',
    cp3JamKeluar: 'Jam Keluar',
    cp3GrossLabel: 'Berat Isi di',
    cp3GrossHint: 'Bruto - kg',
    cp3GrossError: 'Berat bruto jetty harus lebih dari 0 kg.',
    cp3DeviasVsSite: 'Deviasi vs site',
    cp3CompareGross: 'Compare Gross',
    cp3Cancel: 'Batal',
    cp3Submit: 'Selesai',
    cp3QueueSection: 'Truk dalam perjalanan ke jetty',
    cp3QueueTitle: 'Antrian Timbang',
    cp3QueueSub: 'truk menuju jetty',
    cp3Weigh: 'Timbang',
    cp3TripsSub: 'truk -',
    cp3TripsInTransit: 'perjalanan',

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
    monitoringDeviationTitle: 'Deviasi > 0.5%',
    monitoringSLATitle: 'SLA Transit > 4 jam (CP2→CP3)',
    monitoringNoData: 'Tidak ada pelanggaran.',
    monitoringNoJettyData: 'Belum ada data jetty (CP3). Akan terisi saat pengiriman selesai dicatat di jetty.',
    monitoringPrint: 'Print',
    monitoringExcel: 'Excel',
    monitoringPeriod: 'Periode',
    monitoringDari: 'dari',
    monitoringTruck: 'Truk',
    monitoringNettoSite: 'Netto Site',
    monitoringNettoJetty: 'Netto Jetty',
    monitoringDevLabel: 'Deviasi',
    monitoringKeluar: 'Keluar Site',
    monitoringTiba: 'Tiba Jetty',
    monitoringDuration: 'Durasi',
    monitoringJam: 'jam',
    monitoringEligible: 'pengiriman dengan data jetty',

    // Truck history
    truckHistoryTitle: 'Riwayat Truk',
    truckHistoryPlaceholder: 'No. lambung truk',
    truckHistorySearch: 'Cari',
    truckHistoryEmpty: 'Tidak ada riwayat untuk truk ini',
    truckHistoryPrompt: 'Masukkan nomor lambung untuk melihat riwayat',
    truckHistoryDate: 'Tanggal',
    truckHistoryJetty: 'Jetty',
    truckHistoryDeviasi: 'Deviasi',

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
    colCP1: '进入时间',
    colGrossJetty: '码头毛重',
    colNettoJetty: '码头净重',
    colCompGross: '毛重对比',
    colDeviasi: '偏差',
    colAdjustment: '调整',
    colCP2: '离开时间',
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

    // Trip row meta
    tripTara: '皮重',
    tripNettoSite: '现场净重',
    tripNetto: '净重',
    tripDev: '偏差',

    // Coal quality
    coalClean: '精煤',
    coalCleanSub: '精煤',
    coalRaw: '原煤',
    coalRawSub: '原煤',

    // Weather
    weatherCerah: '晴天',
    weatherBerawan: '多云',
    weatherHujan: '雨天',

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
    cp1TareLabel: '皮重',
    cp1TareHint: '皮重 - kg',
    cp1TareError: '皮重必须大于 0 kg',
    cp1Submit: '记录进场时间',
    cp1Success: '车辆已记录进场',
    cp1BannerTitle: '进场时间已记录',
    cp1NoLambung: '车辆编号',

    // CP2 Form
    cp2Title: '记录出场',
    cp2GrossSite: '毛重 (kg)',
    cp2Submit: '记录出场时间',
    cp2Success: '车辆已记录出场',
    cp2BannerTitle: '出场时间已记录',
    cp2Done: '完成',
    cp2SearchPlaceholder: '搜索车辆编号',
    cp2DetailTitle: '行程详情',
    cp2TareSiteLabel: '皮重',
    cp2JamMasukLabel: '进场时间',
    cp2GrossLabel: '载重',
    cp2GrossHint: '毛重 - kg',
    cp2GrossError: '毛重必须大于 0 kg',
    cp2NettoLabel: '净重',
    cp2Cancel: '取消',
    cp2PickPrompt: '选择要出场的车辆',
    cp2WaitingTitle: '等待出场',
    cp2WaitingSub: '辆车在现场',

    // Today list
    todaySub: '辆 - 每30秒刷新',
    todayCta: '记录出场',

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
    bargeBannerTitle: '驳船装载已记录',
    bargeAddSection: '添加驳船装载',
    bargePickJetty: '选择码头…',
    bargeLoadingDate: '装载日期',
    bargeName: '驳船名称',
    tugBoat: '拖轮名称',
    loadingDate: '装载日期',
    loadingQty: '装载量',
    bargeQtyError: '装载量必须大于 0 kg',
    bargeSubmit: '保存',
    bargeHistory: '装载历史',
    bargeEmpty: '暂无装载数据',
    bargeTotal: '合计',

    // CP3 form
    cp3BannerTitle: '码头称重完成',
    cp3Done: '完成',
    cp3SearchPlaceholder: '搜索车辆编号',
    cp3CompletedSection: '行程完成 - ',
    cp3InTransitSection: '称重 - ',
    cp3NettoJetty: '码头净重',
    cp3Deviasi: '偏差',
    cp3GrossJetty: '码头毛重',
    cp3JamMasukJetty: '到港时间',
    cp3Close: '关闭',
    cp3NettoSite: '现场净重',
    cp3GrossSite: '现场毛重',
    cp3JamMasuk: '进场时间',
    cp3JamKeluar: '出场时间',
    cp3GrossLabel: '码头载重',
    cp3GrossHint: '毛重 - kg',
    cp3GrossError: '码头毛重必须大于 0 kg',
    cp3DeviasVsSite: '与现场偏差',
    cp3CompareGross: '毛重对比',
    cp3Cancel: '取消',
    cp3Submit: '完成',
    cp3QueueSection: '前往码头的车辆',
    cp3QueueTitle: '称重队列',
    cp3QueueSub: '辆车前往码头',
    cp3Weigh: '称重',
    cp3TripsSub: '辆 -',
    cp3TripsInTransit: '辆运输中',

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
    monitoringDeviationTitle: '偏差 > 0.5%',
    monitoringSLATitle: 'SLA 运输 > 4小时 (CP2→CP3)',
    monitoringNoData: '无违规记录。',
    monitoringNoJettyData: '暂无码头数据 (CP3)。将在码头完成称重后显示。',
    monitoringPrint: '打印',
    monitoringExcel: 'Excel',
    monitoringPeriod: '期间',
    monitoringDari: '/',
    monitoringTruck: '车辆',
    monitoringNettoSite: '现场净重',
    monitoringNettoJetty: '码头净重',
    monitoringDevLabel: '偏差',
    monitoringKeluar: '离场时间',
    monitoringTiba: '到港时间',
    monitoringDuration: '时长',
    monitoringJam: '小时',
    monitoringEligible: '条有码头数据的记录',

    // Truck history
    truckHistoryTitle: '车辆历史',
    truckHistoryPlaceholder: '车辆编号',
    truckHistorySearch: '搜索',
    truckHistoryEmpty: '该车辆暂无历史记录',
    truckHistoryPrompt: '请输入车辆编号查看历史',
    truckHistoryDate: '日期',
    truckHistoryJetty: '码头',
    truckHistoryDeviasi: '偏差',

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
