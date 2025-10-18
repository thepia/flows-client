# Native Service Worker Replacement Pattern

**Status**: Planning
**Version**: 1.0.0
**Last Updated**: 2025-10-11

## Question

> I'm talking about running a Svelte webapp in a webview on iOS/Android. Can we implement the service worker in Swift/Kotlin instead of JavaScript?

## Answer: Yes - Native Request Interception + Storage

**Absolutely!** WKWebView (iOS) and WebView (Android) provide **native request interception APIs** that can replace Service Worker functionality entirely.

## Core Concept

Instead of a JavaScript Service Worker, use native code to:
1. **Intercept network requests** from the webview
2. **Check local database** (SQLite) for cached data
3. **Return cached data** or fetch from network
4. **Queue offline operations** for later sync
5. **Communicate with webview** via JavaScript bridge

```
┌──────────────────────────────────────────┐
│     Svelte App in WebView                │
│  (Makes fetch() calls normally)          │
└──────────────┬───────────────────────────┘
               │ fetch('/api/tasks')
               │
        ┌──────▼───────┐
        │   WebView    │
        │  (iOS/Android)│
        └──────┬───────┘
               │ Request intercepted
               │
┌──────────────▼───────────────────────────┐
│   Native Request Handler                 │
│   (Swift/Kotlin)                         │
│                                          │
│   1. Check SQLite cache                 │
│   2. If cached: return from SQLite      │
│   3. If not: fetch from network         │
│   4. Cache response in SQLite           │
│   5. Handle offline queue               │
└──────────────────────────────────────────┘
```

## iOS Implementation (WKWebView)

### 1. URLSchemeHandler for Custom Scheme

WKWebView allows intercepting custom URL schemes (like `flows://`).

```swift
// AppDelegate.swift or SceneDelegate.swift
import WebKit

class FlowsURLSchemeHandler: NSObject, WKURLSchemeHandler {

    private let db: FlowsDatabase
    private let networkClient: NetworkClient

    init(db: FlowsDatabase, networkClient: NetworkClient) {
        self.db = db
        self.networkClient = networkClient
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(NSError(domain: "FlowsDB", code: 400))
            return
        }

        // Handle request asynchronously
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.handleRequest(urlSchemeTask: urlSchemeTask, url: url)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Cancel ongoing request if needed
    }

    private func handleRequest(urlSchemeTask: WKURLSchemeTask, url: URL) {
        let path = url.path // e.g., "/api/tasks"
        let method = urlSchemeTask.request.httpMethod ?? "GET"

        do {
            // Parse route (similar to service worker routing)
            if let cachedResponse = try checkCache(path: path, method: method) {
                // Return cached data
                sendResponse(urlSchemeTask: urlSchemeTask, data: cachedResponse)
                return
            }

            // Not in cache, fetch from network
            if isOnline() {
                let networkResponse = try fetchFromNetwork(url: url, method: method)

                // Cache the response
                try cacheResponse(path: path, data: networkResponse)

                sendResponse(urlSchemeTask: urlSchemeTask, data: networkResponse)
            } else {
                // Offline - queue request or return error
                try queueOfflineRequest(path: path, method: method, body: urlSchemeTask.request.httpBody)
                sendOfflineResponse(urlSchemeTask: urlSchemeTask)
            }

        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    private func checkCache(path: String, method: String) throws -> Data? {
        // Check SQLite for cached response
        guard let cached = try db.getCachedResponse(path: path) else {
            return nil
        }

        // Check if cache is fresh
        if cached.expiresAt > Date() {
            return cached.data
        }

        return nil
    }

    private func cacheResponse(path: String, data: Data) throws {
        // Cache in SQLite
        try db.cacheResponse(
            path: path,
            data: data,
            expiresAt: Date().addingTimeInterval(3600) // 1 hour
        )
    }

    private func queueOfflineRequest(path: String, method: String, body: Data?) throws {
        // Queue mutation for later sync
        if method != "GET" {
            try db.queueOperation(
                path: path,
                method: method,
                body: body,
                timestamp: Date()
            )
        }
    }

    private func sendResponse(urlSchemeTask: WKURLSchemeTask, data: Data) {
        let response = URLResponse(
            url: urlSchemeTask.request.url!,
            mimeType: "application/json",
            expectedContentLength: data.count,
            textEncodingName: nil
        )

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    private func sendOfflineResponse(urlSchemeTask: WKURLSchemeTask) {
        let errorResponse = ["error": "Offline - request queued"]
        let data = try! JSONSerialization.data(withJSONObject: errorResponse)

        let response = HTTPURLResponse(
            url: urlSchemeTask.request.url!,
            statusCode: 202, // Accepted
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    private func fetchFromNetwork(url: URL, method: String) throws -> Data {
        // Convert custom scheme to https
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.scheme = "https"

        let realURL = components.url!

        // Make network request
        let semaphore = DispatchSemaphore(value: 0)
        var result: Data?
        var error: Error?

        let task = URLSession.shared.dataTask(with: realURL) { data, _, err in
            result = data
            error = err
            semaphore.signal()
        }
        task.resume()
        semaphore.wait()

        if let error = error {
            throw error
        }

        return result ?? Data()
    }

    private func isOnline() -> Bool {
        // Check network reachability
        // Use NWPathMonitor or Reachability library
        return true // Simplified
    }
}

// Setup WebView with custom scheme handler
class WebViewController: UIViewController {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        let configuration = WKWebViewConfiguration()

        // Register custom scheme handler
        let db = FlowsDatabase()
        let networkClient = NetworkClient()
        let schemeHandler = FlowsURLSchemeHandler(db: db, networkClient: networkClient)

        configuration.setURLSchemeHandler(schemeHandler, forURLScheme: "flows")

        webView = WKWebView(frame: view.bounds, configuration: configuration)
        view.addSubview(webView)

        // Load app
        let url = Bundle.main.url(forResource: "index", withExtension: "html")!
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }
}
```

### 2. Configure Svelte App to Use Custom Scheme

```typescript
// src/lib/config.ts

// Detect if running in native webview
const isNativeWebView = () => {
  return /FlowsApp/i.test(navigator.userAgent); // Set custom user agent
};

// Use custom scheme in native webview
export const API_BASE_URL = isNativeWebView()
  ? 'flows://api.thepia.com' // Custom scheme intercepted by native
  : 'https://api.thepia.com'; // Standard HTTPS in web

// All fetch calls use this base URL
export async function apiCall(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  return response.json();
}
```

### 3. SQLite Database Schema

```swift
// FlowsDatabase.swift
import SQLite

class FlowsDatabase {
    private var db: Connection?

    init() {
        setupDatabase()
    }

    private func setupDatabase() {
        let path = NSSearchPathForDirectoriesInDomains(
            .documentDirectory, .userDomainMask, true
        ).first!

        db = try! Connection("\(path)/flows.sqlite3")

        // Create tables
        try! db!.run("""
            CREATE TABLE IF NOT EXISTS cache (
                path TEXT PRIMARY KEY,
                data BLOB NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)

        try! db!.run("""
            CREATE TABLE IF NOT EXISTS offline_queue (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                method TEXT NOT NULL,
                body BLOB,
                timestamp INTEGER NOT NULL,
                retries INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending'
            )
        """)

        try! db!.run("""
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                client_id TEXT NOT NULL,
                app_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                -- More fields...
            )
        """)
    }

    func getCachedResponse(path: String) throws -> CachedResponse? {
        let query = db!.prepare("""
            SELECT data, expires_at FROM cache WHERE path = ? AND expires_at > ?
        """)

        let now = Int(Date().timeIntervalSince1970)

        for row in try db!.prepare(query, [path, now]) {
            return CachedResponse(
                data: row[0] as! Data,
                expiresAt: Date(timeIntervalSince1970: TimeInterval(row[1] as! Int))
            )
        }

        return nil
    }

    func cacheResponse(path: String, data: Data, expiresAt: Date) throws {
        try db!.run("""
            INSERT OR REPLACE INTO cache (path, data, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        """, [
            path,
            data,
            Int(expiresAt.timeIntervalSince1970),
            Int(Date().timeIntervalSince1970)
        ])
    }

    func queueOperation(path: String, method: String, body: Data?, timestamp: Date) throws {
        let id = UUID().uuidString

        try db!.run("""
            INSERT INTO offline_queue (id, path, method, body, timestamp, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        """, [id, path, method, body as Any, Int(timestamp.timeIntervalSince1970)])
    }

    func getPendingOperations() throws -> [OfflineOperation] {
        var operations: [OfflineOperation] = []

        let query = db!.prepare("""
            SELECT id, path, method, body, timestamp
            FROM offline_queue
            WHERE status = 'pending'
            ORDER BY timestamp ASC
        """)

        for row in try db!.prepare(query) {
            operations.append(OfflineOperation(
                id: row[0] as! String,
                path: row[1] as! String,
                method: row[2] as! String,
                body: row[3] as? Data,
                timestamp: Date(timeIntervalSince1970: TimeInterval(row[4] as! Int))
            ))
        }

        return operations
    }
}

struct CachedResponse {
    let data: Data
    let expiresAt: Date
}

struct OfflineOperation {
    let id: String
    let path: String
    let method: String
    let body: Data?
    let timestamp: Date
}
```

## Android Implementation (WebView)

### 1. WebViewClient with Request Interception

```kotlin
// FlowsWebViewClient.kt
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream

class FlowsWebViewClient(
    private val db: FlowsDatabase,
    private val networkClient: NetworkClient
) : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        request ?: return null

        val url = request.url.toString()

        // Only intercept flows:// scheme
        if (!url.startsWith("flows://")) {
            return super.shouldInterceptRequest(view, request)
        }

        return try {
            handleRequest(request)
        } catch (e: Exception) {
            createErrorResponse(e)
        }
    }

    private fun handleRequest(request: WebResourceRequest): WebResourceResponse {
        val path = request.url.path ?: "/"
        val method = request.method

        // Check cache first
        val cached = db.getCachedResponse(path)
        if (cached != null && !cached.isExpired()) {
            return createResponse(cached.data)
        }

        // Not in cache, fetch from network
        if (isOnline()) {
            val response = networkClient.fetch(convertToHttps(request.url), method)

            // Cache the response
            db.cacheResponse(path, response, expiresAt = System.currentTimeMillis() + 3600000)

            return createResponse(response)
        } else {
            // Offline - queue request if it's a mutation
            if (method != "GET") {
                db.queueOperation(path, method, request.getBody(), System.currentTimeMillis())
            }

            return createOfflineResponse()
        }
    }

    private fun createResponse(data: ByteArray): WebResourceResponse {
        return WebResourceResponse(
            "application/json",
            "UTF-8",
            200,
            "OK",
            mapOf("Content-Type" to "application/json"),
            ByteArrayInputStream(data)
        )
    }

    private fun createOfflineResponse(): WebResourceResponse {
        val json = """{"error": "Offline - request queued"}"""
        return WebResourceResponse(
            "application/json",
            "UTF-8",
            202,
            "Accepted",
            mapOf("Content-Type" to "application/json"),
            ByteArrayInputStream(json.toByteArray())
        )
    }

    private fun createErrorResponse(e: Exception): WebResourceResponse {
        val json = """{"error": "${e.message}"}"""
        return WebResourceResponse(
            "application/json",
            "UTF-8",
            500,
            "Internal Server Error",
            mapOf("Content-Type" to "application/json"),
            ByteArrayInputStream(json.toByteArray())
        )
    }

    private fun convertToHttps(uri: android.net.Uri): String {
        return uri.toString().replace("flows://", "https://")
    }

    private fun isOnline(): Boolean {
        // Check network connectivity
        return true // Simplified
    }
}

// MainActivity.kt
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val db = FlowsDatabase(this)
        val networkClient = NetworkClient()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true

            // Set custom user agent to identify native webview
            settings.userAgentString += " FlowsApp/1.0"

            webViewClient = FlowsWebViewClient(db, networkClient)
        }

        setContentView(webView)

        // Load app from assets
        webView.loadUrl("file:///android_asset/index.html")
    }
}
```

### 2. SQLite Database

```kotlin
// FlowsDatabase.kt
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class FlowsDatabase(context: Context) : SQLiteOpenHelper(context, "flows.db", null, 1) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE cache (
                path TEXT PRIMARY KEY,
                data BLOB NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)

        db.execSQL("""
            CREATE TABLE offline_queue (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                method TEXT NOT NULL,
                body BLOB,
                timestamp INTEGER NOT NULL,
                retries INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending'
            )
        """)

        db.execSQL("""
            CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                client_id TEXT NOT NULL,
                app_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Handle migrations
    }

    fun getCachedResponse(path: String): CachedResponse? {
        val db = readableDatabase
        val cursor = db.rawQuery(
            "SELECT data, expires_at FROM cache WHERE path = ? AND expires_at > ?",
            arrayOf(path, System.currentTimeMillis().toString())
        )

        return if (cursor.moveToFirst()) {
            CachedResponse(
                data = cursor.getBlob(0),
                expiresAt = cursor.getLong(1)
            )
        } else {
            null
        }.also {
            cursor.close()
        }
    }

    fun cacheResponse(path: String, data: ByteArray, expiresAt: Long) {
        val db = writableDatabase
        db.execSQL(
            """
            INSERT OR REPLACE INTO cache (path, data, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            """,
            arrayOf(path, data, expiresAt, System.currentTimeMillis())
        )
    }

    fun queueOperation(path: String, method: String, body: ByteArray?, timestamp: Long) {
        val db = writableDatabase
        val id = java.util.UUID.randomUUID().toString()

        db.execSQL(
            """
            INSERT INTO offline_queue (id, path, method, body, timestamp, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
            """,
            arrayOf(id, path, method, body, timestamp)
        )
    }
}

data class CachedResponse(
    val data: ByteArray,
    val expiresAt: Long
) {
    fun isExpired() = expiresAt < System.currentTimeMillis()
}
```

## Communication: JavaScript ↔ Native

### From JavaScript to Native (Commands)

```swift
// iOS: WKScriptMessageHandler
class FlowsScriptMessageHandler: NSObject, WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let type = body["type"] as? String else {
            return
        }

        switch type {
        case "SYNC_NOW":
            triggerBackgroundSync()
        case "CLEAR_CACHE":
            clearCache()
        case "GET_SYNC_STATUS":
            let status = getSyncStatus()
            // Send response back to JavaScript
            sendToJS(type: "SYNC_STATUS", payload: status)
        default:
            break
        }
    }

    private func sendToJS(type: String, payload: Any) {
        let json = try! JSONSerialization.data(withJSONObject: [
            "type": type,
            "payload": payload
        ])
        let script = "window.postMessage(\(String(data: json, encoding: .utf8)!), '*')"

        webView?.evaluateJavaScript(script)
    }
}

// Register message handler
configuration.userContentController.add(messageHandler, name: "flows")
```

```typescript
// JavaScript side
window.webkit?.messageHandlers?.flows?.postMessage({
  type: 'SYNC_NOW'
});

// Listen for responses
window.addEventListener('message', (event) => {
  if (event.data.type === 'SYNC_STATUS') {
    console.log('Sync status:', event.data.payload);
  }
});
```

### From Native to JavaScript (Events)

```swift
// iOS: Send event to JavaScript
webView.evaluateJavaScript("""
    window.dispatchEvent(new CustomEvent('flows:sync-complete', {
        detail: { synced: 10, errors: 0 }
    }));
""")
```

```typescript
// JavaScript: Listen for native events
window.addEventListener('flows:sync-complete', (event) => {
  console.log('Sync complete:', event.detail);
});
```

## Capacitor Plugin (Easier Integration)

Instead of raw WebView APIs, use Capacitor:

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thepia.flows',
  appName: 'Thepia Flows',
  webDir: 'dist',
  server: {
    // Use custom scheme for native interception
    scheme: 'flows',
    hostname: 'api.thepia.com'
  }
};

export default config;
```

## Comparison: Service Worker vs Native

| Feature | Service Worker (Web) | Native (iOS/Android) |
|---------|---------------------|---------------------|
| **Request Interception** | ✅ `fetch` event | ✅ URLSchemeHandler/WebViewClient |
| **Offline Storage** | ✅ IndexedDB | ✅ SQLite |
| **Cache API** | ✅ Cache Storage | ✅ Custom SQLite |
| **Background Sync** | ⚠️ Limited | ✅ Full control |
| **Push Notifications** | ⚠️ Limited | ✅ Native APNs/FCM |
| **Storage Limit** | ⚠️ ~50-100MB | ✅ Unlimited |
| **Performance** | ⚠️ JavaScript | ✅ Native |
| **Development** | ✅ Easier | ⚠️ More complex |

## Trade-offs

### Advantages of Native Implementation

✅ **Better Performance**: Native code is faster than JavaScript
✅ **Unlimited Storage**: SQLite can store gigabytes
✅ **True Background Sync**: Works even when app is closed
✅ **Better Offline**: More reliable than Service Worker
✅ **No WKWebView Limitations**: Doesn't require app-bound domains

### Disadvantages

❌ **More Code**: Need to implement in Swift AND Kotlin
❌ **Maintenance**: Two codebases to maintain
❌ **Testing**: Harder to test than Service Worker
❌ **Web Compatibility**: Web version still needs Service Worker

## Recommended Hybrid Approach

**Best solution**: Support both!

1. **Web**: Use Service Worker
2. **Native**: Use native request interception
3. **Share API**: Same RPC interface works in both

```typescript
// Detect environment and create appropriate client
export async function createFlowsDBClient() {
  if (isNativeWebView()) {
    // Native handles everything - just use fetch()
    return new NativeFlowsDBClient();
  } else {
    // Web - use Service Worker
    return new ServiceWorkerFlowsDBClient();
  }
}
```

## Summary

**Yes, you can replace Service Worker with native Swift/Kotlin code!**

✅ **iOS**: WKURLSchemeHandler intercepts custom scheme (`flows://`)
✅ **Android**: WebViewClient.shouldInterceptRequest() intercepts requests
✅ **Storage**: SQLite instead of IndexedDB
✅ **Communication**: JavaScriptCore bridge (iOS) / WebView interface (Android)
✅ **Same API**: Svelte app uses same `fetch()` calls

**Result**: Better performance, unlimited storage, true offline support!

## Related Documentation

- [SERVICE_WORKER_ARCHITECTURE.md](./SERVICE_WORKER_ARCHITECTURE.md) - Web Service Worker implementation
- [NATIVE_APP_ADAPTER_PATTERN.md](./NATIVE_APP_ADAPTER_PATTERN.md) - Native database adapters
- [SERVICE_WORKER_RPC_INTERFACE.md](./SERVICE_WORKER_RPC_INTERFACE.md) - Unified RPC interface
