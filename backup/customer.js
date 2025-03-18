class CustomerChat {
    constructor() {
        this.apiKey = document.getElementById('api-key').value;
        this.socket = null;
        this.customerId = null;
        this.customerInfo = null;
        this.currentRoomId = null;
        this.availableRooms = [];
        this.joinedRooms = [];
        this.unreadMessages = {};
        this.totalUnread = 0;
        this.domainInfo = null;
        this.isRegistered = false;
        this.isConnected = false;
        this.currentView = 'welcome'; // welcome, register, direct-chat, room-list, chat-room
        
        // Khởi tạo giao diện
        this.initUI();
        
        // Khởi tạo kết nối socket
        this.initSocket();
        
        // Kiểm tra thông tin khách hàng đã lưu
        this.checkStoredCustomerInfo();
    }
    
    /**
     * Khởi tạo giao diện chat
     */
    initUI() {
        // Tạo container chính
        const container = document.getElementById('chat-container');
        
        // Tạo bong bóng chat
        const chatBubble = document.createElement('div');
        chatBubble.className = 'chat-bubble';
        chatBubble.innerHTML = '<i class="fas fa-comments"></i>';
        chatBubble.addEventListener('click', () => this.toggleChatWindow());
        container.appendChild(chatBubble);
        
        // Thêm badge thông báo
        const notificationBadge = document.createElement('div');
        notificationBadge.className = 'notification-badge';
        notificationBadge.style.display = 'none';
        notificationBadge.textContent = '0';
        chatBubble.appendChild(notificationBadge);
        
        // Tạo cửa sổ chat
        const chatWindow = document.createElement('div');
        chatWindow.className = 'chat-window';
        container.appendChild(chatWindow);
        
        // Tạo header
        const chatHeader = document.createElement('div');
        chatHeader.className = 'chat-header';
        chatHeader.innerHTML = `
            <button class="back-btn"><i class="fas fa-arrow-left"></i></button>
            <img class="logo" src="images/admin.png" alt="Logo">
            <div class="title">Chat Hỗ Trợ</div>
            <button class="close-btn"><i class="fas fa-times"></i></button>
        `;
        chatWindow.appendChild(chatHeader);
        
        // Thêm sự kiện cho nút đóng
        chatHeader.querySelector('.close-btn').addEventListener('click', () => this.toggleChatWindow(false));
        
        // Thêm sự kiện cho nút quay lại
        chatHeader.querySelector('.back-btn').addEventListener('click', () => this.navigateBack());
        
        // Tạo phần nội dung
        const chatContent = document.createElement('div');
        chatContent.className = 'chat-content';
        chatWindow.appendChild(chatContent);
        
        // Tạo phần nhập liệu
        const chatInput = document.createElement('div');
        chatInput.className = 'chat-input';
        chatInput.innerHTML = `
            <label class="attachment-btn">
                <i class="fas fa-paperclip"></i>
                <input type="file" id="file-input">
            </label>
            <input type="text" placeholder="Nhập tin nhắn...">
            <button><i class="fas fa-paper-plane"></i></button>
        `;
        chatWindow.appendChild(chatInput);
        
        // Thêm sự kiện cho nút gửi
        chatInput.querySelector('button').addEventListener('click', () => this.sendMessage());
        
        // Thêm sự kiện cho input
        chatInput.querySelector('input[type="text"]').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Thêm sự kiện cho input file
        chatInput.querySelector('input[type="file"]').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
        
        // Tạo modal xem ảnh
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <span class="close-modal">&times;</span>
            <div class="modal-content">
                <img src="" alt="Full size image">
            </div>
        `;
        container.appendChild(modal);
        
        // Thêm sự kiện đóng modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Lưu các phần tử DOM để sử dụng sau
        this.elements = {
            container,
            chatBubble,
            notificationBadge,
            chatWindow,
            chatHeader,
            chatContent,
            chatInput,
            modal
        };
        
        // Thêm Font Awesome
        this.loadFontAwesome();
        
        // Hiển thị màn hình chào mừng
        this.showWelcomeScreen();
    }
    
    /**
     * Tải Font Awesome
     */
    loadFontAwesome() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
        document.head.appendChild(link);
    }
    
    /**
     * Khởi tạo kết nối socket
     */
    initSocket() {
        // Lấy API key từ phần tử HTML (nếu có)
        const apiKeyElement = document.getElementById('api-key');
        this.apiKey = apiKeyElement ? apiKeyElement.value : null;
        
        // Lấy URL của trang hiện tại làm origin
        this.origin = window.location.origin;
        
        ('Khởi tạo kết nối với API key:', this.apiKey);
        // console.log('Origin:', this.origin);
        
        // Tạo kết nối Socket.IO với thông tin xác thực
        this.socket = io({
            auth: {
                apiKey: this.apiKey,
                origin: this.origin
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });
        
        // Xử lý sự kiện kết nối
        this.socket.on('connect', () => {
            console.log('Đã kết nối đến server với ID:', this.socket.id);
            this.isConnected = true;
            
            // Nếu đã có thông tin khách hàng, tự động đăng ký lại
            const storedInfo = this.getStoredCustomerInfo();
            if (storedInfo && storedInfo.customerId) {
                this.customerId = storedInfo.customerId;
                this.isRegistered = true;
                
                // Thông báo server rằng khách hàng đã kết nối lại
                this.socket.emit('customer_reconnect', {
                    customerId: this.customerId,
                    apiKey: this.apiKey,
                    origin: this.origin
                });
            }
            
            // Ẩn thông báo lỗi kết nối nếu đang hiển thị
            const errorNotification = document.querySelector('.chat-notification.error');
            if (errorNotification) {
                errorNotification.style.display = 'none';
            }
        });
        
        // Xử lý sự kiện ngắt kết nối
        this.socket.on('disconnect', (reason) => {
            console.log('Mất kết nối với server:', reason);
            this.isConnected = false;
            
            // Hiển thị thông báo mất kết nối
            this.showNotification('Mất kết nối với server. Đang thử kết nối lại...', 'warning');
        });
        
        // Xử lý sự kiện lỗi kết nối
        this.socket.on('connect_error', (error) => {
            console.error('Lỗi kết nối:', error);
            this.isConnected = false;
            
            // Hiển thị thông báo lỗi kết nối
            this.showNotification('Không thể kết nối đến server. Vui lòng thử lại sau.', 'error');
        });
        
        // Xử lý sự kiện kết nối lại
        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Đã kết nối lại sau', attemptNumber, 'lần thử');
            this.isConnected = true;
            
            // Hiển thị thông báo kết nối lại thành công
            this.showNotification('Đã kết nối lại với server.', 'success');
        });
        
        // Xử lý sự kiện tin nhắn mới
        this.socket.on('new_message', (message) => {
            this.handleNewMessage(message);
        });
        
        // Xử lý sự kiện admin đang nhập
        this.socket.on('admin_typing', (data) => {
            this.showTypingIndicator(data.isTyping);
        });
        
        // Xử lý sự kiện kết thúc chat
        this.socket.on('chat_closed', (data) => {
            this.handleChatClosed(data);
        });
        
        // Xử lý sự kiện auto chat
        this.socket.on('auto_chat', (message) => {
            this.handleAutoChat(message);
        });
    }
    
    /**
     * Kiểm tra thông tin khách hàng đã lưu
     */
    checkStoredCustomerInfo() {
        const storedData = this.getStoredCustomerInfo();
        
        if (storedData) {
            this.customerInfo = storedData.customerInfo;
            this.customerId = storedData.customerId;
            this.isRegistered = true;
            
            // console.log('Đã tải thông tin khách hàng từ localStorage:', this.customerInfo);
            // console.log('Đã tải customerId từ localStorage:', this.customerId);
            
            // Kiểm tra xem có đầy đủ thông tin bắt buộc không
            const hasRequiredInfo = this.customerInfo && 
                                   this.customerInfo.name && 
                                   this.customerInfo.email && 
                                   this.customerInfo.phone;
            
            if (!hasRequiredInfo) {
                console.warn('Thông tin khách hàng không đầy đủ, cần cập nhật');
                // Nếu không đủ thông tin, vẫn giữ trạng thái đăng ký nhưng sẽ yêu cầu cập nhật sau
                this.needInfoUpdate = true;
            }
            
            // Thêm nút xóa thông tin đăng nhập vào màn hình chào mừng
            this.addClearLoginButton();
            
            // Nếu đã kết nối, gửi thông tin khách hàng
            if (this.isConnected) {
                this.reconnectCustomer();
            }
        }
    }
    
    /**
     * Thêm nút xóa thông tin đăng nhập vào màn hình chào mừng
     */
    addClearLoginButton() {
        // Đợi một chút để đảm bảo giao diện đã được tạo
        setTimeout(() => {
            const welcomeScreen = document.querySelector('.welcome-screen');
            if (welcomeScreen) {
                // Kiểm tra xem nút đã tồn tại chưa
                if (!welcomeScreen.querySelector('#clear-login-btn')) {
                    // Tạo nút xóa thông tin đăng nhập
                    const clearButton = document.createElement('button');
                    clearButton.id = 'clear-login-btn';
                    clearButton.className = 'clear-login-btn';
                    clearButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Đăng xuất';
                    
                    // Lưu tham chiếu đến this để sử dụng trong sự kiện click
                    const self = this;
                    
                    // Thêm sự kiện click
                    clearButton.addEventListener('click', function() {
                        // Hiển thị xác nhận
                        if (confirm('Bạn có chắc chắn muốn đăng xuất? Thông tin đăng nhập của bạn sẽ bị xóa.')) {
                            self.clearStoredCustomerInfo();
                            // Tải lại trang để làm mới hoàn toàn
                            window.location.reload();
                        }
                    });
                    
                    // Thêm CSS cho nút
                    const style = document.createElement('style');
                    style.textContent = `
                        .clear-login-btn {
                            margin-top: 15px;
                            padding: 8px 15px;
                            background-color: #f44336;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 100%;
                        }
                        
                        .clear-login-btn i {
                            margin-right: 8px;
                        }
                        
                        .clear-login-btn:hover {
                            background-color: #d32f2f;
                        }
                    `;
                    document.head.appendChild(style);
                    
                    // Thêm nút vào màn hình chào mừng
                    welcomeScreen.appendChild(clearButton);
                }
            }
        }, 500);
    }
    
    /**
     * Lưu thông tin khách hàng vào localStorage
     */
    storeCustomerInfo() {
        if (this.customerInfo && this.customerId) {
            try {
                // Đảm bảo thông tin cá nhân được lưu
                const customerInfoToStore = {
                    ...this.customerInfo,
                    name: this.customerInfo.name || '',
                    email: this.customerInfo.email || '',
                    phone: this.customerInfo.phone || ''
                };
                
                localStorage.setItem('customerInfo', JSON.stringify(customerInfoToStore));
                localStorage.setItem('customerId', this.customerId);
                // console.log('Đã lưu thông tin khách hàng vào localStorage:', customerInfoToStore);
                // console.log('Đã lưu customerId vào localStorage:', this.customerId);
            } catch (error) {
                console.error('Lỗi khi lưu thông tin khách hàng:', error);
            }
        }
    }
    
    /**
     * Lấy thông tin khách hàng từ localStorage
     */
    getStoredCustomerInfo() {
        try {
            const storedInfo = localStorage.getItem('customerInfo');
            const storedId = localStorage.getItem('customerId');
            
            if (storedInfo && storedId) {
                return {
                    customerInfo: JSON.parse(storedInfo),
                    customerId: storedId
                };
            }
        } catch (error) {
            console.error('Lỗi khi đọc thông tin khách hàng từ localStorage:', error);
        }
        
        return null;
    }
    
    /**
     * Kết nối lại với tư cách khách hàng đã đăng ký
     */
    reconnectCustomer() {
        // Lấy thông tin khách hàng đã lưu
        const storedInfo = this.getStoredCustomerInfo();
        if (!storedInfo || !storedInfo.customerId) {
            console.error('Không tìm thấy thông tin khách hàng đã lưu');
            return;
        }
        
        // Chuẩn bị dữ liệu để gửi
        const reconnectData = {
            customerId: this.customerId,
            apiKey: this.apiKey,
            origin: this.origin,
            domain: window.location.hostname // Thêm thông tin domain hiện tại
        };
        
        // Thêm thông tin cá nhân nếu có
        if (storedInfo.customerInfo) {
            if (storedInfo.customerInfo.name) reconnectData.name = storedInfo.customerInfo.name;
            if (storedInfo.customerInfo.email) reconnectData.email = storedInfo.customerInfo.email;
            if (storedInfo.customerInfo.phone) reconnectData.phone = storedInfo.customerInfo.phone;
        }
        
        console.log('Kết nối lại với thông tin:', reconnectData);
        
        this.socket.emit('customer_reconnect', reconnectData, (response) => {
            if (response && response.success) {
                console.log('Kết nối lại thành công:', response);
                // Nếu có phòng chat đang hoạt động, tự động tham gia lại
                if (response.activeRoomId) {
                    this.currentRoomId = response.activeRoomId;
                    this.showChatRoom(response.room);
                    this.loadChatHistory(this.currentRoomId);
                }
            } else {
                console.error('Kết nối lại thất bại:', response ? response.error : 'Không có phản hồi');
                // Xóa thông tin cũ và yêu cầu đăng ký lại
                localStorage.removeItem('customerInfo');
                localStorage.removeItem('customerId');
                this.isRegistered = false;
                this.customerId = null;
                this.customerInfo = null;
                
                // Hiển thị thông báo lỗi
                this.showNotification('Phiên đăng nhập đã hết hạn. Vui lòng đăng ký lại.', 'error');
                
                // Hiển thị form đăng ký
                this.showRegistrationForm('direct');
            }
        });
    }
    
    /**
     * Hiển thị/ẩn cửa sổ chat
     */
    toggleChatWindow(show = null) {
        const { chatWindow, notificationBadge } = this.elements;
        
        // Nếu không chỉ định, đảo trạng thái hiện tại
        if (show === null) {
            show = !chatWindow.classList.contains('active');
        }
        
        if (show) {
            chatWindow.classList.add('active');
            
            // Reset số tin nhắn chưa đọc
            this.totalUnread = 0;
            notificationBadge.textContent = '0';
            notificationBadge.style.display = 'none';
        } else {
            chatWindow.classList.remove('active');
        }
    }
    
    /**
     * Hiển thị màn hình chào mừng
     */
    showWelcomeScreen() {
        const { chatContent, chatInput, chatHeader } = this.elements;
        
        // Ẩn phần nhập liệu
        chatInput.style.display = 'none';
        
        // Ẩn nút quay lại
        chatHeader.querySelector('.back-btn').style.display = 'none';
        
        // Cập nhật tiêu đề
        chatHeader.querySelector('.title').textContent = 'Chat Hỗ Trợ';
        
        // Kiểm tra xem người dùng đã đăng nhập chưa
        const isLoggedIn = this.isRegistered && this.customerId && this.customerInfo;
        
        // Tạo nội dung chào mừng
        let welcomeHTML = `
            <div class="welcome-screen">
                <div class="welcome-message">
                    <h3>Chào mừng${isLoggedIn && this.customerInfo.name ? ' ' + this.customerInfo.name : ''} bạn!</h3>
                    <p>Chúng tôi có thể giúp gì cho bạn hôm nay?</p>
                </div>
        `;
        
        // Hiển thị thông tin người dùng nếu đã đăng nhập
        if (isLoggedIn) {
            welcomeHTML += `
                <div class="user-info">
                    <div class="user-info-item">
                        <i class="fas fa-user"></i>
                        <span>${this.customerInfo.name || 'Chưa cập nhật'}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-envelope"></i>
                        <span>${this.customerInfo.email || 'Chưa cập nhật'}</span>
                    </div>
                    <div class="user-info-item">
                        <i class="fas fa-phone"></i>
                        <span>${this.customerInfo.phone || 'Chưa cập nhật'}</span>
                    </div>
                </div>
            `;
        }
        
        // Thêm các tùy chọn chat
        welcomeHTML += `
                <div class="chat-options">
                    <button class="option-btn" id="direct-chat-btn">
                        <i class="fas fa-headset"></i>
                        <span>Chat với nhân viên hỗ trợ</span>
                    </button>
                    <button class="option-btn" id="room-chat-btn">
                        <i class="fas fa-users"></i>
                        <span>Tham gia phòng chat</span>
                    </button>
                </div>
            </div>
        `;
        
        chatContent.innerHTML = welcomeHTML;
        
        // Thêm CSS cho thông tin người dùng
        const style = document.createElement('style');
        style.textContent = `
            .user-info {
                background-color: #f5f5f5;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 20px;
            }
            
            .user-info-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .user-info-item:last-child {
                margin-bottom: 0;
            }
            
            .user-info-item i {
                width: 20px;
                margin-right: 10px;
                color: #2196F3;
            }
        `;
        document.head.appendChild(style);
        
        // Thêm sự kiện cho các nút
        chatContent.querySelector('#direct-chat-btn').addEventListener('click', () => {
            if (this.isRegistered) {
                this.startDirectChat();
            } else {
                this.showRegistrationForm('direct');
            }
        });
        
        chatContent.querySelector('#room-chat-btn').addEventListener('click', () => {
            if (this.isRegistered) {
                this.showRoomSelection();
            } else {
                this.showRegistrationForm('room');
            }
        });
        
        // Thêm nút xóa thông tin đăng nhập nếu đã đăng nhập
        if (isLoggedIn) {
            this.addClearLoginButton();
        }
        
        this.currentView = 'welcome';
    }
    
    /**
     * Hiển thị form đăng ký
     */
    showRegistrationForm(nextAction = 'direct') {
        const { chatContent, chatHeader } = this.elements;
        
        // Hiển thị nút quay lại
        chatHeader.querySelector('.back-btn').style.display = 'block';
        
        // Cập nhật tiêu đề
        chatHeader.querySelector('.title').textContent = 'Đăng ký thông tin';
        
        // Tạo form đăng ký
        chatContent.innerHTML = `
            <div class="registration-form">
                <h3>Vui lòng nhập thông tin của bạn</h3>
                <form id="registration-form">
                    <div class="form-group">
                        <label for="name">Họ tên <span class="required">*</span></label>
                        <input type="text" id="name" placeholder="Nhập họ tên của bạn" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email <span class="required">*</span></label>
                        <input type="email" id="email" placeholder="Nhập email của bạn" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Số điện thoại <span class="required">*</span></label>
                        <input type="tel" id="phone" placeholder="Nhập số điện thoại của bạn" required>
                    </div>
                    <div class="form-note">
                        <small>Các trường có dấu <span class="required">*</span> là bắt buộc</small>
                    </div>
                    <button type="submit" class="submit-btn">Bắt đầu chat</button>
                </form>
            </div>
        `;
        
        // Thêm CSS cho trường bắt buộc
        const style = document.createElement('style');
        style.textContent = `
            .required {
                color: #ff4757;
            }
            .form-note {
                margin-bottom: 15px;
                font-size: 12px;
                color: #666;
            }
        `;
        document.head.appendChild(style);
        
        // Thêm sự kiện cho form
        chatContent.querySelector('#registration-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = chatContent.querySelector('#name').value.trim();
            const email = chatContent.querySelector('#email').value.trim();
            const phone = chatContent.querySelector('#phone').value.trim();
            
            // Kiểm tra các trường bắt buộc
            if (!name || !email || !phone) {
                this.showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
                return;
            }
            
            this.registerCustomer({
                name,
                email,
                phone,
                nextAction
            });
        });
        
        this.currentView = 'register';
    }
    
    /**
     * Đăng ký thông tin khách hàng
     */
    registerCustomer(info) {
        // Kiểm tra kết nối và thử kết nối lại nếu cần
        if (!this.isConnected) {
            console.log('Chưa kết nối đến server, đang thử kết nối lại...');
            
            // Hiển thị thông báo đang kết nối
            this.showNotification('Đang kết nối đến server...', 'info');
            
            // Thử kết nối lại
            this.socket.connect();
            
            // Đợi kết nối thành công rồi đăng ký
            this.socket.once('connect', () => {
                console.log('Đã kết nối lại, tiếp tục đăng ký');
                this.isConnected = true;
                this.registerCustomer(info);
            });
            
            return;
        }
        
        console.log('Đăng ký khách hàng với thông tin:', info);
        
        // Lấy thông tin thiết bị
        const deviceInfo = this.getDeviceInfo();
        
        // Tạo thông tin khách hàng
        this.customerInfo = {
            ...info,
            ...deviceInfo,
            api_key: this.apiKey,
            origin: this.origin,
            domain: window.location.hostname // Thêm thông tin domain hiện tại
        };
        
        // Hiển thị thông báo đang đăng ký
        this.showNotification('Đang đăng ký thông tin...', 'info');
        
        // Gửi thông tin đăng ký
        this.socket.emit('customer_register', this.customerInfo, (response) => {
            if (response && response.success) {
                console.log('Đăng ký thành công:', response);
                
                // Lưu ID khách hàng
                this.customerId = response.customerId || response.customer_id;
                this.isRegistered = true;
                
                // Lưu thông tin khách hàng vào localStorage
                this.storeCustomerInfo();
                
                // Hiển thị thông báo thành công
                this.showNotification('Đăng ký thành công!', 'success');
                
                // Xử lý hành động tiếp theo
                if (info.nextAction === 'direct') {
                    this.startDirectChat();
                } else {
                    this.showRoomSelection();
                }
            } else {
                console.error('Đăng ký thất bại:', response ? response.error : 'Không có phản hồi');
                this.showNotification(response && response.error ? response.error : 'Đăng ký thất bại. Vui lòng thử lại.', 'error');
            }
        });
    }
    
    /**
     * Lấy thông tin thiết bị
     */
    getDeviceInfo() {
        return {
            device_fingerprint: this.generateFingerprint(),
            user_agent: navigator.userAgent,
            referrer_url: document.referrer,
            current_page: window.location.href,
            screen_resolution: `${window.screen.width}x${window.screen.height}`
        };
    }
    
    /**
     * Tạo fingerprint đơn giản cho thiết bị
     */
    generateFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            new Date().getTimezoneOffset(),
            navigator.platform,
            navigator.hardwareConcurrency,
            window.screen.colorDepth,
            window.screen.width + 'x' + window.screen.height
        ];
        
        return btoa(components.join('###')).replace(/=/g, '').substring(0, 32);
    }
    
    /**
     * Hiển thị danh sách phòng chat
     */
    showRoomList(rooms = [], type = 'available') {
        const { chatContent, chatHeader } = this.elements;
        
        // Hiển thị nút quay lại
        chatHeader.querySelector('.back-btn').style.display = 'block';
        
        // Cập nhật tiêu đề
        chatHeader.querySelector('.title').textContent = type === 'joined' ? 'Phòng đã tham gia' : 'Tất cả phòng chat';
        
        // Kiểm tra nếu không có phòng nào
        if (!rooms || rooms.length === 0) {
            chatContent.innerHTML = `
                <div class="welcome-screen">
                    <div class="welcome-message">
                        <h3>${type === 'joined' ? 'Bạn chưa tham gia phòng nào' : 'Không có phòng chat nào'}</h3>
                        <p>${type === 'joined' ? 'Hãy tham gia một phòng chat để bắt đầu trò chuyện.' : 'Hiện tại không có phòng chat nào khả dụng.'}</p>
                    </div>
                    <button class="submit-btn" id="back-to-selection">Quay lại</button>
                </div>
            `;
            
            chatContent.querySelector('#back-to-selection').addEventListener('click', () => {
                this.showRoomSelection();
            });
            
            return;
        }
        
        // Tạo danh sách phòng
        let roomListHTML = `
            <div class="room-list">
        `;
        
        rooms.forEach(room => {
            const isJoined = this.joinedRooms.some(r => r.id === room.id);
            roomListHTML += `
                <div class="room-item" data-id="${room.id}">
                    <div class="room-name">${room.name}</div>
                    <div class="room-description">${room.description || 'Không có mô tả'}</div>
                    <div class="room-status">
                        <span>${room.customer_count || 0} người tham gia</span>
                        <span>${isJoined ? 'Đã tham gia' : ''}</span>
                    </div>
                </div>
            `;
        });
        
        roomListHTML += `
            </div>
            <button class="submit-btn" id="back-to-selection" style="margin-top: 15px;">Quay lại</button>
        `;
        
        chatContent.innerHTML = roomListHTML;
        
        // Thêm sự kiện cho các phòng
        const roomItems = chatContent.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            item.addEventListener('click', () => {
                const roomId = item.getAttribute('data-id');
                this.joinChatRoom(roomId);
            });
        });
        
        // Thêm sự kiện cho nút quay lại
        chatContent.querySelector('#back-to-selection').addEventListener('click', () => {
            this.showRoomSelection();
        });
        
        this.currentView = 'room-list';
    }
    
    /**
     * Hiển thị màn hình chọn phòng chat
     */
    showRoomSelection() {
        // Kiểm tra xem đã đăng ký chưa
        if (!this.isRegistered || !this.customerId) {
            console.error('Chưa đăng ký thông tin khách hàng');
            this.showNotification('Vui lòng đăng ký thông tin trước khi xem phòng chat', 'error');
            this.showRegistrationForm('room');
            return;
        }
        
        // Kiểm tra xem có cần cập nhật thông tin không
        if (this.needInfoUpdate) {
            console.log('Cần cập nhật thông tin khách hàng');
            this.requestInfoUpdate('room');
            return;
        }
        
        const { chatContent, chatInput, chatHeader } = this.elements;
        
        // Ẩn phần nhập liệu
        chatInput.style.display = 'none';
        
        // Hiển thị nút quay lại
        chatHeader.querySelector('.back-btn').style.display = 'block';
        
        // Cập nhật tiêu đề
        chatHeader.querySelector('.title').textContent = 'Chọn phòng chat';
        
        // Tạo nội dung
        chatContent.innerHTML = `
            <div class="welcome-screen">
                <div class="welcome-message">
                    <h3>Phòng chat</h3>
                    <p>Chọn một phòng chat để tham gia hoặc xem các phòng bạn đã tham gia.</p>
                </div>
                <div class="chat-options">
                    <button class="option-btn" id="joined-rooms-btn">
                        <i class="fas fa-history"></i>
                        <span>Phòng đã tham gia</span>
                    </button>
                    <button class="option-btn" id="available-rooms-btn">
                        <i class="fas fa-list"></i>
                        <span>Tất cả phòng chat</span>
                    </button>
                </div>
            </div>
        `;
        
        // Thêm sự kiện cho các nút
        chatContent.querySelector('#joined-rooms-btn').addEventListener('click', () => {
            this.showJoinedRooms();
        });
        
        chatContent.querySelector('#available-rooms-btn').addEventListener('click', () => {
            this.showAvailableRooms();
        });
        
        this.currentView = 'room-selection';
    }
    
    /**
     * Hiển thị danh sách phòng đã tham gia
     */
    showJoinedRooms() {
        // Yêu cầu danh sách phòng đã tham gia
        this.socket.emit('get_joined_rooms', {}, (response) => {
            if (response.success) {
                console.log('Nhận danh sách phòng đã tham gia:', response);
                this.joinedRooms = response.rooms;
                this.showRoomList(this.joinedRooms, 'joined');
            } else {
                console.error('Lấy danh sách phòng đã tham gia thất bại:', response.error);
                this.showNotification(response.error || 'Không thể lấy danh sách phòng. Vui lòng thử lại sau.', 'error');
            }
        });
    }
    
    /**
     * Hiển thị danh sách phòng có sẵn
     */
    showAvailableRooms() {
        // Yêu cầu danh sách phòng có sẵn
        this.socket.emit('get_available_rooms', {}, (response) => {
            if (response.success) {
                console.log('Nhận danh sách phòng có sẵn:', response);
                this.availableRooms = response.rooms;
                this.showRoomList(this.availableRooms, 'available');
            } else {
                console.error('Lấy danh sách phòng có sẵn thất bại:', response.error);
                this.showNotification(response.error || 'Không thể lấy danh sách phòng. Vui lòng thử lại sau.', 'error');
            }
        });
    }
    
    /**
     * Hiển thị tin nhắn
     */
    displayMessage(message) {
        const messagesContainer = this.getOrCreateMessagesContainer();
        
        console.log('Hiển thị tin nhắn:', {
            id: message.id,
            type: message.type,
            sender: message.sender_type || message.sender,
            content: message.content.substring(0, 30) + (message.content.length > 30 ? '...' : ''),
            hasFile: message.file && Object.keys(message.file).length > 0,
            isTemp: message.isTemp
        });
        
        // Kiểm tra xem tin nhắn đã tồn tại chưa (tránh hiển thị trùng lặp)
        // const messageId = message.id || message._id;
        // if (messageId && !message.isTemp && document.querySelector(`.message[data-id="${messageId}"]`)) {
        //     console.log('Tin nhắn đã tồn tại, không hiển thị lại:', messageId);
        //     return;
        // }
        
        // Tạo phần tử tin nhắn
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.sender_type || message.sender}`;
        if (message.isTemp) {
            messageElement.classList.add('temp-message');
            messageElement.setAttribute('data-temp', 'true');
        }
        messageElement.setAttribute('data-id', messageId);
        
        // Định dạng thời gian
        let timeStr = 'Invalid Date';
        try {
            const time = new Date(message.createdAt || message.created_at);
            if (!isNaN(time.getTime())) {
                timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        } catch (error) {
            console.error('Lỗi khi định dạng thời gian:', error);
        }
        
        // Xác định loại tin nhắn thực sự
        const isSystemMessage = message.sender_type === 'system' || message.sender === 'system';
        const isFileMessage = message.type === 'file' && message.file && message.file.type && message.file.data;
        
        // Xử lý nội dung tin nhắn dựa trên loại
        if (isSystemMessage) {
            // Tin nhắn hệ thống
            messageElement.innerHTML = `
                <div class="content system-message">${message.content}</div>
                <div class="time">${timeStr}</div>
            `;
        } else if (isFileMessage) {
            // Tin nhắn file
            if (message.file.type.startsWith('image/')) {
                // Hiển thị hình ảnh
                messageElement.innerHTML = `
                    <img src="${message.file.data}" alt="${message.file.name || 'Image'}" class="preview-image">
                    <div class="time">${timeStr}</div>
                `;
                
                // Thêm sự kiện click để xem ảnh đầy đủ
                const img = messageElement.querySelector('img');
                if (img) {
                    img.addEventListener('click', () => {
                        this.showImageModal(message.file.data);
                    });
                }
            } else {
                // Hiển thị thông tin tệp
                messageElement.innerHTML = `
                    <div class="file-info">
                        <i class="fas fa-file"></i>
                        <div class="file-name">${message.file.name || 'File'}</div>
                    </div>
                    <div class="time">${timeStr}</div>
                `;
            }
        } else {
            // Tin nhắn văn bản thông thường
            messageElement.innerHTML = `
                <div class="content">${this.formatMessageContent(message.content)}</div>
                <div class="time">${timeStr}</div>
            `;
        }
        
        // Thêm tin nhắn vào container
        messagesContainer.appendChild(messageElement);
        
        // Cuộn xuống dưới nếu tin nhắn mới
        this.scrollToBottom();
    }
    
    /**
     * Hiển thị tin nhắn hệ thống
     */
    displaySystemMessage(content) {
        const messagesContainer = this.getOrCreateMessagesContainer();
        
        // Tạo phần tử tin nhắn
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <div class="content">${content}</div>
        `;
        
        // Thêm tin nhắn vào container
        messagesContainer.appendChild(messageElement);
    }
    
    /**
     * Lấy hoặc tạo container tin nhắn
     */
    getOrCreateMessagesContainer() {
        let messagesContainer = this.elements.chatContent.querySelector('.messages');
        
        if (!messagesContainer) {
            messagesContainer = document.createElement('div');
            messagesContainer.className = 'messages';
            this.elements.chatContent.appendChild(messagesContainer);
        }
        
        return messagesContainer;
    }
    
    /**
     * Định dạng nội dung tin nhắn
     */
    formatMessageContent(content) {
        // Chuyển đổi URL thành liên kết
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return content.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
    }
    
    /**
     * Hiển thị modal xem ảnh
     */
    showImageModal(src) {
        const { modal } = this.elements;
        
        // Cập nhật nguồn ảnh
        modal.querySelector('img').src = src;
        
        // Hiển thị modal
        modal.classList.add('active');
    }
    
    /**
     * Cuộn xuống dưới
     */
    scrollToBottom() {
        const { chatContent } = this.elements;
        chatContent.scrollTop = chatContent.scrollHeight;
    }
    
    /**
     * Tăng số tin nhắn chưa đọc
     */
    increaseUnreadCount(roomId) {
        // Tăng số tin nhắn chưa đọc cho phòng cụ thể
        if (!this.unreadMessages[roomId]) {
            this.unreadMessages[roomId] = 0;
        }
        this.unreadMessages[roomId]++;
        
        // Tăng tổng số tin nhắn chưa đọc
        this.totalUnread++;
        
        // Cập nhật badge thông báo
        this.updateNotificationBadge();
    }
    
    /**
     * Cập nhật badge thông báo
     */
    updateNotificationBadge() {
        const { notificationBadge } = this.elements;
        
        if (this.totalUnread > 0) {
            notificationBadge.textContent = this.totalUnread > 99 ? '99+' : this.totalUnread;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
    
    /**
     * Bắt đầu chat trực tiếp với admin
     */
    startDirectChat() {
        // Kiểm tra xem đã đăng ký chưa
        if (!this.isRegistered || !this.customerId) {
            console.error('Chưa đăng ký thông tin khách hàng');
            this.showNotification('Vui lòng đăng ký thông tin trước khi chat', 'error');
            this.showRegistrationForm('direct');
            return;
        }
        
        // Kiểm tra xem có cần cập nhật thông tin không
        if (this.needInfoUpdate) {
            console.log('Cần cập nhật thông tin khách hàng');
            this.requestInfoUpdate('direct');
            return;
        }
        
        const { chatContent, chatInput, chatHeader } = this.elements;
        
        // Hiển thị phần nhập liệu
        chatInput.style.display = 'flex';
        
        // Hiển thị nút quay lại
        chatHeader.querySelector('.back-btn').style.display = 'block';
        
        // Cập nhật tiêu đề
        chatHeader.querySelector('.title').textContent = 'Chat với nhân viên hỗ trợ';
        
        // Tạo container cho tin nhắn
        chatContent.innerHTML = `
            <div class="messages"></div>
        `;
        
        // Tham gia phòng chat trực tiếp
        this.joinDirectChatRoom();
        
        this.currentView = 'direct-chat';
    }
    
    /**
     * Tham gia phòng chat trực tiếp
     */
    joinDirectChatRoom() {
        // Kiểm tra xem đã đăng ký chưa
        if (!this.isRegistered || !this.customerId) {
            console.error('Chưa đăng ký thông tin khách hàng');
            this.showNotification('Vui lòng đăng ký thông tin trước khi chat', 'error');
            this.showRegistrationForm('direct');
            return;
        }
        
        // Hiển thị thông báo đang kết nối
        this.displaySystemMessage('Đang kết nối với nhân viên hỗ trợ...');
        
        console.log('Gửi yêu cầu tham gia phòng chat trực tiếp với customerId:', this.customerId);
        
        // Gửi yêu cầu tham gia phòng chat trực tiếp
        this.socket.emit('join_direct_chat', {
            customerId: this.customerId
        }, (response) => {
            if (response && response.success) {
                console.log('Tham gia phòng chat trực tiếp thành công:', response);
                this.currentRoomId = response.roomId;
                
                // Hiển thị tin nhắn chào mừng
                this.displaySystemMessage(response.welcomeMessage || 'Chào mừng bạn đến với phòng chat hỗ trợ. Nhân viên sẽ hỗ trợ bạn trong thời gian sớm nhất.');
                
                // Tải lịch sử chat từ server
                this.loadChatHistory(this.currentRoomId);
            } else {
                console.error('Tham gia phòng chat trực tiếp thất bại:', response ? response.error : 'Không có phản hồi');
                
                // Kiểm tra nếu lỗi là "Không tìm thấy thông tin khách hàng"
                if (response && response.error && response.error.includes('Không tìm thấy')) {
                    // Xóa thông tin cũ và yêu cầu đăng ký lại
                    this.clearStoredCustomerInfo();
                    
                    // Hiển thị thông báo
                    this.showNotification('Thông tin đăng nhập không còn hợp lệ. Vui lòng đăng ký lại.', 'warning');
                    
                    // Hiển thị form đăng ký
                    this.showRegistrationForm('direct');
                } else {
                    // Hiển thị thông báo lỗi chung
                    this.showNotification(response && response.error ? response.error : 'Không thể tham gia phòng chat. Vui lòng thử lại sau.', 'error');
                    
                    // Hiển thị tin nhắn lỗi
                    this.displaySystemMessage('Không thể kết nối với nhân viên hỗ trợ. Vui lòng thử lại sau.');
                }
            }
        });
    }
    
    /**
     * Tải lịch sử chat từ server
     */
    loadChatHistory(roomId) {
        console.log('Đang tải lịch sử chat cho phòng:', roomId);
        
        // Gửi yêu cầu lấy lịch sử chat
        this.socket.emit('get_chat_history', { roomId }, (response) => {
            if (response && response.success) {
                console.log('Nhận lịch sử chat từ socket:', response);
                
                // Xóa tin nhắn cũ
                const messagesContainer = this.getOrCreateMessagesContainer();
                messagesContainer.innerHTML = '';
                
                // Sắp xếp tin nhắn theo thời gian (cũ nhất lên trên)
                const sortedMessages = [...response.messages].sort((a, b) => {
                    const timeA = new Date(a.created_at || a.createdAt).getTime();
                    const timeB = new Date(b.created_at || b.createdAt).getTime();
                    return timeA - timeB;
                });
                
                // Hiển thị tin nhắn
                sortedMessages.forEach(msg => {
                    this.displayMessage(msg);
                });
                
                // Cuộn xuống dưới
                this.scrollToBottom();
            } else {
                console.error('Lấy lịch sử chat thất bại:', response ? response.error : 'Không có phản hồi');
                
                // Thử lấy lịch sử chat qua API REST
                this.loadChatHistoryViaAPI(roomId);
            }
        });
    }

    
    /**
     * Tải lịch sử chat qua API REST (phương pháp dự phòng)
     */
    loadChatHistoryViaAPI(roomId) {
        fetch(`/api/message/room/${roomId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Customer-ID': this.customerId
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.messages) {
                console.log('Nhận lịch sử chat từ API:', data);
                
                // Xóa tin nhắn cũ
                const messagesContainer = this.getOrCreateMessagesContainer();
                messagesContainer.innerHTML = '';
                
                // Hiển thị tin nhắn
                data.messages.forEach(msg => {
                    this.displayMessage({
                        id: msg._id,
                        content: msg.message_text,
                        type: msg.file_data ? 'file' : 'text',
                        sender: msg.sender_type,
                        sender_type: msg.sender_type,
                        createdAt: msg.created_at,
                        file: msg.file_data ? {
                            name: msg.file_data.originalname,
                            type: msg.file_data.mimetype,
                            data: msg.file_data.path
                        } : null
                    });
                });
                
                // Cuộn xuống dưới
                this.scrollToBottom();
            } else {
                console.error('Lấy lịch sử chat thất bại:', data.error || 'Không có dữ liệu');
            }
        })
        .catch(error => {
            console.error('Lỗi khi tải lịch sử chat qua API:', error);
        });
    }
    
    /**
     * Tham gia phòng chat
     */
    joinChatRoom(roomId) {
        this.socket.emit('join_room', { roomId }, (response) => {
            if (response.success) {
                console.log('Tham gia phòng chat thành công:', response);
                this.currentRoomId = roomId;
                
                // Cập nhật danh sách phòng đã tham gia
                if (!this.joinedRooms.some(r => r.id === roomId)) {
                    const room = this.availableRooms.find(r => r.id === roomId);
                    if (room) {
                        this.joinedRooms.push(room);
                    }
                }
                
                // Hiển thị phòng chat
                this.showChatRoom(response.room);
                
                // Tải lịch sử chat từ server
                this.loadChatHistory(roomId);
            } else {
                console.error('Tham gia phòng chat thất bại:', response.error);
                this.showNotification(response.error || 'Không thể tham gia phòng chat. Vui lòng thử lại sau.', 'error');
            }
        });
    }
    
    /**
     * Hiển thị phòng chat
     */
    showChatRoom(room) {
        const { chatContent, chatInput, chatHeader } = this.elements;
        
        // Hiển thị phần nhập liệu
        chatInput.style.display = 'flex';
        
        // Hiển thị nút quay lại
        chatHeader.querySelector('.back-btn').style.display = 'block';
        
        // Cập nhật tiêu đề
        chatHeader.querySelector('.title').textContent = room.name;
        
        // Tạo container cho tin nhắn
        chatContent.innerHTML = `
            <div class="messages"></div>
        `;
        
        // Hiển thị tin nhắn chào mừng
        this.displaySystemMessage(room.welcome_message || `Chào mừng bạn đến với phòng chat ${room.name}.`);
        
        this.currentView = 'chat-room';
    }
    
    /**
     * Hiển thị thông báo
     */
    showNotification(message, type = 'info') {
        // Tạo phần tử thông báo
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Thêm vào body
        document.body.appendChild(notification);
        
        // Hiển thị thông báo
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Tự động ẩn sau 3 giây
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    /**
     * Điều hướng về trang trước
     */
    navigateBack() {
        switch (this.currentView) {
            case 'register':
                this.showWelcomeScreen();
                break;
            case 'direct-chat':
            case 'chat-room':
                this.showRoomSelection();
                break;
            case 'room-list':
                this.showRoomSelection();
                break;
            case 'room-selection':
                this.showWelcomeScreen();
                break;
            default:
                this.showWelcomeScreen();
        }
    }
    
    /**
     * Xử lý upload file
     */
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Kiểm tra kích thước tệp (tối đa 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Kích thước tệp không được vượt quá 5MB.', 'error');
            event.target.value = '';
            return;
        }
        
        // Hiển thị thông báo đang tải
        this.showNotification('Đang tải tệp lên...', 'info');
        
        // Đọc tệp dưới dạng base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result;
            
            // Tạo đối tượng tin nhắn
            const messageObj = {
                room_id: this.currentRoomId,
                content: file.name,
                type: 'file',
                file: {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64Data
                }
            };
            
            // Gửi tin nhắn
            this.socket.emit('send_message', messageObj, (response) => {
                if (response.success) {
                    this.showNotification('Tải tệp lên thành công.', 'success');
                    
                    // Hiển thị tin nhắn từ response
                    this.displayMessage(response.message);
                    
                    // Cuộn xuống dưới
                    this.scrollToBottom();
                } else {
                    console.error('Gửi tệp thất bại:', response.error);
                    this.showNotification(response.error || 'Không thể gửi tệp. Vui lòng thử lại.', 'error');
                }
            });
            
            // Reset input file
            event.target.value = '';
        };
        
        reader.readAsDataURL(file);
    }
    
    /**
     * Gửi tin nhắn
     */
    sendMessage() {
        const { chatInput } = this.elements;
        const input = chatInput.querySelector('input[type="text"]');
        const message = input.value.trim();
        
        if (!message) return;
        
        if (!this.currentRoomId) {
            this.showNotification('Bạn chưa tham gia phòng chat nào.', 'error');
            return;
        }
        
        // Xóa nội dung input
        input.value = '';
        
        // Tạo ID tạm thời cho tin nhắn
        const tempId = 'temp-' + Date.now();
        
        // Hiển thị tin nhắn tạm thời (optimistic UI)
        const tempMessage = {
            id: tempId,
            content: message,
            type: 'text',
            sender: 'customer',
            sender_type: 'customer',
            createdAt: new Date(),
            isTemp: true
        };
        
        this.displayMessage(tempMessage);
        
        // Cuộn xuống dưới
        this.scrollToBottom();
        
        // Tạo đối tượng tin nhắn
        const messageObj = {
            room_id: this.currentRoomId,
            customerId: this.customerId,
            content: message,
            type: 'text'
        };
        
        // Gửi tin nhắn
        this.socket.emit('send_message', messageObj, (response) => {
            // Tìm tin nhắn tạm thời
            const tempElement = document.querySelector(`.message[data-id="${tempId}"]`);
            
            if (response.success) {
                console.log('Gửi tin nhắn thành công:', response);
                
                // Cập nhật ID tin nhắn tạm thời thành ID thật
                if (tempElement) {
                    tempElement.setAttribute('data-id', response.message.id);
                    tempElement.classList.remove('temp-message');
                    tempElement.removeAttribute('data-temp');
                    
                    // Cập nhật thời gian
                    const timeElement = tempElement.querySelector('.time');
                    if (timeElement && response.message.createdAt) {
                        try {
                            const date = new Date(response.message.createdAt);
                            timeElement.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } catch (error) {
                            console.error('Lỗi khi định dạng thời gian:', error);
                        }
                    }
                }
            } else {
                console.error('Gửi tin nhắn thất bại:', response.error);
                this.showNotification(response.error || 'Không thể gửi tin nhắn. Vui lòng thử lại.', 'error');
                
                // Đánh dấu tin nhắn lỗi
                if (tempElement) {
                    tempElement.classList.add('error');
                    tempElement.setAttribute('title', 'Không thể gửi tin nhắn');
                }
            }
        });
    }
    
    /**
     * Đánh dấu tin nhắn đã đọc
     */
    markMessageAsRead(messageId) {
        // Không cần gửi request đến server vì đã được xử lý tự động
        // khi lấy lịch sử chat
        console.log('Đánh dấu tin nhắn đã đọc:', messageId);
    }
    
    /**
     * Yêu cầu cập nhật thông tin khách hàng
     */
    requestInfoUpdate(nextAction = 'direct') {
        const { chatContent, chatHeader } = this.elements;
        
        // Hiển thị nút quay lại
        chatHeader.querySelector('.back-btn').style.display = 'block';
        
        // Cập nhật tiêu đề
        chatHeader.querySelector('.title').textContent = 'Cập nhật thông tin';
        
        // Lấy thông tin hiện tại
        const currentInfo = this.customerInfo || {};
        
        // Tạo form cập nhật
        chatContent.innerHTML = `
            <div class="registration-form">
                <h3>Vui lòng cập nhật thông tin của bạn</h3>
                <p>Chúng tôi cần một số thông tin để phục vụ bạn tốt hơn.</p>
                <form id="update-form">
                    <div class="form-group">
                        <label for="name">Họ tên <span class="required">*</span></label>
                        <input type="text" id="name" placeholder="Nhập họ tên của bạn" value="${currentInfo.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email <span class="required">*</span></label>
                        <input type="email" id="email" placeholder="Nhập email của bạn" value="${currentInfo.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="phone">Số điện thoại <span class="required">*</span></label>
                        <input type="tel" id="phone" placeholder="Nhập số điện thoại của bạn" value="${currentInfo.phone || ''}" required>
                    </div>
                    <div class="form-note">
                        <small>Các trường có dấu <span class="required">*</span> là bắt buộc</small>
                    </div>
                    <button type="submit" class="submit-btn">Cập nhật và tiếp tục</button>
                </form>
            </div>
        `;
        
        // Thêm sự kiện cho form
        chatContent.querySelector('#update-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = chatContent.querySelector('#name').value.trim();
            const email = chatContent.querySelector('#email').value.trim();
            const phone = chatContent.querySelector('#phone').value.trim();
            
            // Kiểm tra các trường bắt buộc
            if (!name || !email || !phone) {
                this.showNotification('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
                return;
            }
            
            // Cập nhật thông tin
            this.updateCustomerInfo({
                name,
                email,
                phone,
                nextAction
            });
        });
        
        this.currentView = 'update-info';
    }
    
    /**
     * Cập nhật thông tin khách hàng
     */
    updateCustomerInfo(info) {
        // Kiểm tra kết nối
        if (!this.isConnected) {
            this.showNotification('Không có kết nối đến server. Vui lòng thử lại sau.', 'error');
            return;
        }
        
        // Hiển thị thông báo đang cập nhật
        this.showNotification('Đang cập nhật thông tin...', 'info');
        
        // Cập nhật thông tin khách hàng
        const updateData = {
            customerId: this.customerId,
            domain: window.location.hostname, // Thêm thông tin domain hiện tại
            ...info
        };
        
        // Gửi yêu cầu cập nhật
        this.socket.emit('update_customer_info', updateData, (response) => {
            if (response && response.success) {
                console.log('Cập nhật thông tin thành công:', response);
                
                // Cập nhật thông tin khách hàng
                this.customerInfo = {
                    ...this.customerInfo,
                    ...info
                };
                
                // Lưu thông tin khách hàng vào localStorage
                this.storeCustomerInfo();
                
                // Đánh dấu không cần cập nhật nữa
                this.needInfoUpdate = false;
                
                // Hiển thị thông báo thành công
                this.showNotification('Cập nhật thông tin thành công!', 'success');
                
                // Xử lý hành động tiếp theo
                if (info.nextAction === 'direct') {
                    this.startDirectChat();
                } else {
                    this.showRoomSelection();
                }
            } else {
                console.error('Cập nhật thông tin thất bại:', response ? response.error : 'Không có phản hồi');
                this.showNotification(response && response.error ? response.error : 'Cập nhật thông tin thất bại. Vui lòng thử lại.', 'error');
            }
        });
    }
    
    /**
     * Xóa thông tin khách hàng đã lưu trong localStorage
     */
    clearStoredCustomerInfo() {
        try {
            localStorage.removeItem('customerInfo');
            localStorage.removeItem('customerId');
            
            // Reset các biến liên quan
            this.customerId = null;
            this.customerInfo = null;
            this.isRegistered = false;
            this.needInfoUpdate = false;
            
            console.log('Đã xóa thông tin khách hàng khỏi localStorage');
            
            // Hiển thị thông báo
            this.showNotification('Thông tin đăng nhập đã được xóa', 'info');
        } catch (error) {
            console.error('Lỗi khi xóa thông tin khách hàng:', error);
        }
    }
    
    /**
     * Xử lý tin nhắn mới từ socket
     */
    handleNewMessage(message) {
        console.log('Nhận tin nhắn mới từ socket:', message);
        
        // Kiểm tra xem tin nhắn có thuộc về phòng chat hiện tại không
        if (!this.currentRoomId || message.roomId !== this.currentRoomId) {
            console.log('Tin nhắn không thuộc về phòng chat hiện tại');
            
            // Tăng số tin nhắn chưa đọc
            this.increaseUnreadCount(message.roomId);
            return;
        }
        
        // Kiểm tra xem tin nhắn đã hiển thị chưa
        const existingMessage = document.querySelector(`.message[data-id="${message.id}"]`);
        if (existingMessage) {
            console.log('Tin nhắn đã hiển thị trước đó, không hiển thị lại:', message.id);
            return;
        }
        
        // Nếu là tin nhắn từ chính người dùng này (customer)
        if (message.sender === 'customer') {
            // Tìm tất cả tin nhắn tạm thời
            const tempMessages = document.querySelectorAll('.message.temp-message[data-temp="true"]');
            
            // Kiểm tra từng tin nhắn tạm thời
            for (const tempMsg of tempMessages) {
                const tempContent = tempMsg.querySelector('.content')?.textContent;
                
                // So sánh nội dung để tìm tin nhắn tạm thời tương ứng
                if (tempContent === message.content) {
                    console.log('Tìm thấy tin nhắn tạm thời tương ứng, cập nhật thay vì hiển thị mới');
                    
                    // Cập nhật ID và xóa trạng thái tạm thời
                    tempMsg.setAttribute('data-id', message.id);
                    tempMsg.classList.remove('temp-message');
                    tempMsg.removeAttribute('data-temp');
                    
                    // Cập nhật thời gian
                    const timeElement = tempMsg.querySelector('.time');
                    if (timeElement && message.createdAt) {
                        try {
                            const date = new Date(message.createdAt);
                            timeElement.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } catch (error) {
                            console.error('Lỗi khi định dạng thời gian:', error);
                        }
                    }
                    
                    return; // Không hiển thị tin nhắn mới
                }
            }
        }
        
        // Nếu không tìm thấy tin nhắn tạm thời tương ứng hoặc tin nhắn từ admin, hiển thị tin nhắn mới
        this.displayMessage(message);
        
        // Phát âm thanh thông báo nếu tin nhắn từ admin
        if (message.sender === 'admin') {
            this.playNotificationSound();
        }
        
        // Cuộn xuống dưới
        this.scrollToBottom();
    }
    
    /**
     * Phát âm thanh thông báo
     */
    playNotificationSound() {
        try {
            // Tạo phần tử audio
            const audio = new Audio('https://cdn.jsdelivr.net/npm/notification-sounds@0.0.1/notification.mp3');
            audio.volume = 0.5;
            
            // Phát âm thanh
            audio.play().catch(error => {
                console.error('Không thể phát âm thanh thông báo:', error);
            });
        } catch (error) {
            console.error('Lỗi khi phát âm thanh thông báo:', error);
        }
    }
}

// Khởi tạo ứng dụng khi trang đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    // Thêm CSS cho thông báo
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            transform: translateY(-20px);
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .notification.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .notification.info {
            background-color: #2196F3;
        }
        
        .notification.success {
            background-color: #4CAF50;
        }
        
        .notification.error {
            background-color: #F44336;
        }
        
        .notification.warning {
            background-color: #FF9800;
        }
        
        /* CSS cho tin nhắn tạm thời */
        .message.temp-message {
            opacity: 0.7;
        }
        
        .message.temp-message .time:after {
            content: " (đang gửi...)";
            font-style: italic;
        }
        
        .message.error {
            background-color: rgba(244, 67, 54, 0.1);
        }
        
        .message.error .time:after {
            content: " (lỗi)";
            color: #F44336;
            font-style: italic;
        }
    `;
    document.head.appendChild(style);
    
    // Khởi tạo ứng dụng chat
    window.customerChat = new CustomerChat();
});