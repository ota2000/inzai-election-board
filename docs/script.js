// グローバル変数
let map;
let allData = null;
let currentDistrict = null;
let markersLayer = null;
let routesLayer = null;

// 投票区検索機能
function filterDistricts() {
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

// 投票区ごとの色
const districtColors = [
    '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
    '#3730a3', '#4338ca', '#4f46e5', '#6366f1', '#7c3aed',
    '#8b5cf6', '#9333ea', '#a855f7', '#b91c1c', '#dc2626',
    '#ef4444', '#f87171', '#fb7185', '#f43f5e', '#e11d48',
    '#be123c', '#9f1239', '#881337'
];

// 地図初期化
function initMap() {
    map = L.map('map').setView([35.82, 140.15], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    routesLayer = L.layerGroup().addTo(map);
}

// データ読み込み
async function loadData() {
    try {
        const response = await fetch('./poster_board_routes.geojson');
        if (!response.ok) {
            throw new Error('データファイルが見つかりません');
        }
        allData = await response.json();
        setupDistrictSelector();
        showAllDistricts();
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        document.getElementById('districtSelector').innerHTML =
            '<div class="error">データの読み込みに失敗しました: ' + error.message + '</div>';
    }
}

// 投票区セレクター設定
function setupDistrictSelector() {
    // 投票区と対応する投票区番号を取得
    const districtMap = new Map();
    allData.features
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

    districts.forEach(([district, districtNumber], index) => {
        const btn = document.createElement('div');
        btn.className = 'district-btn';
        
        // 投票区番号を表示（第X投票区のXを使用）
        const voteNumber = districtNumber.replace('第', '').replace('投票区', '');
        
        // データ属性を設定（検索用）
        btn.dataset.district = district;
        btn.dataset.number = voteNumber;
        btn.title = `${voteNumber}. ${district}`;
        
        // 新しい構造でHTMLを作成
        btn.innerHTML = `
            <span class="district-btn-name">${district}</span>
            <span class="district-btn-number">${voteNumber}</span>
        `;
        
        btn.onclick = () => showDistrict(district);
        selector.appendChild(btn);
    });
}

// 特定投票区表示
function showDistrict(districtName) {
    currentDistrict = districtName;

    // ボタンの状態更新
    document.querySelectorAll('.district-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.district === districtName) {
            btn.classList.add('active');
        }
    });

    // 地図クリア
    markersLayer.clearLayers();
    routesLayer.clearLayers();

    // 該当データをフィルタ
    const districtPoints = allData.features.filter(f =>
        f.properties.district === districtName && f.geometry.type === 'Point' && f.properties.type !== 'voting_office'
    );
    const votingOffice = allData.features.find(f =>
        f.properties.district === districtName && f.properties.type === 'voting_office'
    );
    const districtRouteSegments = allData.features.filter(f =>
        f.properties.district === districtName && f.properties.type === 'route_segment'
    );
    const districtSimpleRoute = allData.features.find(f =>
        f.properties.district === districtName && f.properties.type === 'simple_route'
    );

    if (districtPoints.length === 0) return;

    // ポイントマーカー追加
    const bounds = [];
    districtPoints
        .sort((a, b) => a.properties.order - b.properties.order)
        .forEach((point, index) => {
            const coord = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
            bounds.push(coord);

            const isStart = point.properties.order === 1;
            const marker = L.circleMarker(coord, {
                radius: isStart ? 10 : 8,
                fillColor: isStart ? '#FF4757' : '#667eea',
                color: 'white',
                weight: 2,
                fillOpacity: 0.8
            }).addTo(markersLayer);
            
            // 掲示板マーカーであることを示すプロパティを追加
            marker.boardOrder = point.properties.order;

            // ポップアップ（シンプル版）
            const boardNumber = point.properties.board_number ? `【${point.properties.board_number}】` : '';
            const popupContent = `
                <div style="min-width: 200px;">
                    <div style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem;">
                        ${point.properties.order}. ${boardNumber}${point.properties.name}
                    </div>
                    <div class="clickable-address" 
                         style="color: #666; font-size: 0.9rem; cursor: pointer; padding: 0.25rem; border-radius: 4px; background: #f8f9fa; border: 1px solid #e9ecef;"
                         onclick="copyToClipboard('${point.properties.address}')" 
                         title="クリックでコピー">
                        📋 ${point.properties.address}
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent);

            // 番号表示（クリック可能）
            const numberIcon = L.divIcon({
                html: `<div style="background: ${isStart ? '#FF4757' : '#667eea'}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${point.properties.order}</div>`,
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
                map.setView(coord, 16);
            });
        });

    // 投票所マーカー追加
    if (votingOffice) {
        const officeCoord = [votingOffice.geometry.coordinates[1], votingOffice.geometry.coordinates[0]];
        bounds.push(officeCoord);

        // 投票所用の特別なアイコン
        const officeIcon = L.divIcon({
            html: `<div style="background: #ff4757; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; border: 4px solid #ffffff; box-shadow: 0 0 0 3px #ff4757, 0 4px 12px rgba(0,0,0,0.4); z-index: 1000;">🗳️</div>`,
            className: 'voting-office-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        const officeMarker = L.marker(officeCoord, { icon: officeIcon }).addTo(markersLayer);

        // 投票所のポップアップ
        const officePopupContent = `
            <div style="min-width: 250px;">
                <h4 style="margin: 0 0 0.5rem 0; color: #28a745;">投票所</h4>
                <h3 style="margin: 0 0 0.5rem 0;">${votingOffice.properties.name}</h3>
                <div class="clickable-address" 
                     style="margin: 0.5rem 0; color: #666; font-size: 0.9rem; cursor: pointer; padding: 0.25rem; border-radius: 4px; background: #f8f9fa; border: 1px solid #e9ecef;"
                     onclick="copyToClipboard('${votingOffice.properties.address}')" 
                     title="クリックでコピー">
                    📋 ${votingOffice.properties.address}
                </div>
                <div style="background: #e8f5e8; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0; border-left: 3px solid #28a745;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 0.2rem;">${votingOffice.properties.district_number || '投票区'}</div>
                    <div style="font-size: 0.8rem; color: #666;">
                        管轄掲示板数: ${votingOffice.properties.total_points || 0}ヶ所<br>
                        総巡回距離: ${votingOffice.properties.total_distance_km || 0}km
                    </div>
                </div>
            </div>
        `;
        officeMarker.bindPopup(officePopupContent);
    }

    // 詳細ルートセグメント追加
    if (districtRouteSegments.length > 0) {
        console.log(`詳細ルートセグメント数: ${districtRouteSegments.length}`);
        
        // セグメントを順序でソート
        districtRouteSegments.sort((a, b) => a.properties.segment - b.properties.segment);
        
        districtRouteSegments.forEach((segment, index) => {
            const segmentCoords = segment.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            
            // 鮮やかな青から紫へのグラデーション
            const progress = index / Math.max(1, districtRouteSegments.length - 1);
            const hue = 200 + (progress * 80); // 200(青) -> 280(紫)
            const segmentColor = `hsl(${hue}, 70%, 50%)`;
            
            const polyline = L.polyline(segmentCoords, {
                color: segmentColor,
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
            }).bindPopup(`
                <div style="min-width: 180px;">
                    <strong>ルートセグメント ${segment.properties.segment}</strong><br>
                    <div style="margin: 0.5rem 0; font-size: 0.9rem;">
                        ${segment.properties.from_point} → ${segment.properties.to_point}地点目<br>
                        実際の道路経路に沿ったルート
                    </div>
                </div>
            `).addTo(routesLayer);
            
            // ホバー効果
            polyline.on('mouseover', function() {
                this.setStyle({ weight: 8, opacity: 1 });
            });
            polyline.on('mouseout', function() {
                this.setStyle({ weight: 6, opacity: 0.9 });
            });
        });
        
        // ルート情報メッセージを表示
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
        routeInfo.addTo(map);
        
        // 5秒後にメッセージを削除
        setTimeout(() => {
            map.removeControl(routeInfo);
        }, 5000);
        
    } else if (districtSimpleRoute) {
        // フォールバック：簡略ルート
        const routeCoords = districtSimpleRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        L.polyline(routeCoords, {
            color: '#667eea',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 5'
        }).bindPopup('簡略化されたルート（直線距離）').addTo(routesLayer);
    }

    // 地図範囲調整
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });
    }

    // 情報パネル更新
    updateInfoPanel(districtName, districtPoints[0].properties);
    updateRouteList(districtPoints);
    
    // UI状態の更新
    updateUIForDistrictSelection();
}

// 全投票区表示
function showAllDistricts() {
    currentDistrict = null;

    // ボタンの状態リセット
    document.querySelectorAll('.district-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 地図クリア
    markersLayer.clearLayers();
    routesLayer.clearLayers();

    // 全投票区の中心点を表示（投票所は除外）
    const districtCenters = new Map();
    const votingOffices = new Map();

    allData.features
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
    Array.from(districtCenters.entries()).forEach(([district, coords], index) => {
        // 投票所の位置を使用、なければ掲示板の中心点
        const position = votingOffices.has(district) ? 
            votingOffices.get(district) : 
            [
                coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length,
                coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length
            ];

        const color = districtColors[index % districtColors.length];
        const marker = L.circleMarker(position, {
            radius: 12,
            fillColor: color,
            color: 'white',
            weight: 2,
            fillOpacity: 0.8
        }).addTo(markersLayer);

        marker.bindPopup(`
            <div style="min-width: 200px;">
                <h4>${district}</h4>
                <p>地点数: ${coords.length}地点</p>
                <button onclick="showDistrict('${district}')" style="background: ${color}; color: white; border: none; padding: 0.5rem 1rem; border-radius: 3px; cursor: pointer;">詳細表示</button>
            </div>
        `);
    });


    // 全体情報表示
    updateOverallInfo();
    
    // UI状態の更新
    updateUIForAllDistricts();
}

// 情報パネル更新
function updateInfoPanel(districtName, properties) {
    const info = document.getElementById('districtInfo');
    const districtNumber = properties.district_number || '';
    const officeName = properties.office_name || districtName;
    const officeAddress = properties.office_address || '';
    
    info.innerHTML = `
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #667eea;">
            <h4 style="margin: 0 0 0.5rem 0; color: #667eea;">📍 ${districtNumber}</h4>
            <div style="font-weight: bold; margin-bottom: 0.3rem;">${officeName}</div>
            <div style="font-size: 0.9rem; color: #666;">${officeAddress}</div>
        </div>
        <div class="stat-item">
            <span class="stat-label">掲示板数</span>
            <span class="stat-value">${properties.total_points}地点</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">巡回距離</span>
            <span class="stat-value">${properties.total_distance_km}km</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">推定時間</span>
            <span class="stat-value">${properties.estimated_hours}時間</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">平均間隔</span>
            <span class="stat-value">${(properties.total_distance_km / properties.total_points).toFixed(2)}km</span>
        </div>
    `;
}

// 全体情報更新
function updateOverallInfo() {
    const districts = [...new Set(allData.features
        .filter(f => f.geometry.type === 'Point')
        .map(f => f.properties.district))];

    const totalPoints = allData.features.filter(f => f.geometry.type === 'Point' && f.properties.type !== 'voting_office').length;
    const totalDistance = districts.reduce((sum, district) => {
        const route = allData.features.find(f =>
            f.properties.district === district && f.geometry.type === 'LineString'
        );
        return sum + (route ? route.properties.total_distance_km : 0);
    }, 0);

    const info = document.getElementById('districtInfo');
    info.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">総投票区数</span>
            <span class="stat-value">${districts.length}区</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">総地点数</span>
            <span class="stat-value">${totalPoints}地点</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">総巡回距離</span>
            <span class="stat-value">${totalDistance.toFixed(2)}km</span>
        </div>
    `;
}

// UI状態の更新（全区表示時）
function updateUIForAllDistricts() {
    // タイトルを変更
    document.getElementById('districtInfoTitle').textContent = '全投票区統計情報';
    
    // 巡回順序カードを非表示
    document.getElementById('routeCard').style.display = 'none';
}

// UI状態の更新（投票区選択時）
function updateUIForDistrictSelection() {
    // タイトルを戻す
    document.getElementById('districtInfoTitle').textContent = '選択中の投票区情報';
    
    // 巡回順序カードを表示
    document.getElementById('routeCard').style.display = 'block';
}

// 巡回順序リスト更新
function updateRouteList(points) {
    const routeList = document.getElementById('routeList');
    routeList.innerHTML = '';

    points
        .sort((a, b) => a.properties.order - b.properties.order)
        .forEach(point => {
            const item = document.createElement('div');
            item.className = 'route-item';
            const boardNumber = point.properties.board_number ? `【${point.properties.board_number}】` : '';
            item.innerHTML = `
                <div class="route-number">${point.properties.order}</div>
                <div class="route-details">
                    <div class="route-name">${boardNumber}${point.properties.name}</div>
                    <div class="route-address">${point.properties.address}</div>
                </div>
            `;

            // クリックでマーカーに移動しマップにフォーカス
            item.onclick = () => {
                const coord = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
                map.setView(coord, 16);

                // 該当する掲示板マーカーのポップアップを開く
                markersLayer.eachLayer(layer => {
                    // 掲示板マーカーかつ順序が一致するものを探す
                    if (layer.boardOrder && layer.boardOrder === point.properties.order) {
                        layer.openPopup();
                    }
                });
                
                // マップコンテナにフォーカスを当てる
                setTimeout(() => {
                    document.getElementById('map').focus();
                    document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            };

            routeList.appendChild(item);
        });
}

// データダウンロード
function downloadData() {
    if (!allData) return;

    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'poster_board_routes_data.geojson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 住所コピー機能
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // コピー成功のフィードバック
        showCopyFeedback();
    }).catch(err => {
        console.error('コピーに失敗しました:', err);
        // フォールバック: 古い方法でコピー
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showCopyFeedback();
    });
}

// コピー成功のフィードバック
function showCopyFeedback() {
    // 既存のフィードバックを削除
    const existingFeedback = document.querySelector('.copy-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // フィードバック要素を作成
    const feedback = document.createElement('div');
    feedback.className = 'copy-feedback';
    feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 0.875rem;
        font-weight: 500;
        opacity: 1;
        transition: opacity 0.3s ease;
    `;
    feedback.textContent = '📋 住所をコピーしました';
    
    document.body.appendChild(feedback);
    
    // 2秒後にフェードアウトして削除
    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, 2000);
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
});