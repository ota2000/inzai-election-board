import { CONFIG } from './config.js';
import { getStatusDisplayName, getStatusColor } from './utils.js';

// ルート管理クラス（ポイントのみシステム用に簡略化）
export class RouteManager {
    constructor(mapManager, googleMapsManager) {
        this.mapManager = mapManager;
        this.googleMapsManager = googleMapsManager;
        this.allData = null;
        this.currentDistrict = null;
    }
    
    // データを設定
    setData(data) {
        this.allData = data;
    }
    
    // 現在の投票区を設定
    setCurrentDistrict(district) {
        this.currentDistrict = district;
    }
    
    // 簡略化されたポイント取得（ルートセグメントなし）
    getPointOnRoute(from, to) {
        // ポイントのみシステムでは中点を返す
        return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    }
    
    // ルートセグメント表示は削除（ポイントのみシステム）
    displayRouteSegments() {
        // ポイントのみシステムではルートセグメントを表示しない
        console.log('ポイントのみシステムのためルートセグメントは表示しません');
    }
    
    // 巡回順序リストを更新
    updateRouteList(points) {
        const routeList = document.getElementById('routeList');
        if (!routeList || !points || points.length === 0) return;
        
        routeList.innerHTML = '';
        
        // 順序でソート
        const sortedPoints = points.sort((a, b) => a.properties.order - b.properties.order);
        
        // 各地点を表示
        sortedPoints.forEach((point, index) => {
            const routeItem = document.createElement('div');
            routeItem.className = 'route-item';
            
            const boardNumber = point.properties.board_number ? `【${point.properties.board_number}】` : '';
            const status = point.properties.status || 'unknown';
            const statusDisplay = getStatusDisplayName(status);
            const statusColor = getStatusColor(status);
            
            routeItem.innerHTML = `
                <div class="route-number">${point.properties.order}</div>
                <div class="route-details">
                    <div class="route-item-header">
                        <div class="route-name">${boardNumber}${point.properties.name}</div>
                        <span class="status-badge" style="background-color: ${statusColor};">
                            ${statusDisplay}
                        </span>
                    </div>
                    <div class="route-address">
                        ${point.properties.address}
                    </div>
                </div>
            `;
            
            // 掲示板項目全体をクリック可能にしてマップにフォーカス
            routeItem.style.cursor = 'pointer';
            routeItem.onclick = () => {
                this.focusOnPoint(point);
            };
            
            routeList.appendChild(routeItem);
            
            // 次の地点とのGoogle Maps リンクを表示
            if (index < sortedPoints.length - 1) {
                const nextPoint = sortedPoints[index + 1];
                const fromLat = point.geometry.coordinates[1];
                const fromLng = point.geometry.coordinates[0];
                const toLat = nextPoint.geometry.coordinates[1];
                const toLng = nextPoint.geometry.coordinates[0];
                
                // Google Maps 経路検索URL
                const googleMapsUrl = `https://www.google.com/maps/dir/${fromLat},${fromLng}/${toLat},${toLng}`;
                
                // Google Maps リンクアイテムを作成
                const routeItem = document.createElement('div');
                routeItem.className = 'route-segment-item';
                routeItem.innerHTML = `
                    <div class="route-segment-arrow">↓</div>
                    <div class="route-segment-details">
                        <a href="${googleMapsUrl}" target="_blank" class="google-maps-link" 
                           style="color: #1976d2; font-size: 0.9rem; text-decoration: none; padding: 4px 8px; border-radius: 4px; background: #f8f9fa; border: 1px solid #e9ecef; display: inline-block;">
                            📍 Google Maps で経路確認
                        </a>
                    </div>
                `;
                
                routeList.appendChild(routeItem);
            }
        });
    }
    
    // 特定の地点にフォーカス
    focusOnPoint(point) {
        // 地点の座標を取得
        const coord = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
        
        // 地図をその地点にズーム
        this.mapManager.setView(coord, CONFIG.MAP.DETAIL_ZOOM);
        
        // 掲示板情報のポップアップを作成
        const boardNumber = point.properties.board_number ? `【${point.properties.board_number}】` : '';
        const status = point.properties.status || 'unknown';
        const statusText = {
            'done': '✅ 完了',
            'not_yet': '⏳ 未完了',
            'reserved': '📅 予約済み',
            'error_wrong_place': '❌ 設置場所間違い',
            'error_damaged': '❌ 破損',
            'error_wrong_poster': '❌ ポスター間違い',
            'other': '❓ その他',
            'unknown': '❓ 不明'
        }[status] || '❓ 不明';
        
        const popupContent = `
            <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                <div style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem;">
                    ${point.properties.order}. ${boardNumber}${point.properties.name}
                </div>
                <div style="margin-bottom: 0.5rem; color: #555;">
                    状態: ${statusText}
                </div>
                <div class="clickable-address" 
                     style="color: #666; font-size: 0.9rem; cursor: pointer; padding: 0.25rem; border-radius: 4px; background: #f8f9fa; border: 1px solid #e9ecef;"
                     onclick="window.appUtils.copyToClipboard('${point.properties.address}')" 
                     title="クリックでコピー">
                     📍 ${point.properties.address}
                </div>
            </div>
        `;
        
        this.mapManager.openPopup(coord, popupContent);
        
        // マップコンテナにフォーカスを当てる
        setTimeout(() => {
            document.getElementById('map').focus();
            document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, CONFIG.UI.SCROLL_DELAY);
    }
}