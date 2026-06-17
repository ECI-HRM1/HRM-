#!/usr/bin/env python3
"""
ECI HRM Performance Appraisal System - Static File Server
Serves pre-built Next.js production files using Python's built-in http.server.
This is used for preview/demonstration purposes in resource-constrained environments.
For production deployment on ECI's internal server, use the Node.js standalone server.
"""

import os
import sys
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 3000
STANDALONE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.next', 'standalone')
INDEX_HTML_PATH = os.path.join(STANDALONE_DIR, '.next', 'server', 'app', 'index.html')
PUBLIC_DIR = os.path.join(STANDALONE_DIR, 'public')
STATIC_DIR = os.path.join(STANDALONE_DIR, '.next', 'static')

# Read the pre-rendered index.html once at startup
try:
    with open(INDEX_HTML_PATH, 'r', encoding='utf-8') as f:
        INDEX_HTML = f.read()
    print(f"Loaded index.html ({len(INDEX_HTML)} bytes)")
except FileNotFoundError:
    print(f"ERROR: {INDEX_HTML_PATH} not found. Run 'bun run build' first.")
    sys.exit(1)


class ECIServerHandler(SimpleHTTPRequestHandler):
    """Custom handler that serves the SPA correctly."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STANDALONE_DIR, **kwargs)

    def do_GET(self):
        # Strip query string for routing
        path = self.path.split('?')[0]

        # 1. Static assets: /_next/static/...
        if path.startswith('/_next/static/'):
            self._serve_static(path)
            return

        # 2. Public assets: /eci-logo.jpg, /logo.svg, favicon.ico, robots.txt
        public_path = os.path.join(PUBLIC_DIR, path.lstrip('/'))
        if os.path.isfile(public_path):
            self._serve_file(public_path)
            return

        # 3. Favicon
        if path == '/favicon.ico':
            ico = os.path.join(PUBLIC_DIR, 'favicon.ico')
            if os.path.isfile(ico):
                self._serve_file(ico)
                return
            self.send_response(204)
            self.end_headers()
            return

        # 4. API routes - return 503 so frontend uses mock data fallback
        if path.startswith('/api/'):
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"service_unavailable"}')
            return

        # 5. All other routes: serve the SPA index.html
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self.wfile.write(INDEX_HTML.encode('utf-8'))

    def _serve_static(self, path):
        """Serve a file from the .next/static directory."""
        relative = path.replace('/_next/static/', '', 1)
        file_path = os.path.join(STATIC_DIR, relative)
        if os.path.isfile(file_path):
            self._serve_file(file_path, cache=True)
        else:
            self.send_error(404)

    def _serve_file(self, file_path, cache=False):
        """Serve a file with proper content type."""
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'

        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            if cache:
                self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
            self.end_headers()
            self.wfile.write(content)
        except IOError:
            self.send_error(404)

    def log_message(self, format, *args):
        """Suppress request logging for performance."""
        pass


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), ECIServerHandler)
    print(f'ECI HRM Static Server on port {PORT}')
    print(f'Static dir: {STANDALONE_DIR}')
    print('Press Ctrl+C to stop')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down...')
        server.server_close()