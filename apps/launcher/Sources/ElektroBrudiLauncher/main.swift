import AppKit
import Foundation

// ElektroBrudi Phase 0 launcher.
//
// The launcher owns exactly one server child process. It starts the bundled
// Node runtime with the server entry, waits for the loopback health endpoint,
// opens the default browser, and offers Open, Restart, and Quit in the menu
// bar. It never binds a port itself and never chooses another origin.

let appUrl = URL(string: "http://127.0.0.1:47831/")!
let healthUrl = URL(string: "http://127.0.0.1:47831/api/health")!
let bundleIdentifier = "de.elektrobrudi.app"

struct BundleLayout {
    let node: URL
    let serverEntry: URL
    let webDist: URL
    let logDirectory: URL

    static func detect() -> BundleLayout {
        let environment = ProcessInfo.processInfo.environment
        let resources = Bundle.main.resourceURL ?? Bundle.main.bundleURL
        let home = FileManager.default.homeDirectoryForCurrentUser
        let logDirectory = environment["ELEKTROBRUDI_LOG_DIR"].map { URL(fileURLWithPath: $0) }
            ?? home.appendingPathComponent("Library/Logs/ElektroBrudi", isDirectory: true)
        let node = environment["ELEKTROBRUDI_NODE"].map { URL(fileURLWithPath: $0) }
            ?? resources.appendingPathComponent("runtime/bin/node")
        let app = environment["ELEKTROBRUDI_APP_DIR"].map { URL(fileURLWithPath: $0, isDirectory: true) }
            ?? resources.appendingPathComponent("app", isDirectory: true)
        return BundleLayout(
            node: node,
            serverEntry: app.appendingPathComponent("apps/server/src/index.ts"),
            webDist: app.appendingPathComponent("apps/web/dist", isDirectory: true),
            logDirectory: logDirectory
        )
    }
}

final class LauncherLog {
    private let handle: FileHandle?

    init(directory: URL) {
        try? FileManager.default.createDirectory(
            at: directory, withIntermediateDirectories: true,
            attributes: [.posixPermissions: 0o700])
        let file = directory.appendingPathComponent("launcher.log")
        if !FileManager.default.fileExists(atPath: file.path) {
            FileManager.default.createFile(atPath: file.path, contents: nil, attributes: [.posixPermissions: 0o600])
        }
        handle = try? FileHandle(forWritingTo: file)
        handle?.seekToEndOfFile()
    }

    func write(_ message: String) {
        let line = "\(ISO8601DateFormatter().string(from: Date())) \(message)\n"
        handle?.write(Data(line.utf8))
    }

    func write(data: Data) {
        handle?.write(data)
    }
}

final class ServerProcess {
    enum State: Equatable {
        case stopped
        case starting
        case running
        case failed(String)
    }

    private let layout: BundleLayout
    private let log: LauncherLog
    private var process: Process?
    private(set) var state: State = .stopped {
        didSet { onStateChange?(state) }
    }
    var onStateChange: ((State) -> Void)?

    init(layout: BundleLayout, log: LauncherLog) {
        self.layout = layout
        self.log = log
    }

    func start() {
        guard process == nil else { return }
        guard FileManager.default.isExecutableFile(atPath: layout.node.path) else {
            state = .failed("Node-Runtime fehlt: \(layout.node.path)")
            return
        }
        guard FileManager.default.fileExists(atPath: layout.serverEntry.path) else {
            state = .failed("Server-Dateien fehlen: \(layout.serverEntry.path)")
            return
        }

        let child = Process()
        child.executableURL = layout.node
        child.arguments = [layout.serverEntry.path]
        var environment = ProcessInfo.processInfo.environment
        environment["ELEKTROBRUDI_WEB_DIST"] = layout.webDist.path
        environment["ELEKTROBRUDI_LOG_DIR"] = layout.logDirectory.path
        environment.removeValue(forKey: "ELEKTROBRUDI_PORT")
        child.environment = environment
        child.currentDirectoryURL = layout.serverEntry.deletingLastPathComponent()

        let output = Pipe()
        child.standardOutput = output
        child.standardError = output
        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if !data.isEmpty {
                self?.log.write(data: data)
            }
        }
        child.terminationHandler = { [weak self] finished in
            DispatchQueue.main.async {
                guard let self else { return }
                output.fileHandleForReading.readabilityHandler = nil
                self.process = nil
                let code = finished.terminationStatus
                self.log.write("server exited with code \(code)")
                switch (finished.terminationReason, code) {
                case (.exit, 0):
                    self.state = .stopped
                case (.exit, 2):
                    self.state = .failed("Port 47831 ist bereits belegt. ElektroBrudi verwendet keinen anderen Port.")
                default:
                    self.state = .failed("Server beendet mit Code \(code). Details: launcher.log")
                }
            }
        }

        do {
            state = .starting
            try child.run()
            process = child
            log.write("server started, pid \(child.processIdentifier)")
            waitForHealth()
        } catch {
            state = .failed("Server konnte nicht gestartet werden: \(error.localizedDescription)")
        }
    }

    func stop() {
        guard let child = process, child.isRunning else { return }
        log.write("stopping server pid \(child.processIdentifier)")
        child.terminate()
        let deadline = Date().addingTimeInterval(5)
        while child.isRunning && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        }
        if child.isRunning {
            kill(child.processIdentifier, SIGKILL)
            child.waitUntilExit()
        }
    }

    func restart() {
        stop()
        let deadline = Date().addingTimeInterval(5)
        while process != nil && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        }
        start()
    }

    private func waitForHealth() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let deadline = Date().addingTimeInterval(30)
            while Date() < deadline {
                if ServerProcess.healthy() {
                    DispatchQueue.main.async {
                        guard let self, case .starting = self.state else { return }
                        self.state = .running
                        self.log.write("health check passed")
                        NSWorkspace.shared.open(appUrl)
                    }
                    return
                }
                Thread.sleep(forTimeInterval: 0.25)
            }
            DispatchQueue.main.async {
                guard let self, case .starting = self.state else { return }
                self.state = .failed("Health-Check nach 30 s ohne Antwort. Details: launcher.log")
            }
        }
    }

    static func healthy() -> Bool {
        let semaphore = DispatchSemaphore(value: 0)
        var ok = false
        var request = URLRequest(url: healthUrl)
        request.timeoutInterval = 2
        URLSession.shared.dataTask(with: request) { _, response, _ in
            ok = (response as? HTTPURLResponse)?.statusCode == 200
            semaphore.signal()
        }.resume()
        _ = semaphore.wait(timeout: .now() + 3)
        return ok
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private let layout = BundleLayout.detect()
    private lazy var log = LauncherLog(directory: layout.logDirectory)
    private lazy var server = ServerProcess(layout: layout, log: log)
    private var statusItem: NSStatusItem!
    private let statusMenuItem = NSMenuItem(title: "Status: gestoppt", action: nil, keyEquivalent: "")

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.title = "⚡︎ EB"
        let menu = NSMenu()
        statusMenuItem.isEnabled = false
        menu.addItem(statusMenuItem)
        menu.addItem(.separator())
        menu.addItem(withTitle: "ElektroBrudi öffnen", action: #selector(openApp), keyEquivalent: "o")
        menu.addItem(withTitle: "Server neu starten", action: #selector(restartServer), keyEquivalent: "r")
        menu.addItem(.separator())
        menu.addItem(withTitle: "Beenden", action: #selector(quit), keyEquivalent: "q")
        statusItem.menu = menu

        server.onStateChange = { [weak self] state in
            self?.render(state)
        }
        log.write("launcher started; node=\(layout.node.path)")
        server.start()
    }

    func applicationWillTerminate(_ notification: Notification) {
        server.stop()
        log.write("launcher terminated")
    }

    private func render(_ state: ServerProcess.State) {
        switch state {
        case .stopped:
            statusMenuItem.title = "Status: gestoppt"
        case .starting:
            statusMenuItem.title = "Status: startet…"
        case .running:
            statusMenuItem.title = "Status: läuft auf 127.0.0.1:47831"
        case .failed(let message):
            statusMenuItem.title = "Status: Fehler"
            let alert = NSAlert()
            alert.messageText = "ElektroBrudi konnte den Server nicht starten"
            alert.informativeText = message
            alert.alertStyle = .warning
            alert.addButton(withTitle: "OK")
            NSApp.activate(ignoringOtherApps: true)
            alert.runModal()
        }
    }

    @objc private func openApp() {
        if case .running = server.state {
            NSWorkspace.shared.open(appUrl)
        } else if case .stopped = server.state {
            server.start()
        } else {
            NSWorkspace.shared.open(appUrl)
        }
    }

    @objc private func restartServer() {
        server.restart()
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}

// Single instance: a second launch activates the existing one and opens the app.
let others = NSRunningApplication.runningApplications(withBundleIdentifier: bundleIdentifier)
    .filter { $0.processIdentifier != ProcessInfo.processInfo.processIdentifier }
if !others.isEmpty {
    others.first?.activate()
    if ServerProcess.healthy() {
        NSWorkspace.shared.open(appUrl)
    }
    exit(0)
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.setActivationPolicy(.accessory)
application.run()
