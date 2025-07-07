import { CONFIG } from './config.js';
import { MapManager } from './map.js';
import { DistrictManager } from './districts.js';
import { RouteManager } from './routes.js';
import { GoogleMapsManager } from './googleMaps.js';
import { UIManager } from './ui.js';
import { copyToClipboard } from './utils.js';

// アプリケーションクラス
class ElectionBoardApp {
    constructor() {
        this.allData = null;
        this.mapManager = null;
        this.districtManager = null;
        this.routeManager = null;
        this.googleMapsManager = null;
        this.uiManager = null;
    }
    
    // アプリケーション初期化
    async init() {
        try {
            // マネージャーを初期化
            this.initializeManagers();
            
            // グローバル参照を設定（互換性のため）
            this.setupGlobalReferences();
            
            // 地図を初期化
            this.mapManager.init();
            
            // データを読み込み
            await this.loadData();
            
            // UIイベントリスナーを設定
            this.uiManager.initializeEventListeners();
            
            // 投票区セレクターを設定
            this.districtManager.setupDistrictSelector();
            
            // 全投票区を表示
            this.districtManager.showAllDistricts();
            
            console.log('アプリケーションが正常に初期化されました');
            
        } catch (error) {
            console.error('アプリケーション初期化エラー:', error);
            this.uiManager.handleGlobalError(error);
        }
    }
    
    // マネージャーを初期化
    initializeManagers() {
        this.mapManager = new MapManager();
        this.googleMapsManager = new GoogleMapsManager();
        this.routeManager = new RouteManager(this.mapManager, this.googleMapsManager);
        this.districtManager = new DistrictManager(this.mapManager, this.routeManager, this.googleMapsManager);
        this.uiManager = new UIManager(this.districtManager);
    }
    
    // グローバル参照を設定（既存コードとの互換性のため）
    setupGlobalReferences() {
        // ユーティリティ関数をグローバルに公開
        window.appUtils = {
            copyToClipboard
        };
        
        // マネージャーをグローバルに公開
        window.districtManager = this.districtManager;
        window.googleMapsManager = this.googleMapsManager;
        window.routeManager = this.routeManager;
        window.uiManager = this.uiManager;
        
        // 互換性のための関数
        window.showAllDistricts = () => this.districtManager.showAllDistricts();
        window.showDistrict = (district) => this.districtManager.showDistrict(district);
        window.filterDistricts = () => this.districtManager.filterDistricts();
        window.downloadData = () => this.uiManager.downloadData();
        window.copyToClipboard = copyToClipboard;
        window.openSegmentInGoogleMaps = (fromCoord, toCoord) => {
            this.googleMapsManager.openSegment(fromCoord, toCoord);
        };
    }
    
    // データ読み込み
    async loadData() {
        try {
            this.uiManager.showLoading('districtSelector', 'データを読み込み中...');
            
            const response = await fetch(CONFIG.DATA.GEOJSON_PATH);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: データファイルが見つかりません`);
            }
            
            this.allData = await response.json();
            
            // 各マネージャーにデータを設定
            this.districtManager.setData(this.allData);
            this.uiManager.setData(this.allData);
            
            console.log('データが正常に読み込まれました:', this.allData);
            
        } catch (error) {
            console.error('データ読み込みエラー:', error);
            this.uiManager.showError('districtSelector', 
                `データの読み込みに失敗しました: ${error.message}`);
            throw error;
        }
    }
    
    // アプリケーションの状態を取得
    getState() {
        return {
            currentDistrict: this.districtManager?.currentDistrict,
            dataLoaded: !!this.allData,
            totalDistricts: this.allData ? 
                new Set(this.allData.features
                    .filter(f => f.geometry.type === 'Point' && f.properties.type !== 'voting_office')
                    .map(f => f.properties.district)).size : 0
        };
    }
    
    // アプリケーションをリセット
    reset() {
        this.mapManager?.clearLayers();
        this.districtManager?.showAllDistricts();
        this.googleMapsManager?.hideButton();
    }
}

// グローバルエラーハンドリング
window.addEventListener('error', (event) => {
    console.error('グローバルエラー:', event.error);
    if (window.uiManager) {
        window.uiManager.showNotification('予期しないエラーが発生しました', 'error');
    }
});

// 未処理のPromise拒否をキャッチ
window.addEventListener('unhandledrejection', (event) => {
    console.error('未処理のPromise拒否:', event.reason);
    if (window.uiManager) {
        window.uiManager.showNotification('データ処理中にエラーが発生しました', 'error');
    }
    event.preventDefault();
});

// アプリケーションのインスタンスを作成してグローバルに公開
const app = new ElectionBoardApp();
window.app = app;

// DOMContentLoaded時にアプリケーションを初期化
document.addEventListener('DOMContentLoaded', () => {
    app.init().catch(error => {
        console.error('アプリケーション起動に失敗しました:', error);
    });
});

// デバッグ用（ブラウザ環境でのprocess参照を回避）
if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development') {
    window.DEBUG = {
        app,
        CONFIG,
        getManagers: () => ({
            map: app.mapManager,
            district: app.districtManager,
            route: app.routeManager,
            googleMaps: app.googleMapsManager,
            ui: app.uiManager
        })
    };
} else {
    // 開発環境でない場合もデバッグオブジェクトを提供（本番では無効化可能）
    window.DEBUG = {
        app,
        enabled: false
    };
}