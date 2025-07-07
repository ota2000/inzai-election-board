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
        
        // 現在地ボタンを追加
        this.addLocationControl();
        
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
    
    // 現在地コントロールを追加
    addLocationControl() {
        const locationControl = L.control({ position: 'topright' });
        
        locationControl.onAdd = (map) => {
            const container = L.DomUtil.create('div', 'location-control');
            container.innerHTML = `
                <button class="location-btn" title="現在地を表示">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                </button>
            `;
            
            // スタイルを設定
            container.style.cssText = `
                background: none;
                border: none;
            `;
            
            const button = container.querySelector('.location-btn');
            button.style.cssText = `
                width: 34px;
                height: 34px;
                background: white;
                border: 2px solid rgba(0,0,0,0.2);
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
                box-shadow: 0 1px 5px rgba(0,0,0,0.4);
                transition: all 0.2s ease;
            `;
            
            // ホバー効果
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#f4f4f4';
                button.style.color = '#333';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = 'white';
                button.style.color = '#666';
            });
            
            // クリックイベント
            button.addEventListener('click', (e) => {
                L.DomEvent.stopPropagation(e);
                this.showCurrentLocation();
            });
            
            // イベント伝播を停止
            L.DomEvent.disableClickPropagation(container);
            
            return container;
        };
        
        locationControl.addTo(this.map);
        return locationControl;
    }
}