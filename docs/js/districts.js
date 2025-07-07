import { CONFIG } from './config.js';

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
            .filter(f => f.geometry.type === 'Point' && f.properties.type !== 'voting_office')
            .forEach(f => {
                const district = f.properties.district;
                const districtNumber = f.properties.district_number;
                if (!districtMap.has(district)) {
                    districtMap.set(district, districtNumber);
                }
            });
        
        // 投票区番号順にソート
        const districts = Array.from(districtMap.entries()).sort((a, b) => {
            // 第X投票区の番号を抽出してソート
            const numA = parseInt(a[1].replace('第', '').replace('投票区', '')) || 0;
            const numB = parseInt(b[1].replace('第', '').replace('投票区', '')) || 0;
            return numA - numB;
        });
        
        const selector = document.getElementById('districtSelector');
        selector.innerHTML = '';
        
        districts.forEach(([district, districtNumber]) => {
            const btn = document.createElement('div');
            btn.className = 'district-btn';
            
            // 投票区番号を表示（第X投票区のXを使用）
            const voteNumber = districtNumber.replace('第', '').replace('投票区', '');
            
            // データ属性を設定（検索用）
            btn.dataset.district = district;
            btn.dataset.number = voteNumber;
            
            btn.innerHTML = `
                <div class="district-btn-name">${district}</div>
                <div class="district-btn-number">${voteNumber}</div>
            `;
            
            btn.onclick = () => this.showDistrict(district);
            selector.appendChild(btn);
        });
    }
    
    // 特定投票区表示
    showDistrict(districtName) {
        this.currentDistrict = districtName;
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
        
        // 該当データをフィルタ
        const districtPoints = this.allData.features.filter(f =>
            f.properties.district === districtName && f.geometry.type === 'Point' && f.properties.type !== 'voting_office'
        );
        const votingOffice = this.allData.features.find(f =>
            f.properties.district === districtName && f.properties.type === 'voting_office'
        );
        
        if (districtPoints.length === 0) return;
        
        // ポイントマーカー追加
        this.addDistrictMarkers(districtPoints);
        
        // 投票所マーカー追加
        if (votingOffice) {
            this.addVotingOfficeMarker(votingOffice);
        }
        
        // ルートセグメント表示
        this.routeManager.displayRouteSegments(districtName);
        
        // 地図の表示範囲を調整
        this.fitDistrictBounds(districtPoints, votingOffice);
        
        // UI状態の更新
        this.updateUIForDistrictSelection();
        
        // Google Mapsボタンを表示
        this.googleMapsManager.showButton(districtPoints);
        
        // 情報パネル更新
        this.updateInfoPanel(districtName, districtPoints[0].properties);
        
        // ルートリスト更新
        this.routeManager.updateRouteList(districtPoints);
    }
    
    // 投票区マーカーを追加
    addDistrictMarkers(districtPoints) {
        const markersLayer = this.mapManager.getMarkersLayer();
        
        districtPoints
            .sort((a, b) => a.properties.order - b.properties.order)
            .forEach((point) => {
                const coord = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
                
                const isStart = point.properties.order === 1;
                const marker = L.circleMarker(coord, {
                    radius: isStart ? CONFIG.MARKERS.START_RADIUS : CONFIG.MARKERS.NORMAL_RADIUS,
                    fillColor: isStart ? CONFIG.COLORS.START_POINT : CONFIG.COLORS.NORMAL_POINT,
                    color: CONFIG.COLORS.WHITE,
                    weight: CONFIG.MARKERS.WEIGHT,
                    fillOpacity: CONFIG.MARKERS.OPACITY
                }).addTo(markersLayer);
                
                // 掲示板マーカーであることを示すプロパティを追加
                marker.boardOrder = point.properties.order;
                
                // ポップアップ（シンプル版）
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
                marker.bindPopup(popupContent);
                
                // 番号表示（クリック可能）
                const numberIcon = L.divIcon({
                    html: `<div style="background: ${isStart ? CONFIG.COLORS.START_POINT : CONFIG.COLORS.NORMAL_POINT}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${point.properties.order}</div>`,
                    className: 'custom-div-icon clickable',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
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
    
    // 投票所マーカーを追加
    addVotingOfficeMarker(votingOffice) {
        const markersLayer = this.mapManager.getMarkersLayer();
        const officeCoord = [votingOffice.geometry.coordinates[1], votingOffice.geometry.coordinates[0]];
        
        // 投票所用の特別なアイコン
        const officeIcon = L.divIcon({
            html: `<div style="background: #ff4757; color: white; border-radius: 50%; width: ${CONFIG.MARKERS.VOTING_OFFICE_SIZE}px; height: ${CONFIG.MARKERS.VOTING_OFFICE_SIZE}px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; border: 4px solid #ffffff; box-shadow: 0 0 0 3px #ff4757, 0 4px 12px rgba(0,0,0,0.4); z-index: 1000;">🗳️</div>`,
            className: 'voting-office-icon',
            iconSize: [CONFIG.MARKERS.VOTING_OFFICE_SIZE, CONFIG.MARKERS.VOTING_OFFICE_SIZE],
            iconAnchor: [CONFIG.MARKERS.VOTING_OFFICE_SIZE/2, CONFIG.MARKERS.VOTING_OFFICE_SIZE/2]
        });
        
        const officeMarker = L.marker(officeCoord, { icon: officeIcon }).addTo(markersLayer);
        
        officeMarker.bindPopup(`
            <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                <h4>🗳️ ${votingOffice.properties.name}</h4>
                <div class="clickable-address" 
                     style="color: #666; font-size: 0.9rem; cursor: pointer; padding: 0.25rem; border-radius: 4px; background: #f8f9fa; border: 1px solid #e9ecef;"
                     onclick="window.appUtils.copyToClipboard('${votingOffice.properties.address}')" 
                     title="クリックでコピー">
                    📋 ${votingOffice.properties.address}
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">
                    投票所
                </div>
            </div>
        `);
    }
    
    // 投票区の境界に合わせる
    fitDistrictBounds(districtPoints, votingOffice) {
        const bounds = [];
        
        districtPoints.forEach(point => {
            bounds.push([point.geometry.coordinates[1], point.geometry.coordinates[0]]);
        });
        
        if (votingOffice) {
            bounds.push([votingOffice.geometry.coordinates[1], votingOffice.geometry.coordinates[0]]);
        }
        
        if (bounds.length > 0) {
            this.mapManager.fitBounds(L.latLngBounds(bounds));
        }
    }
    
    // 全投票区表示
    showAllDistricts() {
        this.currentDistrict = null;
        this.routeManager.setCurrentDistrict(null);
        
        // ボタンの状態リセット
        document.querySelectorAll('.district-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 地図クリア
        this.mapManager.clearLayers();
        
        // 全投票区の中心点を表示（投票所は除外）
        const districtCenters = new Map();
        const votingOffices = new Map();
        const allBounds = [];
        
        this.allData.features
            .filter(f => f.geometry.type === 'Point')
            .forEach(point => {
                const district = point.properties.district;
                if (point.properties.type === 'voting_office') {
                    // 投票所の位置を記録
                    votingOffices.set(district, [
                        point.geometry.coordinates[1],
                        point.geometry.coordinates[0]
                    ]);
                } else {
                    // 掲示板の位置を記録
                    if (!districtCenters.has(district)) {
                        districtCenters.set(district, []);
                    }
                    districtCenters.get(district).push([
                        point.geometry.coordinates[1],
                        point.geometry.coordinates[0]
                    ]);
                }
            });
        
        // 各投票区の投票所位置にマーカー配置
        this.addAllDistrictMarkers(districtCenters, votingOffices, allBounds);
        
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
    
    // 全投票区マーカーを追加
    addAllDistrictMarkers(districtCenters, votingOffices, allBounds) {
        const markersLayer = this.mapManager.getMarkersLayer();
        
        Array.from(districtCenters.entries()).forEach(([district, coords], index) => {
            // 投票所の位置を使用、なければ掲示板の中心点
            const position = votingOffices.has(district) ? 
                votingOffices.get(district) : 
                [
                    coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length,
                    coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
                ];
            
            // 境界計算用に位置を追加
            allBounds.push(position);
            
            const color = CONFIG.COLORS.DISTRICT_COLORS[index % CONFIG.COLORS.DISTRICT_COLORS.length];
            const marker = L.circleMarker(position, {
                radius: CONFIG.MARKERS.DISTRICT_RADIUS,
                fillColor: color,
                color: CONFIG.COLORS.WHITE,
                weight: CONFIG.MARKERS.WEIGHT,
                fillOpacity: CONFIG.MARKERS.OPACITY
            }).addTo(markersLayer);
            
            marker.bindPopup(`
                <div style="min-width: ${CONFIG.UI.POPUP_MIN_WIDTH};">
                    <h4>${district}</h4>
                    <p>地点数: ${coords.length}地点</p>
                    <button onclick="window.districtManager.showDistrict('${district}')" style="background: ${color}; color: white; border: none; padding: 0.5rem 1rem; border-radius: 3px; cursor: pointer;">詳細表示</button>
                </div>
            `);
        });
    }
    
    // 情報パネルを更新
    updateInfoPanel(districtName, properties) {
        // 投票区番号を取得（第X投票区形式）
        const districtNumber = properties.district_number || '不明';
        document.getElementById('districtInfoTitle').textContent = districtNumber;
        
        const totalPoints = this.allData.features.filter(f => 
            f.properties.district === districtName && f.geometry.type === 'Point' && f.properties.type !== 'voting_office'
        ).length;
        
        document.getElementById('districtInfo').innerHTML = `
            <div class="stat-item">
                <span class="stat-label">掲示板数</span>
                <span class="stat-value">${totalPoints}ヶ所</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">総距離</span>
                <span class="stat-value">${properties.total_distance_km}km</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">推定時間</span>
                <span class="stat-value">${properties.estimated_hours}時間</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">投票所</span>
                <span class="stat-value">${properties.office_name || '不明'}</span>
            </div>
        `;
    }
    
    // 全体情報を更新
    updateOverallInfo() {
        const districts = new Set();
        let totalPoints = 0;
        let totalDistance = 0;
        let totalTime = 0;
        
        this.allData.features
            .filter(f => f.geometry.type === 'Point' && f.properties.type !== 'voting_office')
            .forEach(f => {
                districts.add(f.properties.district);
                totalPoints++;
                totalDistance += f.properties.total_distance_km || 0;
                totalTime += f.properties.estimated_hours || 0;
            });
        
        document.getElementById('districtInfoTitle').textContent = '全投票区情報';
        document.getElementById('districtInfo').innerHTML = `
            <div class="stat-item">
                <span class="stat-label">総投票区数</span>
                <span class="stat-value">${districts.size}区</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">総掲示板数</span>
                <span class="stat-value">${totalPoints}ヶ所</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">総距離</span>
                <span class="stat-value">${(totalDistance/districts.size).toFixed(1)}km (平均)</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">総時間</span>
                <span class="stat-value">${(totalTime/districts.size).toFixed(1)}時間 (平均)</span>
            </div>
        `;
    }
    
    // UI状態を全投票区表示用に更新
    updateUIForAllDistricts() {
        const routeList = document.getElementById('routeList');
        if (routeList) {
            routeList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <div style="font-size: 1.2rem; margin-bottom: 1rem;">📍</div>
                    <div style="font-weight: bold; margin-bottom: 0.5rem;">投票区を選択してください</div>
                    <div style="font-size: 0.9rem;">個別の投票区を選択すると巡回順序が表示されます</div>
                </div>
            `;
        }
    }
    
    // UI状態を投票区選択用に更新
    updateUIForDistrictSelection() {
        // 必要に応じて実装
    }
}