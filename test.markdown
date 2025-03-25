-	COMMENT :
+ backend :
Link github : https://github.com/TBGLearn/Box-comment
cách chạy : node index.js
cách chạy server : pm2 start pm2.config.js –env.production
+ front-end : 
link github : https://github.com/TBGLearn/Box-comment-fe
đang chạy ở github pages
-	Chat socket :
+ backend : 
link github : https://github.com/TBGLearn/chat-socket-main
Branch : duy
cách chạy server : pm2 start pm2.config.js –env.production
+ front-end customer : https://github.com/duy59/customer-chat
các chỗ để thay thế domain :
có thể tìm kiếm bằng cái search của cursor : DOMAINAPI . những chỗ nào là DOMAINAPI thì sẽ thay bằng domain
các chỗ cần thay thế domain : 
CustomerChat.js : dòng 414
SocketManager.js : dòng 78 , 579 , 658
đang chạy ở github pages
+ front-end admin : https://github.com/TBGLearn/admin-chat-socket-fe-main
cách chạy server : npm run build -> pm2 start ecosystem.config.js
