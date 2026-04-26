import { Controller, Get, Header } from '@nestjs/common';

const ROOT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>e vision API</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #0f1419;
      color: #e8eaed;
    }
    main { text-align: center; padding: 2rem; }
    h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.75rem; letter-spacing: 0.02em; }
    p { margin: 0; font-size: 1rem; color: #9aa0a6; }
    a { color: #8ab4f8; margin-top: 1.5rem; display: inline-block; }
  </style>
</head>
<body>
  <main>
    <h1>e vision API</h1>
    <p>Made with love by Manya Shukla</p>
    <a href="/api/docs">Open API docs →</a>
  </main>
</body>
</html>`;

@Controller()
export class AppController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  root(): string {
    return ROOT_HTML;
  }
}
