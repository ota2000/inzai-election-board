// アプリケーション設定
export const CONFIG = {
    // 地図設定
    MAP: {
        DEFAULT_CENTER: [35.8327, 140.1451],  // 印西市中心部
        DEFAULT_ZOOM: 13,
        DETAIL_ZOOM: 16,
        SEGMENT_ZOOM: 15,
        TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '© OpenStreetMap contributors',
        BOUNDS_PADDING: [50, 50]
    },
    
    // マーカー設定
    MARKERS: {
        NORMAL_RADIUS: 8,
        START_RADIUS: 10,
        DISTRICT_RADIUS: 12,
        VOTING_OFFICE_SIZE: 40,
        WEIGHT: 2,
        OPACITY: 0.8
    },
    
    // ルート設定
    ROUTES: {
        WEIGHT: 6,
        HOVER_WEIGHT: 8,
        OPACITY: 0.9,
        HOVER_OPACITY: 1
    },
    
    // 色設定
    COLORS: {
        START_POINT: '#FF4757',
        NORMAL_POINT: '#667eea',
        ROUTE_COLOR: '#667eea',
        WHITE: 'white',
        GOOGLE_MAPS_BTN: '#4285f4',
        DISTRICT_COLORS: [
            '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
            '#3730a3', '#4338ca', '#4f46e5', '#6366f1', '#7c3aed',
            '#8b5cf6', '#9333ea', '#a855f7', '#b91c1c', '#dc2626',
            '#ef4444', '#f87171', '#fb7185', '#f43f5e', '#e11d48',
            '#be123c', '#9f1239', '#881337'
        ]
    },
    
    // UI設定
    UI: {
        POPUP_MIN_WIDTH: '200px',
        COPY_FEEDBACK_DURATION: 2000,
        ROUTE_INFO_DURATION: 5000,
        SCROLL_DELAY: 100,
        WALKING_SPEED_KMH: 4
    },
    
    // データ設定
    DATA: {
        GEOJSON_PATH: './data/poster_board_routes.geojson'
    }
};