// MessageManager.js - Quản lý tin nhắn

export class MessageManager {
    constructor(chatApp) {
        this.chatApp = chatApp;
        this.messageTemplates = {
            text: null,
            file: null,
            system: null
        };
        
        // Set lưu trữ ID của các tin nhắn đã hiển thị
        this.displayedMessageIds = new Set();
        
        // Khởi tạo các template tin nhắn
        this.initMessageTemplates();
    }
    
    /**
     * Khởi tạo các template tin nhắn
     */
    initMessageTemplates() {
        // Template tin nhắn văn bản
        this.messageTemplates.text = `
            <div class="message-avatar">
                <img src="{{avatar}}" alt="Avatar">
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">{{senderName}}</span>
                    <span class="time">{{time}}</span>
                </div>
                <div class="message-text">{{content}}</div>
            </div>
        `;
        
        // Template tin nhắn file
        this.messageTemplates.file = `
            <div class="message-avatar">
                <img src="{{avatar}}" alt="Avatar">
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">{{senderName}}</span>
                    <span class="time">{{time}}</span>
                </div>
                <div class="file-message">
                    <div class="file-icon"><i class="{{fileIcon}}"></i></div>
                    <div class="file-info">
                        <div class="file-name">{{fileName}}</div>
                        <div class="file-size">{{fileSize}}</div>
                    </div>
                    <a href="{{fileUrl}}" class="file-download" download="{{fileName}}">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
                {{#isImage}}
                <div class="image-preview">
                    <img src="{{fileUrl}}" alt="{{fileName}}" onclick="window.customerChat.messageManager.showImageModal('{{fileUrl}}')">
                </div>
                {{/isImage}}
            </div>
        `;
        
        // Template tin nhắn hệ thống
        this.messageTemplates.system = `
            <div class="system-message">
                <div class="system-icon"><i class="fas fa-info-circle"></i></div>
                <div class="system-content">{{content}}</div>
            </div>
        `;
    }
    
    /**
     * Lấy hoặc tạo container tin nhắn
     */
    getOrCreateMessagesContainer() {
        let messagesContainer = document.getElementById('messages-container');
        
        if (!messagesContainer) {
            const chatContent = this.chatApp.ui.elements.chatContent;
            messagesContainer = document.createElement('div');
            messagesContainer.className = 'messages';
            messagesContainer.id = 'messages-container';
            chatContent.appendChild(messagesContainer);
        }
        
        return messagesContainer;
    }
    
    /**
     * Hiển thị tin nhắn
     */
    displayMessage(message) {
        console.log('displayMessage:', message);
        // Kiểm tra xem tin nhắn đã tồn tại trong DOM chưa
        const messagesContainer = this.getOrCreateMessagesContainer();
        if (message.id && !message.isTemp) {
            const existingMessage = messagesContainer.querySelector(`.message[data-id="${message.id}"]`);
            if (existingMessage) {
                console.log('Tin nhắn đã tồn tại trong DOM, bỏ qua:', message.id);
                return;
            }
        }
        
        // Tạo phần tử tin nhắn
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        // Xác định loại tin nhắn dựa trên sender_id, sender_type và isTemp
        // Quan trọng: Nếu sender_name là "Người dùng ẩn danh" và sender_type là "customer", 
        // thì đây là tin nhắn của người dùng hiện tại
        const isCurrentUser = message.isTemp || 
                              (message.sender_id && message.sender_id === this.chatApp.customerId) ||
                              (message.sender === 'customer' && message.sender_name === this.chatApp.customerInfo?.name) ||
                              (message.sender_type === 'customer' && message.sender_id === this.chatApp.customerId);
        
        const isSystemMessage = message.sender === 'system' || message.sender_type === 'system';
        
        // Thêm class dựa trên loại người gửi
        if (isSystemMessage) {
            messageElement.classList.add('system');
        } else if (isCurrentUser) {
            messageElement.classList.add('customer');
        } else {
            messageElement.classList.add('other');
            
            // Lấy màu tùy chỉnh từ biến toàn cục nếu có
            if (window.chatConfig && window.chatConfig.otherMessageBgColor) {
                messageElement.style.backgroundColor = window.chatConfig.otherMessageBgColor;
            }
            if (window.chatConfig && window.chatConfig.otherMessageTextColor) {
                messageElement.style.color = window.chatConfig.otherMessageTextColor;
            }
            
            // Thêm tên người gửi cho tin nhắn của đối phương
            if (message.sender_name) {
                const senderName = document.createElement('div');
                senderName.className = 'sender-name';
                senderName.textContent = message.sender_name;
                messageElement.appendChild(senderName);
            }
            
            // Thêm avatar cho người gửi
            const avatarElement = document.createElement('div');
            avatarElement.className = 'sender-avatar';
            
            if (message.sender_avatar && message.sender_avatar.trim() !== '') {
                // Nếu có avatar
                const avatarImg = document.createElement('img');
                avatarImg.src = message.sender_avatar;
                avatarImg.alt = message.sender_name || 'User';
                avatarImg.onerror = function() {
                    // Nếu load ảnh lỗi, tạo avatar mặc định
                    this.parentNode.innerHTML = this.createDefaultAvatar(message.sender_name);
                }.bind(this);
                avatarElement.appendChild(avatarImg);
            } else {
                // Nếu không có avatar, tạo avatar mặc định
                avatarElement.innerHTML = this.createDefaultAvatar(message.sender_name);
            }
            
            messageElement.appendChild(avatarElement);
        }
        
        // Thêm class nếu là tin nhắn tạm thời
        if (message.isTemp) {
            messageElement.classList.add('temp-message');
            messageElement.setAttribute('data-temp', 'true');
        }
        
        // Đặt ID cho tin nhắn
        if (message.id) {
            messageElement.setAttribute('data-id', message.id);
            
            // Thêm ID vào Set để tránh hiển thị lại
            if (!message.isTemp) {
                this.displayedMessageIds.add(message.id);
            }
        }
        
        // Tạo container cho nội dung và thời gian
        const contentContainer = document.createElement('div');
        contentContainer.className = 'message-content-container';
        
        // Xử lý nội dung tin nhắn
        const messageText = document.createElement('span');
        messageText.className = 'message-text';
        
        // Xử lý nội dung tin nhắn (thêm liên kết, emoji, v.v.)
        const processedContent = this.processMessageContent(message.content || '');
        messageText.innerHTML = processedContent;
        
        // Thêm nội dung vào container
        contentContainer.appendChild(messageText);
        
        // Thêm thời gian (trừ tin nhắn hệ thống)
        if (!isSystemMessage) {
            const timeElement = document.createElement('span');
            timeElement.className = 'time';
            
            try {
                timeElement.textContent = this.formatTime(message.createdAt || message.created_at || new Date());
            } catch (error) {
                console.error('Lỗi khi định dạng thời gian:', error);
                timeElement.textContent = 'Vừa xong';
            }
            
            contentContainer.appendChild(timeElement);
        }
        
        // Thêm container vào tin nhắn
        messageElement.appendChild(contentContainer);
        
        // Thêm tin nhắn vào container
        messagesContainer.appendChild(messageElement);
        
        // Cuộn xuống dưới
        this.scrollToBottom();
    }
    
    /**
     * Xử lý nội dung tin nhắn
     */
    processMessageContent(content) {
        if (!content) return '';
        
        // Chuyển đổi URL thành liên kết
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
        
        // Chuyển đổi xuống dòng thành thẻ <br>
        content = content.replace(/\n/g, '<br>');
        
        return content;
    }
    
    /**
     * Hiển thị tin nhắn hệ thống
     */
    displaySystemMessage(content) {
        this.displayMessage({
            content,
            sender: 'system',
            sender_type: 'system',
            type: 'text',
            createdAt: new Date()
        });
    }
    
    /**
     * Định dạng thời gian
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        
        // Định dạng giờ:phút AM/PM
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // Chuyển 0 thành 12
        
        return `${hours}:${minutes} ${ampm}`;
    }
    
    /**
     * Cuộn xuống dưới cùng
     */
    scrollToBottom() {
        const messagesContainer = this.getOrCreateMessagesContainer();
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    /**
     * Xử lý tin nhắn mới
     */
    handleNewMessage(message) {
        console.log('MessageManager xử lý tin nhắn mới:', message);
        
        // Kiểm tra xem tin nhắn có ID không
        if (!message.id) {
            console.log('Tin nhắn không có ID, hiển thị trực tiếp');
            this.displayMessage(message);
            return;
        }
        
        // Kiểm tra xem tin nhắn đã được hiển thị chưa
        if (this.displayedMessageIds.has(message.id)) {
            console.log('Tin nhắn đã được hiển thị trước đó, bỏ qua:', message.id);
            return;
        }
        
        // Kiểm tra xem tin nhắn đã tồn tại trong DOM chưa
        const messagesContainer = this.getOrCreateMessagesContainer();
        const existsInDOM = messagesContainer.querySelector(`.message[data-id="${message.id}"]`);
        
        if (existsInDOM) {
            console.log('Tin nhắn đã tồn tại trong DOM, bỏ qua:', message.id);
            return;
        }
        
        // Kiểm tra xem tin nhắn có phải từ khách hàng hiện tại không
        const isFromCurrentCustomer = 
            (message.sender_type === 'customer' && message.sender_id === this.chatApp.customerId) ||
            (message.sender === 'customer' && message.sender_id === this.chatApp.customerId);
        
        // Nếu tin nhắn từ khách hàng hiện tại, đảm bảo sender_name đúng
        if (isFromCurrentCustomer) {
            message.sender_name = this.chatApp.customerInfo?.name || 'Bạn';
        }
        
        // Hiển thị tin nhắn
        console.log('Hiển thị tin nhắn mới:', message.id);
        this.displayMessage(message);
        
        // Nếu không phải tin nhắn từ khách hàng hiện tại và không đang xem phòng chat, tăng số tin nhắn chưa đọc
        if (!isFromCurrentCustomer && 
            (this.chatApp.currentRoomId !== message.room_id && this.chatApp.currentRoomId !== message.roomId)) {
            this.chatApp.increaseUnreadCount(message.room_id || message.roomId);
        }
        
        // Phát âm thanh thông báo nếu không phải tin nhắn từ khách hàng hiện tại
        if (!isFromCurrentCustomer) {
            this.playNotificationSound();
        }
        
        // Cuộn xuống dưới để hiển thị tin nhắn mới
        this.scrollToBottom();
    }
    
    /**
     * Phát âm thanh thông báo
     */
    playNotificationSound() {
        try {
            const audio = new Audio('sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play();
        } catch (error) {
            console.error('Không thể phát âm thanh thông báo:', error);
        }
    }
    
    /**
     * Hiển thị modal hình ảnh
     */
    showImageModal(src) {
        // Kiểm tra xem đã có modal chưa
        let modal = document.getElementById('image-modal');
        
        if (!modal) {
            // Tạo modal
            modal = document.createElement('div');
            modal.id = 'image-modal';
            modal.className = 'image-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <img src="" alt="Hình ảnh đầy đủ">
                </div>
            `;
            document.body.appendChild(modal);
            
            // Thêm sự kiện đóng modal
            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            // Thêm sự kiện click bên ngoài để đóng modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
        
        // Cập nhật src cho hình ảnh
        modal.querySelector('img').src = src;
        
        // Hiển thị modal
        modal.style.display = 'flex';
    }
    
    /**
     * Tạo avatar mặc định từ tên người dùng
     */
    createDefaultAvatar(name) {
        // Lấy chữ cái đầu tiên của tên
        const initial = name && name.trim() ? name.trim()[0].toUpperCase() : '?';
        
        // Tạo màu ngẫu nhiên nhưng ổn định cho mỗi tên
        const getColorFromName = (name) => {
            if (!name) return '#4285f4'; // Màu mặc định là xanh Google
            
            // Tạo mã hash đơn giản từ tên
            let hash = 0;
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            // Chuyển hash thành màu
            const colors = [
                '#4285f4', // Xanh Google
                '#34a853', // Xanh lá Google
                '#fbbc05', // Vàng Google
                '#ea4335', // Đỏ Google
                '#673ab7', // Tím
                '#3f51b5', // Indigo
                '#009688', // Teal
                '#ff5722'  // Deep Orange
            ];
            
            return colors[Math.abs(hash) % colors.length];
        };
        
        const bgColor = getColorFromName(name);
        
        return `<div class="avatar-initial" style="background-color: ${bgColor}; color: white;">${initial}</div>`;
    }
} 