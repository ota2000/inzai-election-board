import { CONFIG } from './config.js';

// 時間を「X時間Y分」形式にフォーマット
export function formatTime(hours) {
    if (hours < 1) {
        const minutes = Math.round(hours * 60);
        return `${minutes}分`;
    } else {
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        if (minutes > 0) {
            return `${wholeHours}時間${minutes}分`;
        } else {
            return `${wholeHours}時間`;
        }
    }
}

// Haversine公式で2点間の距離を計算（km）
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球の半径（km）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// セグメントごとの距離・時間を計算
export function calculateSegmentDistances(points) {
    const distances = [];
    
    for (let i = 0; i < points.length - 1; i++) {
        const point1 = points[i];
        const point2 = points[i + 1];
        
        const lat1 = point1.geometry.coordinates[1];
        const lon1 = point1.geometry.coordinates[0];
        const lat2 = point2.geometry.coordinates[1];
        const lon2 = point2.geometry.coordinates[0];
        
        const distance = calculateDistance(lat1, lon1, lat2, lon2);
        
        // 徒歩速度で時間を計算
        const timeInMinutes = Math.round((distance / CONFIG.UI.WALKING_SPEED_KMH) * 60);
        
        distances.push({
            distance: distance.toFixed(2),
            time: timeInMinutes
        });
    }
    
    return distances;
}

// クリップボードにコピー
export function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback();
    }).catch(err => {
        console.error('コピーに失敗しました:', err);
        // フォールバック: 古い方法でコピー
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('フォールバックコピーも失敗しました:', err);
        }
        document.body.removeChild(textArea);
        showCopyFeedback();
    });
}

// コピー成功のフィードバック表示
export function showCopyFeedback() {
    const existingFeedback = document.querySelector('.copy-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    const feedback = document.createElement('div');
    feedback.className = 'copy-feedback';
    feedback.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
    `;
    feedback.textContent = '住所をコピーしました';
    
    document.body.appendChild(feedback);
    
    // アニメーション
    requestAnimationFrame(() => {
        feedback.style.opacity = '1';
        feedback.style.transform = 'translateY(0)';
    });
    
    // 指定時間後にフェードアウトして削除
    setTimeout(() => {
        feedback.style.opacity = '0';
        feedback.style.transform = 'translateY(10px)';
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 300);
    }, CONFIG.UI.COPY_FEEDBACK_DURATION);
}

// データをダウンロード
export function downloadData(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}