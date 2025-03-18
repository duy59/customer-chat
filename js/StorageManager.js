// StorageManager.js - Quản lý lưu trữ dữ liệu

export class StorageManager {
    constructor(chatApp) {
        this.chatApp = chatApp;
        this.storageKey = 'customer_chat_info';
        this.storageAvailable = this.checkStorageAvailability();
    }
    
    /**
     * Kiểm tra xem localStorage có khả dụng không
     */
    checkStorageAvailability() {
        try {
            const storage = window.localStorage;
            const testKey = '__storage_test__';
            storage.setItem(testKey, testKey);
            storage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('localStorage không khả dụng:', e);
            return false;
        }
    }
    
    /**
     * Lưu thông tin khách hàng vào localStorage
     */
    storeCustomerInfo() {
        if (!this.storageAvailable) {
            console.warn('Không thể lưu thông tin khách hàng: localStorage không khả dụng');
            return false;
        }
        
        if (!this.chatApp.customerId || !this.chatApp.customerInfo) {
            console.error('Không thể lưu thông tin khách hàng: Thiếu thông tin');
            return false;
        }
        
        try {
            const dataToStore = {
                customerId: this.chatApp.customerId,
                customerInfo: this.chatApp.customerInfo,
                timestamp: new Date().getTime()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
            return true;
        } catch (e) {
            console.error('Lỗi khi lưu thông tin khách hàng:', e);
            return false;
        }
    }
    
    /**
     * Lấy thông tin khách hàng từ localStorage
     */
    getStoredCustomerInfo() {
        if (!this.storageAvailable) {
            console.warn('Không thể lấy thông tin khách hàng: localStorage không khả dụng');
            return null;
        }
        
        try {
            const storedData = localStorage.getItem(this.storageKey);
            
            if (!storedData) {
                return null;
            }
            
            const parsedData = JSON.parse(storedData);
            
            // Kiểm tra xem dữ liệu có hợp lệ không
            if (!parsedData.customerId || !parsedData.customerInfo) {
                console.warn('Dữ liệu khách hàng không hợp lệ');
                return null;
            }
            
            // Kiểm tra xem dữ liệu có quá cũ không (30 ngày)
            const now = new Date().getTime();
            const storedTime = parsedData.timestamp || 0;
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 ngày
            
            if (now - storedTime > maxAge) {
                console.warn('Dữ liệu khách hàng đã quá cũ, xóa dữ liệu');
                this.clearStoredCustomerInfo();
                return null;
            }
            
            return parsedData;
        } catch (e) {
            console.error('Lỗi khi lấy thông tin khách hàng:', e);
            return null;
        }
    }
    
    /**
     * Xóa thông tin khách hàng từ localStorage
     */
    clearStoredCustomerInfo() {
        if (!this.storageAvailable) {
            console.warn('Không thể xóa thông tin khách hàng: localStorage không khả dụng');
            return false;
        }
        
        try {
            localStorage.removeItem(this.storageKey);
            
            // Đặt lại các thuộc tính
            this.chatApp.customerId = null;
            this.chatApp.customerInfo = null;
            this.chatApp.isRegistered = false;
            this.chatApp.currentRoomId = null;
            this.chatApp.joinedRooms = [];
            
            return true;
        } catch (e) {
            console.error('Lỗi khi xóa thông tin khách hàng:', e);
            return false;
        }
    }
    
    /**
     * Lưu tin nhắn vào bộ nhớ tạm
     */
    storeMessage(roomId, message) {
        if (!this.storageAvailable) return;
        
        try {
            const storageKey = `chat_messages_${roomId}`;
            let messages = [];
            
            // Lấy tin nhắn đã lưu
            const storedMessages = localStorage.getItem(storageKey);
            if (storedMessages) {
                messages = JSON.parse(storedMessages);
            }
            
            // Thêm tin nhắn mới
            messages.push(message);
            
            // Giới hạn số lượng tin nhắn lưu trữ (50 tin nhắn gần nhất)
            if (messages.length > 50) {
                messages = messages.slice(-50);
            }
            
            // Lưu lại
            localStorage.setItem(storageKey, JSON.stringify(messages));
        } catch (e) {
            console.error('Lỗi khi lưu tin nhắn:', e);
        }
    }
    
    /**
     * Lấy tin nhắn từ bộ nhớ tạm
     */
    getStoredMessages(roomId) {
        if (!this.storageAvailable) return [];
        
        try {
            const storageKey = `chat_messages_${roomId}`;
            const storedMessages = localStorage.getItem(storageKey);
            
            if (!storedMessages) return [];
            
            return JSON.parse(storedMessages);
        } catch (e) {
            console.error('Lỗi khi lấy tin nhắn:', e);
            return [];
        }
    }
    
    /**
     * Xóa tin nhắn từ bộ nhớ tạm
     */
    clearStoredMessages(roomId) {
        if (!this.storageAvailable) return;
        
        try {
            const storageKey = `chat_messages_${roomId}`;
            localStorage.removeItem(storageKey);
        } catch (e) {
            console.error('Lỗi khi xóa tin nhắn:', e);
        }
    }
    
    /**
     * Lưu trạng thái unread messages
     */
    storeUnreadMessages() {
        if (!this.storageAvailable) return;
        
        try {
            const storageKey = `unread_messages_${this.chatApp.customerId}`;
            localStorage.setItem(storageKey, JSON.stringify(this.chatApp.unreadMessages));
        } catch (e) {
            console.error('Lỗi khi lưu trạng thái tin nhắn chưa đọc:', e);
        }
    }
    
    /**
     * Lấy trạng thái unread messages
     */
    getStoredUnreadMessages() {
        if (!this.storageAvailable || !this.chatApp.customerId) return {};
        
        try {
            const storageKey = `unread_messages_${this.chatApp.customerId}`;
            const storedUnread = localStorage.getItem(storageKey);
            
            if (!storedUnread) return {};
            
            return JSON.parse(storedUnread);
        } catch (e) {
            console.error('Lỗi khi lấy trạng thái tin nhắn chưa đọc:', e);
            return {};
        }
    }
    
    /**
     * Lưu danh sách phòng chat công khai đã tham gia
     */
    storeJoinedPublicRooms() {
        if (!this.storageAvailable || !this.chatApp.customerId) return;
        
        try {
            const storageKey = `joined_public_rooms_${this.chatApp.customerId}`;
            
            // Lọc chỉ lấy các phòng công khai
            const publicRooms = this.chatApp.joinedRooms.filter(room => room._id);
            
            if (publicRooms.length > 0) {
                localStorage.setItem(storageKey, JSON.stringify(publicRooms));
            }
        } catch (e) {
            console.error('Lỗi khi lưu danh sách phòng chat công khai đã tham gia:', e);
        }
    }
    
    /**
     * Lấy danh sách phòng chat công khai đã tham gia
     */
    getStoredJoinedPublicRooms() {
        if (!this.storageAvailable || !this.chatApp.customerId) return [];
        
        try {
            const storageKey = `joined_public_rooms_${this.chatApp.customerId}`;
            const storedRooms = localStorage.getItem(storageKey);
            
            if (!storedRooms) return [];
            
            const rooms = JSON.parse(storedRooms);
            return rooms;
        } catch (e) {
            console.error('Lỗi khi lấy danh sách phòng chat công khai đã tham gia:', e);
            return [];
        }
    }
    
    /**
     * Thêm phòng chat công khai vào danh sách đã tham gia
     */
    addJoinedPublicRoom(room) {
        if (!this.storageAvailable || !this.chatApp.customerId || !room || !room._id) return;
        
        try {
            const storageKey = `joined_public_rooms_${this.chatApp.customerId}`;
            let joinedRooms = this.getStoredJoinedPublicRooms();
            
            // Kiểm tra xem phòng đã có trong danh sách chưa
            const existingRoomIndex = joinedRooms.findIndex(r => r._id === room._id);
            
            if (existingRoomIndex === -1) {
                // Thêm phòng vào danh sách
                joinedRooms.push(room);
                localStorage.setItem(storageKey, JSON.stringify(joinedRooms));
            }
        } catch (e) {
            console.error('Lỗi khi thêm phòng chat công khai vào danh sách đã tham gia:', e);
        }
    }
    
    /**
     * Xóa phòng chat công khai khỏi danh sách đã tham gia
     */
    removeJoinedPublicRoom(roomId) {
        if (!this.storageAvailable || !this.chatApp.customerId || !roomId) return;
        
        try {
            const storageKey = `joined_public_rooms_${this.chatApp.customerId}`;
            let joinedRooms = this.getStoredJoinedPublicRooms();
            
            // Lọc bỏ phòng cần xóa
            joinedRooms = joinedRooms.filter(room => room._id !== roomId);
            
            localStorage.setItem(storageKey, JSON.stringify(joinedRooms));
        } catch (e) {
            console.error('Lỗi khi xóa phòng chat công khai khỏi danh sách đã tham gia:', e);
        }
    }
} 