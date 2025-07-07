import { CONFIG } from './config.js';

// Google Maps管理クラス
export class GoogleMapsManager {
    constructor() {
        this.buttonElement = null;
    }
    
    // GoogleマップでルートURLを生成
    generateRouteUrl(points) {
        const sortedPoints = points.sort((a, b) => a.properties.order - b.properties.order);
        
        if (sortedPoints.length === 0) return null;
        
        // 開始地点
        const origin = `${sortedPoints[0].geometry.coordinates[1]},${sortedPoints[0].geometry.coordinates[0]}`;
        
        // 終了地点
        const destination = `${sortedPoints[sortedPoints.length - 1].geometry.coordinates[1]},${sortedPoints[sortedPoints.length - 1].geometry.coordinates[0]}`;
        
        // 経由地点（最初と最後を除く）
        const waypoints = sortedPoints.slice(1, -1).map(point => 
            `${point.geometry.coordinates[1]},${point.geometry.coordinates[0]}`
        ).join('|');
        
        // Google Maps URL を構築
        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
        
        if (waypoints) {
            url += `&waypoints=${waypoints}`;
        }
        
        return url;
    }
    
    // セグメント間の単一ルート用GoogleマップURL生成
    generateSegmentUrl(fromCoord, toCoord) {
        const origin = `${fromCoord[1]},${fromCoord[0]}`;
        const destination = `${toCoord[1]},${toCoord[0]}`;
        
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
    }
    
    // Googleマップで開く
    openRoute(points) {
        const url = this.generateRouteUrl(points);
        if (url) {
            window.open(url, '_blank');
        } else {
            alert('ルート情報が不足しています。');
        }
    }
    
    // セグメント間のルートをGoogleマップで開く
    openSegment(fromCoord, toCoord) {
        const url = this.generateSegmentUrl(fromCoord, toCoord);
        if (url) {
            window.open(url, '_blank');
        } else {
            alert('ルート情報が不足しています。');
        }
    }
    
    // Googleマップボタンを表示
    showButton(points) {
        let googleMapsBtn = document.getElementById('googleMapsBtn');
        
        if (!googleMapsBtn) {
            // ボタンが存在しない場合は作成
            googleMapsBtn = document.createElement('button');
            googleMapsBtn.id = 'googleMapsBtn';
            googleMapsBtn.className = 'btn google-maps-btn';
            googleMapsBtn.innerHTML = '📍 Googleマップで表示';
            
            // マップコンテナの下に追加
            const mapContainer = document.querySelector('.map-container');
            mapContainer.insertAdjacentElement('afterend', googleMapsBtn);
            this.buttonElement = googleMapsBtn;
        }
        
        // クリックイベントを設定
        googleMapsBtn.onclick = () => this.openRoute(points);
        googleMapsBtn.style.display = 'block';
    }
    
    // Googleマップボタンを非表示
    hideButton() {
        const googleMapsBtn = document.getElementById('googleMapsBtn');
        if (googleMapsBtn) {
            googleMapsBtn.style.display = 'none';
        }
    }
    
    // セグメント用のポップアップコンテンツを生成
    createSegmentPopupContent(fromBoardNumber, toBoardNumber, distance, time, fromCoord, toCoord) {
        return `
            <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                <strong>${fromBoardNumber} → ${toBoardNumber}</strong><br>
                <div style="margin: 0.5rem 0; font-size: 0.9rem;">
                    距離: ${distance}km<br>
                    時間: ${time}
                </div>
                <button onclick="window.googleMapsManager.openSegment([${fromCoord[0]}, ${fromCoord[1]}], [${toCoord[0]}, ${toCoord[1]}])" 
                        style="background: ${CONFIG.COLORS.GOOGLE_MAPS_BTN}; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; margin-top: 0.5rem;">
                    📍 Googleマップで開く
                </button>
            </div>
        `;
    }
}