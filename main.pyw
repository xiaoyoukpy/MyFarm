import webview

window = webview.create_window(
    '我的游戏', 
    'index.html',
    maximized=True  # 启动时最大化
)
webview.start()