// NotificationManager.js - Quản lý thông báo

export class NotificationManager {
    constructor() {
        this.notificationContainer = null;
        this.notificationSound = null;
        this.notificationTimeout = null;
        this.notificationPermission = 'default';
        
        // Khởi tạo container thông báo
        this.initNotificationContainer();
        
        // Khởi tạo âm thanh thông báo
        this.initNotificationSound();
        
        // Kiểm tra quyền thông báo
        this.checkNotificationPermission();
    }
    
    /**
     * Khởi tạo container thông báo
     */
    initNotificationContainer() {
        // Kiểm tra xem đã có container chưa
        if (document.getElementById('notification-container')) {
            this.notificationContainer = document.getElementById('notification-container');
            return;
        }
        
        // Tạo container thông báo
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notification-container';
        this.notificationContainer.className = 'notification-container';
        document.body.appendChild(this.notificationContainer);
    }
    
    /**
     * Khởi tạo âm thanh thông báo
     */
    initNotificationSound() {
        this.notificationSound = new Audio('https://cdn.freesound.org/previews/221/221683_1015240-lq.mp3');
        this.notificationSound.volume = 0.5;
    }
    
    /**
     * Kiểm tra quyền thông báo
     */
    checkNotificationPermission() {
        if (!('Notification' in window)) {
            return;
        }
        
        this.notificationPermission = Notification.permission;
        
        if (this.notificationPermission === 'default') {
            // Sẽ yêu cầu quyền khi người dùng tương tác
        }
    }
    
    /**
     * Yêu cầu quyền thông báo
     */
    requestNotificationPermission() {
        if (!('Notification' in window)) {
            return Promise.resolve(false);
        }
        
        if (this.notificationPermission === 'granted') {
            return Promise.resolve(true);
        }
        
        if (this.notificationPermission === 'denied') {
            return Promise.resolve(false);
        }
        
        return Notification.requestPermission()
            .then(permission => {
                this.notificationPermission = permission;
                return permission === 'granted';
            })
            .catch(error => {
                console.error('Lỗi khi yêu cầu quyền thông báo:', error);
                return false;
            });
    }
    
    /**
     * Hiển thị thông báo
     */
    showNotification(message, type = 'info') {
        // Tạo thông báo
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Thêm icon tương ứng với loại thông báo
        let icon = '';
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            default:
                icon = '<i class="fas fa-info-circle"></i>';
                break;
        }
        
        // Thêm nội dung thông báo
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">${message}</div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        // Thêm sự kiện đóng thông báo
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // Thêm vào container
        this.notificationContainer.appendChild(notification);
        
        // Hiển thị thông báo
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Tự động đóng sau 5 giây
        setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);
        
        return notification;
    }
    
    /**
     * Xóa thông báo
     */
    removeNotification(notification) {
        notification.classList.remove('show');
        
        // Xóa khỏi DOM sau khi animation kết thúc
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    /**
     * Hiển thị thông báo desktop
     */
    showDesktopNotification(title, options = {}) {
        // Kiểm tra xem trình duyệt có hỗ trợ thông báo không
        if (!('Notification' in window)) {
            return;
        }
        
        // Kiểm tra quyền thông báo
        if (this.notificationPermission !== 'granted') {
            this.requestNotificationPermission()
                .then(granted => {
                    if (granted) {
                        this.createDesktopNotification(title, options);
                    }
                });
            return;
        }
        
        // Tạo thông báo
        this.createDesktopNotification(title, options);
    }
    
    /**
     * Tạo thông báo desktop
     */
    createDesktopNotification(title, options = {}) {
        try {
            // Thiết lập các tùy chọn mặc định
            const defaultOptions = {
                icon: 'images/admin.png',
                badge: 'images/admin.png',
                body: 'Bạn có thông báo mới',
                tag: 'chat-notification',
                requireInteraction: false
            };
            
            // Kết hợp tùy chọn
            const notificationOptions = { ...defaultOptions, ...options };
            
            // Tạo thông báo
            const notification = new Notification(title, notificationOptions);
            
            // Thêm sự kiện click
            notification.onclick = function() {
                window.focus();
                notification.close();
                
                // Gọi callback nếu có
                if (options.onClick) {
                    options.onClick();
                }
            };
            
            // Tự động đóng sau 5 giây nếu không yêu cầu tương tác
            if (!notificationOptions.requireInteraction) {
                setTimeout(() => {
                    notification.close();
                }, 5000);
            }
            
            return notification;
        } catch (error) {
            console.error('Lỗi khi tạo thông báo desktop:', error);
            return null;
        }
    }
    
    /**
     * Phát âm thanh thông báo
     */
    playNotificationSound() {
        try {
            // Đặt lại âm thanh về đầu
            this.notificationSound.currentTime = 0;
            
            // Phát âm thanh
            this.notificationSound.play()
                .catch(error => {
                    console.warn('Không thể phát âm thanh thông báo:', error);
                });
        } catch (error) {
            console.error('Lỗi khi phát âm thanh thông báo:', error);
        }
    }
} 