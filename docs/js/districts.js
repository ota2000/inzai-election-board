import { CONFIG } from './config.js';
import { getStatusDisplayName, getStatusColor } from './utils.js';

// 投票区管理クラス
export class DistrictManager {
    constructor(mapManager, routeManager, googleMapsManager) {
        this.mapManager = mapManager;
        this.routeManager = routeManager;
        this.googleMapsManager = googleMapsManager;
        this.allData = null;
        this.currentDistrict = null;
    }
    
    // データを設定
    setData(data) {
        this.allData = data;
        this.routeManager.setData(data);
        this.updateLastUpdatedTime(data);
    }
    
    // 最終更新日時を更新
    updateLastUpdatedTime(data) {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement && data.metadata && data.metadata.last_updated) {
            const updateDate = new Date(data.metadata.last_updated);
            const formatOptions = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Tokyo'
            };
            const formattedDate = updateDate.toLocaleDateString('ja-JP', formatOptions);
            
            const totalBoards = data.metadata.total_optimization_points + data.metadata.total_completed_points;
            const completionRate = ((data.metadata.total_completed_points / totalBoards) * 100).toFixed(1);
            
            lastUpdatedElement.innerHTML = `
                <span>データ更新: ${formattedDate} | 完了率: ${completionRate}% (${data.metadata.total_completed_points}/${totalBoards})</span>
            `;
        }
    }
    
    // 投票区検索機能
    filterDistricts() {
        const searchInput = document.getElementById('districtSearch');
        const searchText = searchInput.value.toLowerCase();
        const districtBtns = document.querySelectorAll('.district-btn');
        
        districtBtns.forEach(btn => {
            const districtName = btn.dataset.district || '';
            const districtNumber = btn.dataset.number || '';
            const textContent = btn.textContent.toLowerCase();
            
            if (districtName.toLowerCase().includes(searchText) || 
                districtNumber.includes(searchText) ||
                textContent.includes(searchText)) {
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }
        });
    }
    
    // 投票区セレクター設定
    setupDistrictSelector() {
        if (!this.allData) return;
        
        // 投票区と対応する投票区番号を取得
        const districtMap = new Map();
        this.allData.features
            .filter(f => f.geometry.type === 'Point')
            .forEach(f => {
                const district = f.properties.district;
                const districtNumber = f.properties.district_number;
                if (!districtMap.has(district)) {
                    districtMap.set(district, districtNumber);
                }
            });
        
        // 投票区番号順にソート
        const districts = Array.from(districtMap.entries()).sort((a, b) => {
            // district_numberが数値の場合はそれを使用、文字列の場合は抽出
            const numA = typeof a[1] === 'number' ? a[1] : parseInt(a[1].replace('第', '').replace('投票区', '')) || 0;
            const numB = typeof b[1] === 'number' ? b[1] : parseInt(b[1].replace('第', '').replace('投票区', '')) || 0;
            return numA - numB;
        });
        
        const selector = document.getElementById('districtSelector');
        selector.innerHTML = '';
        
        districts.forEach(([district, districtNumber]) => {
            // 投票区の完了状況を計算
            const districtProgress = this.calculateDistrictProgress(district);
            
            const btn = document.createElement('div');
            btn.className = 'district-btn';
            
            // 完了状況に応じてクラスを追加
            if (districtProgress.isFullyCompleted) {
                btn.classList.add('district-btn-completed');
            }
            
            // 投票区番号を表示（数値または文字列から番号を抽出）
            const voteNumber = typeof districtNumber === 'number' ? districtNumber : districtNumber.replace('第', '').replace('投票区', '');
            
            // データ属性を設定（検索用）
            btn.dataset.district = district;
            btn.dataset.number = voteNumber;
            
            // 進捗情報を表示
            let progressText = '';
            if (districtProgress.isFullyCompleted) {
                progressText = `<div class="district-btn-progress completed">✓ 完了</div>`;
            } else if (districtProgress.totalBoards > 0) {
                progressText = `<div class="district-btn-progress">(${districtProgress.completedBoards}/${districtProgress.totalBoards})</div>`;
            }
            
            btn.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                    <div class="district-btn-number">${voteNumber}</div>
                    <div class="district-btn-name">${district}</div>
                </div>
                ${progressText}
            `;
            
            btn.onclick = () => this.showDistrict(district);
            selector.appendChild(btn);
        });
    }
    
    // 投票区の進捗状況を計算
    calculateDistrictProgress(districtName) {
        // 該当投票区の未完了地点
        const incompleteBoards = this.allData.features.filter(f =>
            f.properties.district === districtName && 
            f.geometry.type === 'Point' && 
            f.properties.type !== 'completed_board'
        );
        
        // 該当投票区の完了済み地点
        const completedBoards = this.allData.features.filter(f =>
            f.properties.district === districtName && 
            f.properties.type === 'completed_board'
        );
        
        const totalBoards = incompleteBoards.length + completedBoards.length;
        const isFullyCompleted = incompleteBoards.length === 0 && completedBoards.length > 0;
        
        return {
            totalBoards,
            completedBoards: completedBoards.length,
            incompleteBoards: incompleteBoards.length,
            isFullyCompleted
        };
    }
    
    // 特定投票区表示
    showDistrict(districtName) {
        this.currentDistrict = districtName;
        
        // 状態を保存
        if (window.app) {
            window.app.saveState(districtName);
        }
        this.routeManager.setCurrentDistrict(districtName);
        
        // ボタンの状態更新
        document.querySelectorAll('.district-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.district === districtName) {
                btn.classList.add('active');
            }
        });
        
        // 地図クリア
        this.mapManager.clearLayers();
        
        // 該当データをフィルタ（ポイントのみシステム）
        const districtPoints = this.allData.features.filter(f =>
            f.properties.district === districtName && f.geometry.type === 'Point' && 
            f.properties.type !== 'completed_board'
        );
        const donePoints = this.allData.features.filter(f =>
            f.properties.district === districtName && f.properties.type === 'completed_board'
        );
        
        // 未完了地点も完了地点もない場合のみreturn
        if (districtPoints.length === 0 && donePoints.length === 0) return;
        
        // ポイントマーカー追加
        this.addDistrictMarkers(districtPoints);
        
        // 完了済み地点マーカー追加
        if (donePoints.length > 0) {
            this.addCompletedBoardMarkers(donePoints);
        }
        
        // 他の投票区の代表地点を追加（全区表示と同じ形式）
        this.addOtherDistrictRepresentatives(districtName);
        
        // 地図の表示範囲を調整（ポイントのみ）
        this.fitDistrictBounds([...districtPoints, ...donePoints]);
        
        // UI状態の更新
        this.updateUIForDistrictSelection();
        
        // Google Mapsボタンを表示
        this.googleMapsManager.showButton(districtPoints);
        
        // 情報パネル更新（完了地点情報も含む）
        // 未完了地点がない場合は完了地点の情報を使用
        const referenceProperties = districtPoints.length > 0 ? 
            districtPoints[0].properties : 
            (donePoints.length > 0 ? donePoints[0].properties : null);
            
        if (referenceProperties) {
            this.updateInfoPanel(districtName, referenceProperties, donePoints);
        }
        
        // ルートリスト更新
        this.routeManager.updateRouteList(districtPoints);
        
        // UI状態の更新（完了済み投票区でも必要）
        if (districtPoints.length > 0) {
            // 未完了地点がある場合の通常処理
            this.updateUIForDistrictSelection();
        } else {
            // 完了済み投票区の場合はルートカードを非表示
            const routeCard = document.getElementById('routeCard');
            if (routeCard) {
                routeCard.style.display = 'none';
            }
        }
        
        // 完了地点の独立カードを非表示（統合表示に変更したため）
        this.hideCompletedCard();
    }
    
    // 投票区マーカーを追加
    addDistrictMarkers(districtPoints) {
        const markersLayer = this.mapManager.getMarkersLayer();
        
        districtPoints
            .sort((a, b) => a.properties.order - b.properties.order)
            .forEach((point) => {
                const coord = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
                
                const status = point.properties.status || 'unknown';
                const statusColor = getStatusColor(status);
                
                const marker = L.circleMarker(coord, {
                    radius: CONFIG.MARKERS.NORMAL_RADIUS,
                    fillColor: statusColor,
                    color: CONFIG.COLORS.WHITE,
                    weight: CONFIG.MARKERS.WEIGHT,
                    fillOpacity: CONFIG.MARKERS.OPACITY
                }).addTo(markersLayer);
                
                // 掲示板マーカーであることを示すプロパティを追加
                marker.boardOrder = point.properties.order;
                
                // ポップアップ（シンプル版）
                const boardNumber = point.properties.board_number ? `【${point.properties.board_number}】` : '';
                const statusDisplay = getStatusDisplayName(status);
                const popupContent = `
                    <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                        <div style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem;">
                            ${point.properties.order}. ${boardNumber}${point.properties.name}
                        </div>
                        <div style="margin-bottom: 0.5rem;">
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; color: white; background-color: ${statusColor};">
                                ${statusDisplay}
                            </span>
                        </div>
                        <div class="clickable-address" 
                             style="color: #666; font-size: 0.9rem; cursor: pointer; padding: 0.25rem; border-radius: 4px; background: #f8f9fa; border: 1px solid #e9ecef; display: flex; align-items: center; gap: 0.5rem;"
                             onclick="window.open('https://www.google.com/maps?q=${point.geometry.coordinates[1]},${point.geometry.coordinates[0]}', '_blank')" 
                             title="📍 Googleマップで開く">
                             <span style="font-size: 1rem;">📍</span>
                             <span>${point.properties.address}</span>
                        </div>
                    </div>
                `;
                marker.bindPopup(popupContent);
                
                // 番号表示（クリック可能）- サイズ統一
                const numberSize = 24; // 番号は少し大きめで視認性確保
                const numberIcon = L.divIcon({
                    html: `<div style="background: ${statusColor}; color: white; border-radius: 50%; width: ${numberSize}px; height: ${numberSize}px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${point.properties.order}</div>`,
                    className: 'custom-div-icon clickable',
                    iconSize: [numberSize, numberSize],
                    iconAnchor: [numberSize/2, numberSize/2]
                });
                
                const numberMarker = L.marker(coord, { icon: numberIcon }).addTo(markersLayer);
                
                // 番号マーカーにクリックイベントを追加
                numberMarker.on('click', () => {
                    // メインマーカーのポップアップを開く
                    marker.openPopup();
                    // 地図をその地点にズーム
                    this.mapManager.setView(coord, CONFIG.MAP.DETAIL_ZOOM);
                });
            });
    }
    
    // 他の投票区の代表地点を追加（現在選択中の投票区以外）
    addOtherDistrictRepresentatives(currentDistrictName) {
        const markersLayer = this.mapManager.getMarkersLayer();
        const districtCenters = new Map();
        const allBounds = [];
        
        // 全ての地点（未完了と完了済み両方）を含めて、現在の投票区以外を集計
        this.allData.features
            .filter(f => f.geometry.type === 'Point' && f.properties.district !== currentDistrictName)
            .forEach(point => {
                const district = point.properties.district;
                if (!districtCenters.has(district)) {
                    districtCenters.set(district, []);
                }
                districtCenters.get(district).push([
                    point.geometry.coordinates[1],
                    point.geometry.coordinates[0]
                ]);
            });
        
        // 各投票区の掲示板地点にマーカー配置（全区表示と同じ実装）
        Array.from(districtCenters.entries()).forEach(([district, coords], index) => {
            // 投票区の進捗状況を取得
            const districtProgress = this.calculateDistrictProgress(district);
            
            // 掲示板の中心点を計算
            const position = [
                coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length,
                coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
            ];
            
            // 境界計算用に位置を追加
            allBounds.push(position);
            
            // 完了状況に応じて色を決定
            const color = districtProgress.isFullyCompleted ? 
                '#27ae60' : // 緑色（完了）
                CONFIG.COLORS.DISTRICT_COLORS[index % CONFIG.COLORS.DISTRICT_COLORS.length];
            
            const marker = L.circleMarker(position, {
                radius: CONFIG.MARKERS.DISTRICT_RADIUS,
                fillColor: color,
                color: CONFIG.COLORS.WHITE,
                weight: CONFIG.MARKERS.WEIGHT,
                fillOpacity: CONFIG.MARKERS.OPACITY
            }).addTo(markersLayer);
            
            // 完了済み投票区の場合はチェックマークアイコンを追加（サイズ統一）
            if (districtProgress.isFullyCompleted) {
                const markerSize = CONFIG.MARKERS.DISTRICT_RADIUS * 2; // 12 * 2 = 24px（投票区は少し大きく）
                const checkIcon = L.divIcon({
                    html: `<div style="background: #22c55e; color: white; border-radius: 50%; width: ${markerSize}px; height: ${markerSize}px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">✓</div>`,
                    className: 'custom-div-icon clickable completed-district',
                    iconSize: [markerSize, markerSize],
                    iconAnchor: [markerSize/2, markerSize/2]
                });
                
                const checkMarker = L.marker(position, { icon: checkIcon }).addTo(markersLayer);
                
                // チェックマーカーにもクリックイベントを追加
                checkMarker.on('click', () => {
                    this.showDistrict(district);
                });
                
                // ポップアップも共有
                checkMarker.bindPopup(`
                    <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                        <h4>${district}</h4>
                        <p>地点数: ${districtProgress.totalBoards}地点</p>
                        <p>状況: <span style="color: #27ae60; font-weight: bold;">✓ 完了</span></p>
                        <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">クリックで詳細表示</div>
                    </div>
                `);
            }
            
            // マーカーのクリックイベントで直接投票区を表示
            marker.on('click', () => {
                this.showDistrict(district);
            });
            
            // 完了状況を含むポップアップ
            const statusText = districtProgress.isFullyCompleted ? 
                '✓ 完了' : 
                `完了${districtProgress.completedBoards}/${districtProgress.totalBoards}`;
            
            marker.bindPopup(`
                <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                    <h4>${district}</h4>
                    <p>地点数: ${districtProgress.totalBoards}地点</p>
                    <p>状況: <span style="color: ${districtProgress.isFullyCompleted ? '#27ae60' : '#e74c3c'}; font-weight: bold;">${statusText}</span></p>
                    <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">クリックで詳細表示</div>
                </div>
            `);
        });
    }
    
    // 完了済み掲示板マーカーを追加
    addCompletedBoardMarkers(completedPoints) {
        const markersLayer = this.mapManager.getMarkersLayer();
        
        completedPoints.forEach((point) => {
            const coord = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
            const status = point.properties.status || 'done';
            const statusColor = getStatusColor(status);
            
            // 完了済みマーカー（通常サイズに統一）
            const marker = L.circleMarker(coord, {
                radius: CONFIG.MARKERS.NORMAL_RADIUS,
                fillColor: statusColor,
                color: CONFIG.COLORS.WHITE,
                weight: CONFIG.MARKERS.WEIGHT,
                fillOpacity: CONFIG.MARKERS.OPACITY
            }).addTo(markersLayer);
            
            // ポップアップ
            const boardNumber = point.properties.board_number ? `【${point.properties.board_number}】` : '';
            const statusDisplay = getStatusDisplayName(status);
            const popupContent = `
                <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                    <div style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${boardNumber}${point.properties.name}
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; color: white; background-color: ${statusColor};">
                            ${statusDisplay}
                        </span>
                        <span style="margin-left: 8px; font-size: 0.8rem; color: #666;">
                            （巡回対象外）
                        </span>
                    </div>
                    <div class="clickable-address" 
                         style="color: #666; font-size: 0.9rem; cursor: pointer; padding: 0.25rem; border-radius: 4px; background: #f8f9fa; border: 1px solid #e9ecef; display: flex; align-items: center; gap: 0.5rem;"
                         onclick="window.open('https://www.google.com/maps?q=${point.geometry.coordinates[1]},${point.geometry.coordinates[0]}', '_blank')" 
                         title="📍 Googleマップで開く">
                         <span style="font-size: 1rem;">📍</span>
                         <span>${point.properties.address}</span>
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);
            
            // 完了マーク表示（番号マーカーと同じサイズに統一）
            const markerSize = 24; // 番号マーカーと同じサイズ
            const completedIcon = L.divIcon({
                html: `<div style="background: ${statusColor}; color: white; border-radius: 50%; width: ${markerSize}px; height: ${markerSize}px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">✓</div>`,
                className: 'custom-div-icon clickable completed-board',
                iconSize: [markerSize, markerSize],
                iconAnchor: [markerSize/2, markerSize/2]
            });
            
            const completedMarker = L.marker(coord, { icon: completedIcon }).addTo(markersLayer);
            
            // 完了マーカーにクリックイベントを追加
            completedMarker.on('click', () => {
                marker.openPopup();
                this.mapManager.setView(coord, CONFIG.MAP.DETAIL_ZOOM);
            });
        });
    }
    
    
    // 投票区の境界に合わせる（ポイントのみシステム）
    fitDistrictBounds(districtPoints) {
        const bounds = [];
        
        districtPoints.forEach(point => {
            bounds.push([point.geometry.coordinates[1], point.geometry.coordinates[0]]);
        });
        
        if (bounds.length > 0) {
            this.mapManager.fitBounds(L.latLngBounds(bounds));
        }
    }
    
    // 全投票区表示
    showAllDistricts() {
        this.currentDistrict = null;
        
        // 状態をクリア
        if (window.app) {
            window.app.saveState(null);
        }
        this.routeManager.setCurrentDistrict(null);
        
        // ボタンの状態リセット
        document.querySelectorAll('.district-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 地図クリア
        this.mapManager.clearLayers();
        
        // 全投票区の掲示板地点を表示（ポイントのみシステム）
        const districtCenters = new Map();
        const allBounds = [];
        
        // 全ての地点（未完了と完了済み両方）を含める
        this.allData.features
            .filter(f => f.geometry.type === 'Point')
            .forEach(point => {
                const district = point.properties.district;
                if (!districtCenters.has(district)) {
                    districtCenters.set(district, []);
                }
                districtCenters.get(district).push([
                    point.geometry.coordinates[1],
                    point.geometry.coordinates[0]
                ]);
            });
        
        // 各投票区の掲示板地点にマーカー配置
        this.addAllDistrictMarkers(districtCenters, allBounds);
        
        // 全ての投票区が収まるように地図を調整
        if (allBounds.length > 0) {
            this.mapManager.fitBounds(L.latLngBounds(allBounds));
        }
        
        // 全体情報表示
        this.updateOverallInfo();
        
        // UI状態の更新
        this.updateUIForAllDistricts();
        
        // Googleマップボタンを非表示
        this.googleMapsManager.hideButton();
    }
    
    // 全投票区マーカーを追加（ポイントのみシステム）
    addAllDistrictMarkers(districtCenters, allBounds) {
        const markersLayer = this.mapManager.getMarkersLayer();
        
        Array.from(districtCenters.entries()).forEach(([district, coords], index) => {
            // 投票区の進捗状況を取得
            const districtProgress = this.calculateDistrictProgress(district);
            
            // 掲示板の中心点を計算
            const position = [
                coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length,
                coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
            ];
            
            // 境界計算用に位置を追加
            allBounds.push(position);
            
            // 完了状況に応じて色を決定
            const color = districtProgress.isFullyCompleted ? 
                '#27ae60' : // 緑色（完了）
                CONFIG.COLORS.DISTRICT_COLORS[index % CONFIG.COLORS.DISTRICT_COLORS.length];
            
            const marker = L.circleMarker(position, {
                radius: CONFIG.MARKERS.DISTRICT_RADIUS,
                fillColor: color,
                color: CONFIG.COLORS.WHITE,
                weight: CONFIG.MARKERS.WEIGHT,
                fillOpacity: CONFIG.MARKERS.OPACITY
            }).addTo(markersLayer);
            
            // 完了済み投票区の場合はチェックマークアイコンを追加（サイズ統一）
            if (districtProgress.isFullyCompleted) {
                const markerSize = CONFIG.MARKERS.DISTRICT_RADIUS * 2; // 12 * 2 = 24px（投票区は少し大きく）
                const checkIcon = L.divIcon({
                    html: `<div style="background: #22c55e; color: white; border-radius: 50%; width: ${markerSize}px; height: ${markerSize}px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">✓</div>`,
                    className: 'custom-div-icon clickable completed-district',
                    iconSize: [markerSize, markerSize],
                    iconAnchor: [markerSize/2, markerSize/2]
                });
                
                const checkMarker = L.marker(position, { icon: checkIcon }).addTo(markersLayer);
                
                // チェックマーカーにもクリックイベントを追加
                checkMarker.on('click', () => {
                    this.showDistrict(district);
                });
                
                // ポップアップも共有
                checkMarker.bindPopup(`
                    <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                        <h4>${district}</h4>
                        <p>地点数: ${districtProgress.totalBoards}地点</p>
                        <p>状況: <span style="color: #27ae60; font-weight: bold;">✓ 完了</span></p>
                        <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">クリックで詳細表示</div>
                    </div>
                `);
            }
            
            // マーカーのクリックイベントで直接投票区を表示
            marker.on('click', () => {
                this.showDistrict(district);
            });
            
            // 完了状況を含むポップアップ
            const statusText = districtProgress.isFullyCompleted ? 
                '✓ 完了' : 
                `完了${districtProgress.completedBoards}/${districtProgress.totalBoards}`;
            
            marker.bindPopup(`
                <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                    <h4>${district}</h4>
                    <p>地点数: ${districtProgress.totalBoards}地点</p>
                    <p>状況: <span style="color: ${districtProgress.isFullyCompleted ? '#27ae60' : '#e74c3c'}; font-weight: bold;">${statusText}</span></p>
                    <div style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">クリックで詳細表示</div>
                </div>
            `);
        });
    }
    
    // 情報パネルを更新
    updateInfoPanel(districtName, properties, completedPoints = []) {
        // 投票区名を取得（第X投票区形式）
        const districtNumber = properties.district_number || '不明';
        const districtTitle = districtNumber !== '不明' ? `第${districtNumber}投票区` : '投票区情報';
        document.getElementById('districtInfoTitle').textContent = districtTitle;
        
        // 該当する投票区の掲示板数を計算（最適化対象のみ）
        const optimizationPoints = this.allData.features.filter(f =>
            f.properties.district === districtName && f.geometry.type === 'Point' && 
            f.properties.type !== 'completed_board'
        ).length;
        
        const totalPoints = optimizationPoints + completedPoints.length;
        
        // 完了地点のリスト作成
        let completedListHtml = '';
        if (completedPoints.length > 0) {
            completedListHtml = `
                <div class="stat-item">
                    <span class="stat-label">完了済み地点</span>
                    <div class="completed-points-list">
                        ${completedPoints.map((point, index) => {
                            const boardNumber = point.properties.board_number ? `【${point.properties.board_number}】` : '';
                            return `
                                <div class="completed-point-item" data-point-index="${index}">
                                    <span class="completed-indicator">✓</span>
                                    <span class="completed-name">${boardNumber}${point.properties.name}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        // 距離と時間の表示（完了済み投票区の場合は非表示）
        let distanceTimeHtml = '';
        if (optimizationPoints > 0 && properties.total_distance_km && properties.estimated_hours) {
            distanceTimeHtml = `
                <div class="stat-item">
                    <span class="stat-label">最適経路距離</span>
                    <span class="stat-value">${properties.total_distance_km}km</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">推定時間</span>
                    <span class="stat-value">${properties.estimated_hours}時間</span>
                </div>
            `;
        }
        
        document.getElementById('districtInfo').innerHTML = `
            <div class="stat-item">
                <span class="stat-label">掲示板数</span>
                <span class="stat-value">
                    ${totalPoints}ヶ所 (未完了: ${optimizationPoints})
                </span>
            </div>
            ${distanceTimeHtml}
            ${completedListHtml}
        `;
        
        // 完了地点のクリックイベントを追加
        if (completedPoints.length > 0) {
            document.querySelectorAll('.completed-point-item').forEach((item) => {
                item.addEventListener('click', () => {
                    const pointIndex = parseInt(item.getAttribute('data-point-index'));
                    const point = completedPoints[pointIndex];
                    if (point) {
                        this.focusOnCompletedPoint(point);
                    }
                });
            });
        }
    }
    
    // 完了地点にフォーカス
    focusOnCompletedPoint(point) {
        console.log('focusOnCompletedPoint called with:', point);
        
        const coord = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
        console.log('Target coordinates:', coord);
        
        // マップのビューを設定
        try {
            this.mapManager.setView(coord, 16);
            console.log('Map view set to:', coord, 'zoom: 16');
            
            // 画面をマップエリアにスクロール
            const mapElement = document.getElementById('map');
            if (mapElement) {
                mapElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
                console.log('Scrolled to map area');
            }
        } catch (error) {
            console.error('Error setting map view:', error);
        }
        
        // ポップアップを表示するためにマーカーを見つけてクリック
        setTimeout(() => {
            try {
                const markers = this.mapManager.getMarkersLayer().getLayers();
                console.log('Found markers count:', markers.length);
                
                const targetMarker = markers.find(marker => {
                    if (marker.getLatLng) {
                        const markerPos = marker.getLatLng();
                        const latDiff = Math.abs(markerPos.lat - coord[0]);
                        const lngDiff = Math.abs(markerPos.lng - coord[1]);
                        console.log('Checking marker at:', markerPos.lat, markerPos.lng, 'diff:', latDiff, lngDiff);
                        
                        // 精度を緩めて検索
                        return latDiff < 0.001 && lngDiff < 0.001;
                    }
                    return false;
                });
                
                if (targetMarker && targetMarker.openPopup) {
                    console.log('Found target marker, opening popup');
                    targetMarker.openPopup();
                } else {
                    console.log('Target marker not found, creating custom popup');
                    // マーカーが見つからない場合は直接ポップアップを作成
                    const boardNumber = point.properties.board_number ? `【${point.properties.board_number}】` : '';
                    const popupContent = `
                        <div style="min-width: 200px;">
                            <div style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem;">
                                ${boardNumber}${point.properties.name}
                            </div>
                            <div style="margin-bottom: 0.5rem;">
                                <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; color: white; background-color: #27ae60;">
                                    完了
                                </span>
                            </div>
                            <div style="color: #666; font-size: 0.9rem;">
                                ${point.properties.address}
                            </div>
                        </div>
                    `;
                    this.mapManager.openPopup(coord, popupContent);
                }
            } catch (error) {
                console.error('Error in marker search or popup:', error);
            }
        }, 200);
    }
    
    // 完了地点カードを非表示
    hideCompletedCard() {
        const completedCard = document.getElementById('completedCard');
        if (completedCard) {
            completedCard.style.display = 'none';
        }
    }
    
    // 完了地点リストを更新（後方互換性のため保持）
    updateCompletedList() {
        // 統合表示に変更したため、この関数は非表示のみ実行
        this.hideCompletedCard();
    }
    
    // 全体情報を更新
    updateOverallInfo() {
        const allDistricts = new Set();
        const incompleteDistricts = new Set();
        let incompletePoints = 0;
        let totalPoints = 0;
        
        // 全ての投票区と未完了の投票区を集計
        this.allData.features
            .filter(f => f.geometry.type === 'Point')
            .forEach(f => {
                allDistricts.add(f.properties.district);
                totalPoints++;
                
                if (f.properties.type !== 'completed_board') {
                    incompleteDistricts.add(f.properties.district);
                    incompletePoints++;
                }
            });
        
        document.getElementById('districtInfoTitle').textContent = '全投票区情報';
        document.getElementById('districtInfo').innerHTML = `
            <div class="stat-item">
                <span class="stat-label">総投票区数</span>
                <span class="stat-value">${allDistricts.size}区 (未完了: ${incompleteDistricts.size}区)</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">総掲示板数</span>
                <span class="stat-value">${totalPoints}ヶ所 (未完了: ${incompletePoints}ヶ所)</span>
            </div>
        `;
    }
    
    // UI状態を全投票区表示用に更新
    updateUIForAllDistricts() {
        const routeCard = document.getElementById('routeCard');
        
        // 巡回順序エリア全体を非表示
        if (routeCard) {
            routeCard.style.display = 'none';
        }
        
        // 完了地点エリアも非表示（統合表示のため常に非表示）
        this.hideCompletedCard();
    }
    
    // UI状態を投票区選択用に更新
    updateUIForDistrictSelection() {
        const routeCard = document.getElementById('routeCard');
        
        // 巡回順序エリアを表示
        if (routeCard) {
            routeCard.style.display = 'block';
        }
    }
}