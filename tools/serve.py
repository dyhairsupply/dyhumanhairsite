#!/usr/bin/env python3
"""
Local preview server for the DY Deyu showcase site.

Serves the project root with an SPA fallback so clean URLs such as
/products/wigs/2 and /product/DY-WG-001 work locally, exactly as they do
on Netlify (see _redirects).

Usage:
    python tools/serve.py                 # http://localhost:8000
    python tools/serve.py 8080           # custom port
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlparse(self.path).path
        target = ROOT / path.lstrip("/")
        # Unknown paths are client-side routes -> serve the app shell.
        if path != "/" and not target.exists():
            self.path = "/index.html"
        return super().do_GET()

    def end_headers(self):
        if urlparse(self.path).path.startswith("/content/"):
            self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "404" in (fmt % args):
            return
        super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"DY Deyu preview: http://localhost:{port}/")
    print("CMS (local):    http://localhost:{}/admin/  (see README for decap-server)".format(port))
    print("Press Ctrl+C to stop.")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
