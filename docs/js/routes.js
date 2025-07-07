import { CONFIG } from './config.js';
import { calculateSegmentDistances, formatTime } from './utils.js';

// ルート管理クラス
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
    
    // ルートセグメント上の実際の点を取得
    getPointOnRoute(from, to, fromOrder, toOrder) {
        if (!this.allData || !this.currentDistrict) {
            console.log('データまたは投票区が設定されていません');
            return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
        }
        
        // 現在表示中の投票区のルートセグメントから対応するセグメントを探す
        const routeSegments = this.allData.features.filter(f => 
            f.properties.district === this.currentDistrict && 
            f.properties.type === 'route_segment'
        );
        
        console.log(`探しているセグメント: ${fromOrder} -> ${toOrder}, 利用可能セグメント:`, routeSegments.map(s => `${s.properties.from_point}->${s.properties.to_point}`));
        
        // 該当するセグメントを探す（順序に基づいて）
        const segment = routeSegments.find(seg => {
            return (seg.properties.from_point === fromOrder && seg.properties.to_point === toOrder) ||
                   (seg.properties.from_point === toOrder && seg.properties.to_point === fromOrder);
        });
        
        if (segment && segment.geometry && segment.geometry.coordinates && segment.geometry.coordinates.length > 0) {
            // セグメントの中央付近の点を取得
            const coords = segment.geometry.coordinates;
            const midIndex = Math.floor(coords.length / 2);
            const routePoint = [coords[midIndex][1], coords[midIndex][0]]; // [lat, lng]形式
            console.log('ルートセグメント上の点を使用:', routePoint);
            return routePoint;
        }
        
        // セグメントが見つからない場合は中間点を返す
        const fallbackPoint = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
        console.log('セグメントが見つからないため中間点を使用:', fallbackPoint);
        return fallbackPoint;
    }
    
    // ルートセグメントを表示
    displayRouteSegments(districtName) {
        if (!this.allData) return;
        
        const routesLayer = this.mapManager.getRoutesLayer();
        const districtRouteSegments = this.allData.features.filter(f =>
            f.properties.district === districtName && f.properties.type === 'route_segment'
        );
        
        // 詳細ルートセグメントを表示
        if (districtRouteSegments.length > 0) {
            const districtPoints = this.allData.features.filter(f =>
                f.properties.district === districtName && f.geometry.type === 'Point' && f.properties.type !== 'voting_office'
            );
            
            districtRouteSegments.forEach(segment => {
                const segmentCoords = segment.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                // 対応する地点を特定
                const fromPoint = districtPoints.find(p => p.properties.order === segment.properties.from_point);
                const toPoint = districtPoints.find(p => p.properties.order === segment.properties.to_point);
                
                if (!fromPoint || !toPoint) return;
                
                // セグメントの色を設定
                const segmentColor = CONFIG.COLORS.ROUTE_COLOR;
                
                // 掲示板番号を取得
                const fromBoardNumber = fromPoint.properties.board_number;
                const toBoardNumber = toPoint.properties.board_number;
                
                // 距離・時間計算
                let segmentDistance = '';
                let segmentTime = '';
                
                if (fromPoint && toPoint) {
                    const segmentDistances = calculateSegmentDistances([fromPoint, toPoint]);
                    if (segmentDistances.length > 0) {
                        segmentDistance = segmentDistances[0].distance;
                        const timeInMinutes = segmentDistances[0].time;
                        
                        // 時間を「X時間Y分」形式に変換
                        if (timeInMinutes >= 60) {
                            const hours = Math.floor(timeInMinutes / 60);
                            const minutes = timeInMinutes % 60;
                            if (minutes > 0) {
                                segmentTime = `${hours}時間${minutes}分`;
                            } else {
                                segmentTime = `${hours}時間`;
                            }
                        } else {
                            segmentTime = `${timeInMinutes}分`;
                        }
                    }
                }
                
                // 巡回順序（order）を使用して正しい表示順序を決定
                const fromOrder = fromPoint.properties.order;
                const toOrder = toPoint.properties.order;
                
                // orderの小さい方から大きい方への順序で表示
                const displayFromOrder = Math.min(fromOrder, toOrder);
                const displayToOrder = Math.max(fromOrder, toOrder);
                
                // 表示用の掲示板番号を取得
                const displayFromBoard = fromOrder < toOrder ? fromBoardNumber : toBoardNumber;
                const displayToBoard = fromOrder < toOrder ? toBoardNumber : fromBoardNumber;
                
                // 座標も正しい順序で
                const displayFromCoord = fromOrder < toOrder ? 
                    [fromPoint.geometry.coordinates[0], fromPoint.geometry.coordinates[1]] :
                    [toPoint.geometry.coordinates[0], toPoint.geometry.coordinates[1]];
                const displayToCoord = fromOrder < toOrder ? 
                    [toPoint.geometry.coordinates[0], toPoint.geometry.coordinates[1]] :
                    [fromPoint.geometry.coordinates[0], fromPoint.geometry.coordinates[1]];
                
                const polyline = L.polyline(segmentCoords, {
                    color: segmentColor,
                    weight: CONFIG.ROUTES.WEIGHT,
                    opacity: CONFIG.ROUTES.OPACITY,
                    lineCap: 'round',
                    lineJoin: 'round'
                }).bindPopup(
                    this.googleMapsManager.createSegmentPopupContent(
                        `${displayFromOrder}. ${displayFromBoard}`, `${displayToOrder}. ${displayToBoard}`, segmentDistance, segmentTime,
                        displayFromCoord, displayToCoord
                    )
                ).addTo(routesLayer);
                
                // セグメント識別用のプロパティを追加
                polyline.segmentId = `${segment.properties.from_point}-${segment.properties.to_point}`;
                polyline.fromPoint = segment.properties.from_point;
                polyline.toPoint = segment.properties.to_point;
                polyline.segmentNumber = segment.properties.segment;
                
                // ホバー効果
                polyline.on('mouseover', function() {
                    this.setStyle({ weight: CONFIG.ROUTES.HOVER_WEIGHT, opacity: CONFIG.ROUTES.HOVER_OPACITY });
                });
                polyline.on('mouseout', function() {
                    this.setStyle({ weight: CONFIG.ROUTES.WEIGHT, opacity: CONFIG.ROUTES.OPACITY });
                });
            });
            
            // ルート情報メッセージを表示
            this.showRouteInfoMessage();
            
        } else {
            // フォールバック：簡略ルート
            this.displaySimpleRoute(districtName);
        }
    }
    
    // 簡略ルートを表示
    displaySimpleRoute(districtName) {
        const routesLayer = this.mapManager.getRoutesLayer();
        const districtSimpleRoute = this.allData.features.find(f =>
            f.properties.district === districtName && f.properties.type === 'simple_route'
        );
        
        if (districtSimpleRoute) {
            const routeCoords = districtSimpleRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            L.polyline(routeCoords, {
                color: CONFIG.COLORS.ROUTE_COLOR,
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 5'
            }).addTo(routesLayer);
        }
    }
    
    // ルート情報メッセージを表示
    showRouteInfoMessage() {
        const routeInfo = L.control({ position: 'topright' });
        routeInfo.onAdd = function() {
            const div = L.DomUtil.create('div', 'route-info');
            div.style.cssText = 'background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); font-size: 0.8rem;';
            div.innerHTML = `
                <strong>詳細ルート表示中</strong><br>
                実際の道路に沿った経路
            `;
            return div;
        };
        
        const control = this.mapManager.addControl(routeInfo);
        
        // 指定時間後にメッセージを削除
        setTimeout(() => {
            this.mapManager.removeControl(control);
        }, CONFIG.UI.ROUTE_INFO_DURATION);
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
            
            routeItem.innerHTML = `
                <div class="route-number">${point.properties.order}</div>
                <div class="route-details">
                    <div class="route-name">${boardNumber}${point.properties.name}</div>
                    <div class="route-address clickable-address" onclick="window.appUtils.copyToClipboard('${point.properties.address}')" title="クリックでコピー">
                        📋 ${point.properties.address}
                    </div>
                </div>
            `;
            
            // 掲示板項目全体をクリック可能にしてマップにフォーカス
            routeItem.style.cursor = 'pointer';
            routeItem.onclick = (e) => {
                // アドレス部分のクリックは除外（コピー機能を優先）
                if (e.target.classList.contains('clickable-address')) {
                    return;
                }
                this.focusOnPoint(point);
            };
            
            routeList.appendChild(routeItem);
            
            // 次の地点との間にセグメント情報を表示
            if (index < sortedPoints.length - 1) {
                const nextPoint = sortedPoints[index + 1];
                const distances = calculateSegmentDistances([point, nextPoint]);
                
                if (distances.length > 0) {
                    const dist = distances[0].distance;
                    const timeInMinutes = distances[0].time;
                    const timeDisplay = timeInMinutes >= 60 ? 
                        formatTime(timeInMinutes / 60) : `${timeInMinutes}分`;
                    
                    // ルート情報アイテムを作成
                    const routeItem = document.createElement('div');
                    routeItem.className = 'route-segment-item';
                    routeItem.innerHTML = `
                        <div class="route-segment-arrow">↓</div>
                        <div class="route-segment-details">
                            <div class="route-segment-stats">
                                ${dist}km • ${timeDisplay}
                            </div>
                        </div>
                    `;
                    
                    // ルート情報クリックで地図にフォーカス
                    routeItem.onclick = () => {
                        this.focusOnSegment(point, nextPoint, dist, timeDisplay);
                    };
                    
                    routeList.appendChild(routeItem);
                }
            }
        });
    }
    
    // セグメントにフォーカス
    focusOnSegment(point, nextPoint, dist, timeDisplay) {
        // 2つの地点の座標を取得
        const coord1 = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
        const coord2 = [nextPoint.geometry.coordinates[1], nextPoint.geometry.coordinates[0]];
        
        // ルートセグメント上の実際の点を取得
        const routePoint = this.getPointOnRoute(coord1, coord2, point.properties.order, nextPoint.properties.order);
        
        this.mapManager.setView(routePoint, CONFIG.MAP.SEGMENT_ZOOM);
        
        // 巡回順序（order）に基づく動的なポップアップ作成
        const fromOrder = point.properties.order;
        const toOrder = nextPoint.properties.order;
        const fromBoardNumber = point.properties.board_number;
        const toBoardNumber = nextPoint.properties.board_number;
        
        // 動的にポップアップを作成して表示
        const content = this.googleMapsManager.createSegmentPopupContent(
            `${fromOrder}. ${fromBoardNumber}`, `${toOrder}. ${toBoardNumber}`, dist, timeDisplay,
            [point.geometry.coordinates[0], point.geometry.coordinates[1]],
            [nextPoint.geometry.coordinates[0], nextPoint.geometry.coordinates[1]]
        );
        
        this.mapManager.openPopup(routePoint, content);
        
        // マップコンテナにフォーカスを当てる
        setTimeout(() => {
            document.getElementById('map').focus();
            document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, CONFIG.UI.SCROLL_DELAY);
    }
    
    // 特定の地点にフォーカス
    focusOnPoint(point) {
        // 地点の座標を取得
        const coord = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
        
        // 地図をその地点にズーム
        this.mapManager.setView(coord, CONFIG.MAP.DETAIL_ZOOM);
        
        // 掲示板情報のポップアップを作成
        const boardNumber = point.properties.board_number ? `【${point.properties.board_number}】` : '';
        const popupContent = `
            <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                <div style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem;">
                    ${point.properties.order}. ${boardNumber}${point.properties.name}
                </div>
                <div class="clickable-address" 
                     style="color: #666; font-size: 0.9rem; cursor: pointer; padding: 0.25rem; border-radius: 4px; background: #f8f9fa; border: 1px solid #e9ecef;"
                     onclick="window.appUtils.copyToClipboard('${point.properties.address}')" 
                     title="クリックでコピー">
                    📋 ${point.properties.address}
                </div>
            </div>
        `;
        
        this.mapManager.openPopup(coord, popupContent);
        
        // マップコンテナにフォーカスを当てる（ルートセグメントと統一）
        setTimeout(() => {
            document.getElementById('map').focus();
            document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, CONFIG.UI.SCROLL_DELAY);
    }
}