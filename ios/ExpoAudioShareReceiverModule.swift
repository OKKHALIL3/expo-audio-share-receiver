import ExpoModulesCore

public class ExpoAudioShareReceiverModule: Module {
    
    private var groupName: String?
    
    public func definition() -> ModuleDefinition {
        Name("ExpoAudioShareReceiver")
        
        AsyncFunction("setAppGroup") { (group: String) in
            self.groupName = group
        }
        
        AsyncFunction("getSharedAudioFiles") { () -> [String] in
            let finalGroup = self.groupName ?? "group.com.default.audioShare"
            let files = AudioShareStore.shared.getStoredFiles(groupName: finalGroup)
            return files.map { $0.path }
        }
        
        AsyncFunction("refreshFiles") { () -> [String] in
            let finalGroup = self.groupName ?? "group.com.default.audioShare"
            let files = AudioShareStore.shared.getStoredFiles(groupName: finalGroup)
            self.sendEvent("onNewFiles", ["files": files.map { $0.path }])
            return files.map { $0.path }
        }
        
        Events("onNewFiles")
    }
}

