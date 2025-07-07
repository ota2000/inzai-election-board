import { CONFIG } from './config.js';

// 地図管理クラス
export class MapManager {
    constructor() {
        this.map = null;
        this.markersLayer = null;
        this.routesLayer = null;
        this.currentLocationMarker = null;
        this.watchPositionId = null;
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
    
    // 現在地を表示
    showCurrentLocation() {
        if (!navigator.geolocation) {
            alert('お使いのブラウザは位置情報をサポートしていません。');
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                this.updateCurrentLocationMarker(lat, lng, accuracy);
                this.map.setView([lat, lng], CONFIG.MAP.DETAIL_ZOOM);
            },
            (error) => {
                console.error('位置情報の取得に失敗しました:', error);
                let message = '位置情報の取得に失敗しました。';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message = '位置情報へのアクセスが拒否されました。';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = '位置情報が利用できません。';
                        break;
                    case error.TIMEOUT:
                        message = '位置情報の取得がタイムアウトしました。';
                        break;
                }
                alert(message);
            },
            options
        );
    }
    
    // 現在地の追跡を開始
    startLocationTracking() {
        if (!navigator.geolocation) {
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        };
        
        this.watchPositionId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                this.updateCurrentLocationMarker(lat, lng, accuracy);
            },
            (error) => {
                console.error('位置情報の追跡エラー:', error);
            },
            options
        );
    }
    
    // 現在地の追跡を停止
    stopLocationTracking() {
        if (this.watchPositionId) {
            navigator.geolocation.clearWatch(this.watchPositionId);
            this.watchPositionId = null;
        }
        
        if (this.currentLocationMarker) {
            this.markersLayer.removeLayer(this.currentLocationMarker);
            this.currentLocationMarker = null;
        }
    }
    
    // 現在地マーカーを更新
    updateCurrentLocationMarker(lat, lng, accuracy) {
        // 既存のマーカーを削除
        if (this.currentLocationMarker) {
            this.markersLayer.removeLayer(this.currentLocationMarker);
        }
        
        // 精度円を含むマーカーを作成
        const locationIcon = L.divIcon({
            html: `
                <div style="
                    width: 20px; 
                    height: 20px; 
                    background: #007bff; 
                    border: 3px solid white; 
                    border-radius: 50%; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    position: relative;
                    z-index: 1000;
                "></div>
            `,
            className: 'current-location-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        this.currentLocationMarker = L.marker([lat, lng], { 
            icon: locationIcon,
            zIndexOffset: 1000
        }).addTo(this.markersLayer);
        
        // 精度円を追加（精度が100m以下の場合のみ）
        if (accuracy <= 100) {
            L.circle([lat, lng], {
                radius: accuracy,
                color: '#007bff',
                fillColor: '#007bff',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(this.markersLayer);
        }
        
        this.currentLocationMarker.bindPopup(`
            <div style="text-align: center;">
                <strong>📍 現在地</strong><br>
                <small>精度: 約${Math.round(accuracy)}m</small>
            </div>
        `);
    }
}