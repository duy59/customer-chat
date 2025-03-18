// main.js - File chính khởi tạo ứng dụng chat

import { CustomerChat } from './CustomerChat.js';

// Khởi tạo ứng dụng khi trang đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo ứng dụng chat
    window.customerChat = new CustomerChat();
}); 