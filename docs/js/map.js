import { CONFIG } from './config.js';

// 地図管理クラス
export class MapManager {
    constructor() {
        this.map = null;
        this.markersLayer = null;
        this.routesLayer = null;
    }
    
    // 地図初期化
    init() {
        this.map = L.map('map').setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
        
        L.tileLayer(CONFIG.MAP.TILE_URL, {
            attribution: CONFIG.MAP.ATTRIBUTION
        }).addTo(this.map);
        
        this.markersLayer = L.layerGroup().addTo(this.map);
        this.routesLayer = L.layerGroup().addTo(this.map);
        
        return this.map;
    }
    
    // レイヤーをクリア
    clearLayers() {
        this.markersLayer.clearLayers();
        this.routesLayer.clearLayers();
    }
    
    // マーカーレイヤーを取得
    getMarkersLayer() {
        return this.markersLayer;
    }
    
    // ルートレイヤーを取得
    getRoutesLayer() {
        return this.routesLayer;
    }
    
    // 地図インスタンスを取得
    getMap() {
        return this.map;
    }
    
    // ビューを設定
    setView(center, zoom = CONFIG.MAP.DEFAULT_ZOOM) {
        this.map.setView(center, zoom);
    }
    
    // 境界に合わせてズーム
    fitBounds(bounds, padding = CONFIG.MAP.BOUNDS_PADDING) {
        this.map.fitBounds(bounds, { padding });
    }
    
    // ポップアップを開く
    openPopup(latLng, content) {
        return L.popup()
            .setLatLng(latLng)
            .setContent(content)
            .openOn(this.map);
    }
    
    // コントロールを追加
    addControl(control) {
        control.addTo(this.map);
        return control;
    }
    
    // コントロールを削除
    removeControl(control) {
        this.map.removeControl(control);
    }
}