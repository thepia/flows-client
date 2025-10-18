# Native App Adapter Pattern for Flows Data

**Status**: Planning
**Version**: 2.0.0
**Last Updated**: 2025-10-13

## Question

> If the webapp runs within an iOS/Android app, can we implement the service worker natively? E.g., saving in SQLite

## Answer: Yes - Same RPC Interface, Native Implementation

**Absolutely!** The RPC interface is **transport-agnostic**. Native platforms can expose the same `postMessage` + listener pattern on the `window` object.

## What is MessageChannel Really?

MessageChannel is just a fancy name for **bidirectional postMessage + listeners**:

```javascript
// MessageChannel creates two connected endpoints
const { port1, port2 } = new MessageChannel();

// Each port can send...
port1.postMessage({ type: 'hello' });

// ...and receive
port1.onmessage = (event) => {
  console.log(event.data); // receives messages sent to port1
};
```

**That's it.** It's just:
- `postMessage(data)` - send a message
- `onmessage = handler` - receive messages

The "fancy" part: creates a **dedicated channel** between two contexts (main thread ↔ Service Worker).

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              Client Application                     │
│         (Same TypeScript code everywhere)           │
│                                                     │
│  const tasks = await db.query.tasks({});           │
└────────────┬────────────────────────────────────────┘
             │
             │ Same RPC interface
             │
        ┌────┴─────┐
        │          │
┌───────▼──────┐   ┌─────▼──────────┐
│   Web Build  │   │  Native Build   │
│              │   │                 │
│ MessageChannel│  │  window.webkit  │
│      to      │   │  (iOS) or       │
│ Service Worker│  │  window.flowsDB │
│              │   │  (Android)      │
└──────┬───────┘   └────┬───────────┘
       │                │
┌──────▼────────┐  ┌────▼──────────────┐
│ Service Worker│  │  Native Code       │
│   (Browser)   │  │  (Swift/Kotlin)    │
│               │  │                    │
│ IndexedDB     │  │  SQLite            │
│ + Supabase    │  │  + Supabase        │
└───────────────┘  └────────────────────┘
```

## How Native Platforms Expose window APIs

### iOS (WKWebView)

iOS exposes APIs via `window.webkit.messageHandlers`:

**Swift Setup:**
```swift
// Add message handler
let contentController = WKUserContentController()
contentController.add(self, name: "flowsDB")

let config = WKWebViewConfiguration()
config.userContentController = contentController

let webView = WKWebView(frame: .zero, configuration: config)
```

**JavaScript Usage:**
```javascript
// Send message from JS to Swift
window.webkit.messageHandlers.flowsDB.postMessage({
  id: 'req-123',
  procedure: 'query.tasks',
  input: { filter: { eq: { status: 'pending' } } }
});

// Receive response from Swift (via injected script or event)
window.addEventListener('flowsDB:response', (event) => {
  const { id, result, error } = event.detail;
  // Handle response
});
```

**Swift Handler:**
```swift
extension MyViewController: WKScriptMessageHandler {
  func userContentController(
    _ userContentController: WKUserContentController,
    didReceive message: WKScriptMessage
  ) {
    guard message.name == "flowsDB",
          let data = message.body as? [String: Any],
          let id = data["id"] as? String,
          let procedure = data["procedure"] as? String else {
      return
    }

    // Handle RPC call
    let result = handleProcedure(procedure, input: data["input"])

    // Send response back to JS
    let script = """
      window.dispatchEvent(new CustomEvent('flowsDB:response', {
        detail: { id: '\(id)', result: \(result) }
      }));
    """
    webView.evaluateJavaScript(script)
  }
}
```

### Android (WebView)

Android exposes APIs via `addJavascriptInterface`:

**Kotlin Setup:**
```kotlin
webView.settings.javaScriptEnabled = true

// Expose native object to JavaScript
webView.addJavascriptInterface(FlowsDBBridge(webView), "flowsDB")
```

**JavaScript Usage:**
```javascript
// Send message from JS to Kotlin
window.flowsDB.rpcCall(JSON.stringify({
  id: 'req-123',
  procedure: 'query.tasks',
  input: { filter: { eq: { status: 'pending' } } }
}));

// Receive response from Kotlin (via callback)
window.__flowsDBCallback = function(responseJson) {
  const { id, result, error } = JSON.parse(responseJson);
  // Handle response
};
```

**Kotlin Bridge:**
```kotlin
class FlowsDBBridge(private val webView: WebView) {

  @JavascriptInterface
  fun rpcCall(requestJson: String) {
    val request = JSONObject(requestJson)
    val id = request.getString("id")
    val procedure = request.getString("procedure")
    val input = request.getJSONObject("input")

    // Handle RPC call in background thread
    thread {
      val result = handleProcedure(procedure, input)

      // Send response back to JS
      webView.post {
        webView.evaluateJavascript("""
          window.__flowsDBCallback('${result.toString()}');
        """, null)
      }
    }
  }
}
```

## Unified Client Implementation

The client can detect the environment and use the appropriate API:

```typescript
// src/lib/flows-client.ts
export class FlowsDBClient {
  private send: (data: any) => void;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  async init() {
    if ('serviceWorker' in navigator) {
      // Web: Use Service Worker + MessageChannel
      await this.initServiceWorker();

    } else if (window.webkit?.messageHandlers?.flowsDB) {
      // iOS: Use window.webkit.messageHandlers
      this.initIOSBridge();

    } else if ((window as any).flowsDB) {
      // Android: Use window.flowsDB
      this.initAndroidBridge();

    } else {
      throw new Error('No compatible environment detected');
    }
  }

  private async initServiceWorker() {
    const registration = await navigator.serviceWorker.ready;
    const { port1, port2 } = new MessageChannel();

    registration.active?.postMessage({ type: 'INIT_PORT' }, [port2]);

    port1.onmessage = (event) => {
      this.handleResponse(event.data);
    };

    this.send = (data) => port1.postMessage(data);
  }

  private initIOSBridge() {
    // Set up response listener
    window.addEventListener('flowsDB:response', (event: any) => {
      this.handleResponse(event.detail);
    });

    // Set up send function
    this.send = (data) => {
      window.webkit.messageHandlers.flowsDB.postMessage(data);
    };
  }

  private initAndroidBridge() {
    // Set up global callback
    (window as any).__flowsDBCallback = (responseJson: string) => {
      this.handleResponse(JSON.parse(responseJson));
    };

    // Set up send function
    this.send = (data) => {
      (window as any).flowsDB.rpcCall(JSON.stringify(data));
    };
  }

  private handleResponse(response: { id: string; result?: any; error?: any }) {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.result);
    }
  }

  async call(procedure: string, input: any): Promise<any> {
    const id = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      this.send({
        id,
        procedure,
        input
      });
    });
  }

  // High-level API (same everywhere!)
  get query() {
    return {
      tasks: (input: any) => this.call('query.tasks', input),
      journeys: (input: any) => this.call('query.journeys', input),
    };
  }

  get mutation() {
    return {
      insertTask: (input: any) => this.call('mutation.insertTask', input),
      updateTask: (input: any) => this.call('mutation.updateTask', input),
    };
  }
}
```

## SQLite vs IndexedDB Comparison

| Feature | SQLite (Native) | IndexedDB (Web) |
|---------|----------------|-----------------|
| **Performance** | ✅ Faster (native) | ⚠️ Slower (JS API) |
| **Storage Limit** | ✅ Device storage | ⚠️ ~50-100MB typical |
| **Query Language** | ✅ SQL (powerful) | ❌ Key-value (limited) |
| **Transactions** | ✅ Full ACID | ⚠️ Limited |
| **Full-text Search** | ✅ Built-in FTS5 | ❌ Manual implementation |
| **Complexity** | ⚠️ Requires native code | ✅ Pure JavaScript |
| **Debugging** | ⚠️ Requires native tools | ✅ Chrome DevTools |

## Native SQLite Implementation Example

### iOS (Swift + SQLite.swift)

```swift
import SQLite

class FlowsDBNative {
  private var db: Connection?

  init() {
    let path = NSSearchPathForDirectoriesInDomains(
      .documentDirectory, .userDomainMask, true
    ).first! + "/flows.sqlite3"

    db = try? Connection(path)
    createTables()
  }

  private func createTables() {
    try? db?.run("""
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        client_id TEXT NOT NULL,
        app_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    """)

    try? db?.run("""
      CREATE INDEX IF NOT EXISTS idx_tasks_status
      ON tasks(status)
    """)
  }

  func handleProcedure(_ procedure: String, input: [String: Any]) -> Any {
    let parts = procedure.split(separator: ".")
    guard parts.count == 2 else {
      return ["error": "Invalid procedure format"]
    }

    let namespace = String(parts[0])
    let operation = String(parts[1])

    switch namespace {
    case "query":
      return handleQuery(operation, input: input)
    case "mutation":
      return handleMutation(operation, input: input)
    default:
      return ["error": "Unknown namespace: \(namespace)"]
    }
  }

  private func handleQuery(_ operation: String, input: [String: Any]) -> Any {
    switch operation {
    case "tasks":
      return queryTasks(filter: input["filter"] as? [String: Any])
    default:
      return ["error": "Unknown query: \(operation)"]
    }
  }

  private func queryTasks(filter: [String: Any]?) -> [[String: Any]] {
    var query = "SELECT * FROM tasks"
    var conditions: [String] = []

    if let filter = filter,
       let eq = filter["eq"] as? [String: Any] {

      if let status = eq["status"] as? String {
        conditions.append("status = '\(status)'")
      }
    }

    if !conditions.isEmpty {
      query += " WHERE " + conditions.joined(separator: " AND ")
    }

    guard let db = db else { return [] }

    var results: [[String: Any]] = []

    do {
      for row in try db.prepare(query) {
        results.append([
          "id": row[0] as! String,
          "title": row[1] as! String,
          "status": row[3] as! String,
          // ... more fields
        ])
      }
    } catch {
      print("Query error: \(error)")
    }

    return results
  }

  private func handleMutation(_ operation: String, input: [String: Any]) -> Any {
    switch operation {
    case "insertTask":
      return insertTask(data: input["data"] as! [String: Any])
    case "updateTask":
      return updateTask(id: input["id"] as! String, data: input["data"] as! [String: Any])
    default:
      return ["error": "Unknown mutation: \(operation)"]
    }
  }

  private func insertTask(data: [String: Any]) -> [String: Any] {
    let id = UUID().uuidString
    let now = ISO8601DateFormatter().string(from: Date())

    do {
      try db?.run("""
        INSERT INTO tasks (id, title, status, client_id, app_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      """, id, data["title"], data["status"], data["client_id"], data["app_id"], now, now)

      return [
        "id": id,
        "title": data["title"] ?? "",
        "status": data["status"] ?? "",
        "created_at": now,
        "updated_at": now
      ]
    } catch {
      return ["error": error.localizedDescription]
    }
  }
}
```

### Android (Kotlin + SQLite)

```kotlin
class FlowsDBNative(context: Context) {
  private val dbHelper = FlowsDBHelper(context)
  private val db = dbHelper.writableDatabase

  fun handleProcedure(procedure: String, input: JSONObject): JSONObject {
    val parts = procedure.split(".")
    require(parts.size == 2) { "Invalid procedure format" }

    val namespace = parts[0]
    val operation = parts[1]

    return when (namespace) {
      "query" -> handleQuery(operation, input)
      "mutation" -> handleMutation(operation, input)
      else -> JSONObject().apply {
        put("error", "Unknown namespace: $namespace")
      }
    }
  }

  private fun handleQuery(operation: String, input: JSONObject): JSONObject {
    return when (operation) {
      "tasks" -> queryTasks(input.optJSONObject("filter"))
      else -> JSONObject().apply {
        put("error", "Unknown query: $operation")
      }
    }
  }

  private fun queryTasks(filter: JSONObject?): JSONObject {
    val selection = mutableListOf<String>()
    val selectionArgs = mutableListOf<String>()

    filter?.optJSONObject("eq")?.let { eq ->
      eq.optString("status")?.let { status ->
        selection.add("status = ?")
        selectionArgs.add(status)
      }
    }

    val cursor = db.query(
      "tasks",
      null,
      selection.joinToString(" AND ").ifEmpty { null },
      selectionArgs.toTypedArray(),
      null, null, null
    )

    val results = JSONArray()

    while (cursor.moveToNext()) {
      results.put(JSONObject().apply {
        put("id", cursor.getString(0))
        put("title", cursor.getString(1))
        put("status", cursor.getString(3))
        // ... more fields
      })
    }

    cursor.close()

    return JSONObject().apply {
      put("data", results)
    }
  }

  private fun handleMutation(operation: String, input: JSONObject): JSONObject {
    return when (operation) {
      "insertTask" -> insertTask(input.getJSONObject("data"))
      "updateTask" -> updateTask(input.getString("id"), input.getJSONObject("data"))
      else -> JSONObject().apply {
        put("error", "Unknown mutation: $operation")
      }
    }
  }

  private fun insertTask(data: JSONObject): JSONObject {
    val id = UUID.randomUUID().toString()
    val now = System.currentTimeMillis()

    val values = ContentValues().apply {
      put("id", id)
      put("title", data.getString("title"))
      put("status", data.getString("status"))
      put("client_id", data.getString("client_id"))
      put("app_id", data.getString("app_id"))
      put("created_at", now)
      put("updated_at", now)
    }

    db.insert("tasks", null, values)

    return JSONObject().apply {
      put("id", id)
      put("title", data.getString("title"))
      put("status", data.getString("status"))
      put("created_at", now)
      put("updated_at", now)
    }
  }
}

class FlowsDBHelper(context: Context) :
  SQLiteOpenHelper(context, "flows.db", null, 1) {

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("""
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        client_id TEXT NOT NULL,
        app_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    """)

    db.execSQL("CREATE INDEX idx_tasks_status ON tasks(status)")
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    // Handle schema migrations
  }
}
```

## Migration Strategy

### Phase 1: Web-Only (MVP)
- Use Service Worker + IndexedDB
- Good enough for most use cases
- Fastest time to market
- **Currently implemented in flows-db**

### Phase 2: Add Native Support
- Implement iOS WKWebView bridge
- Implement Android WebView bridge
- Same TypeScript client API
- Better performance + unlimited storage
- Deploy to app stores

## Key Takeaways

✅ **MessageChannel is just postMessage + listener** - No magic

✅ **Native platforms can expose same pattern** - `window.webkit` or `window.flowsDB`

✅ **Same client code everywhere** - Runtime detection, not build-time

✅ **SQLite > IndexedDB** - But IndexedDB is good enough for web

✅ **Start simple, enhance later** - Web first, native when needed

## Documentation References

- **iOS WKWebView**: [WKScriptMessageHandler](https://developer.apple.com/documentation/webkit/wkscriptmessagehandler)
- **Android WebView**: [WebView JavaScript Interface](https://developer.android.com/develop/ui/views/layout/webapps/webview)
- **MessageChannel**: [MDN - MessageChannel API](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel)
- **Android MessageChannel Alternative**: [Replacing addJavascriptInterface with HTML Message Channels](https://commonsware.com/blog/2017/01/23/replacing-addjavascriptinterface-html-message-channels.html)

## Related Documentation

- [SERVICE_WORKER_RPC_INTERFACE.md](./SERVICE_WORKER_RPC_INTERFACE.md) - Base RPC design
- [SERVICE_WORKER_ARCHITECTURE.md](./SERVICE_WORKER_ARCHITECTURE.md) - Web implementation
