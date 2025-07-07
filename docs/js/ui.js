import { downloadData } from './utils.js';

// UI管理クラス
export class UIManager {
    constructor(districtManager) {
        this.districtManager = districtManager;
        this.allData = null;
    }
    
    // データを設定
    setData(data) {
        this.allData = data;
    }
    
    // イベントリスナーを初期化
    initializeEventListeners() {
        // 検索機能
        const searchInput = document.getElementById('districtSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.districtManager.filterDistricts();
            });
        }
        
        // 全区表示ボタン
        const showAllBtn = document.querySelector('button[onclick="showAllDistricts()"]');
        if (showAllBtn) {
            showAllBtn.onclick = () => this.districtManager.showAllDistricts();
        }
        
        // データダウンロードボタン
        const downloadBtn = document.querySelector('button[onclick="downloadData()"]');
        if (downloadBtn) {
            downloadBtn.onclick = () => this.downloadData();
        }
        
        // キーボードイベント
        document.addEventListener('keydown', (e) => {
            // Escapeキーで検索をクリア
            if (e.key === 'Escape') {
                const searchInput = document.getElementById('districtSearch');
                if (searchInput) {
                    searchInput.value = '';
                    this.districtManager.filterDistricts();
                }
            }
        });
    }
    
    // データダウンロード
    downloadData() {
        if (!this.allData) {
            alert('データが読み込まれていません。');
            return;
        }
        
        downloadData(this.allData, 'poster_board_routes_data.geojson');
    }
    
    // ローディング状態を表示
    showLoading(element, message = 'データを読み込み中...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = `<div class="loading">${message}</div>`;
        }
    }
    
    // エラーメッセージを表示
    showError(element, message) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = `<div class="error">${message}</div>`;
        }
    }
    
    // アプリケーション全体のエラーハンドリング
    handleGlobalError(error) {
        console.error('アプリケーションエラー:', error);
        
        // ユーザーにフレンドリーなエラーメッセージを表示
        const errorMessage = this.getErrorMessage(error);
        this.showError('districtSelector', errorMessage);
    }
    
    // エラーメッセージを取得
    getErrorMessage(error) {
        if (error.message.includes('fetch')) {
            return 'データファイルの読み込みに失敗しました。ネットワーク接続を確認してください。';
        } else if (error.message.includes('JSON')) {
            return 'データファイルの形式が正しくありません。';
        } else {
            return `予期しないエラーが発生しました: ${error.message}`;
        }
    }
    
    // 通知メッセージを表示
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        // タイプに応じて背景色を設定
        switch (type) {
            case 'success':
                notification.style.background = '#10b981';
                break;
            case 'error':
                notification.style.background = '#ef4444';
                break;
            case 'warning':
                notification.style.background = '#f59e0b';
                break;
            default:
                notification.style.background = '#3b82f6';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // アニメーション
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // 指定時間後に削除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    // 確認ダイアログを表示
    showConfirmDialog(message, onConfirm, onCancel = null) {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.2s ease;
        `;
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            text-align: center;
            transform: scale(0.9);
            transition: transform 0.2s ease;
        `;
        
        dialog.innerHTML = `
            <p style="margin-bottom: 1.5rem; color: #374151; font-size: 1rem; line-height: 1.5;">${message}</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="confirm-btn" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">確認</button>
                <button id="cancel-btn" style="background: #6b7280; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">キャンセル</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // アニメーション
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            dialog.style.transform = 'scale(1)';
        });
        
        // イベントリスナー
        const confirmBtn = dialog.querySelector('#confirm-btn');
        const cancelBtn = dialog.querySelector('#cancel-btn');
        
        const cleanup = () => {
            overlay.style.opacity = '0';
            dialog.style.transform = 'scale(0.9)';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 200);
        };
        
        confirmBtn.onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };
        
        // オーバーレイクリックで閉じる
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                cleanup();
                if (onCancel) onCancel();
            }
        };
        
        // ESCキーで閉じる
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }
    
    // プログレスバーを表示
    showProgressBar(container, current, total) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (!container) return;
        
        const percentage = Math.round((current / total) * 100);
        
        let progressBar = container.querySelector('.progress-bar');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.cssText = `
                width: 100%;
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
                margin: 1rem 0;
            `;
            
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            progressFill.style.cssText = `
                height: 100%;
                background: #3b82f6;
                border-radius: 4px;
                transition: width 0.3s ease;
                width: 0%;
            `;
            
            progressBar.appendChild(progressFill);
            container.appendChild(progressBar);
        }
        
        const progressFill = progressBar.querySelector('.progress-fill');
        progressFill.style.width = `${percentage}%`;
        
        // 完了時は少し待ってから削除
        if (current >= total) {
            setTimeout(() => {
                if (progressBar.parentNode) {
                    progressBar.parentNode.removeChild(progressBar);
                }
            }, 1000);
        }
    }
}