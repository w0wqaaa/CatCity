import os
from http.server import SimpleHTTPRequestHandler, HTTPServer
from tools.create_collision_map import generate_collision_map

def start_server(port=8000):
    print(f"🌐 Cat City запущен — открой вручную: http://localhost:{port}")
    httpd = HTTPServer(("", port), SimpleHTTPRequestHandler)
    httpd.serve_forever()

if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    print("🔧 Генерация карты коллизий...")
    generate_collision_map("sprites/tiles/background.png", "js/collisionMap.js")

    print("🚀 Запуск локального сервера...")
    start_server(8000)
