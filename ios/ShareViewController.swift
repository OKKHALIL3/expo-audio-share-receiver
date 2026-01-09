import UIKit
import Social
import MobileCoreServices

class ShareViewController: SLComposeServiceViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem else { return }
        
        for attachment in item.attachments ?? [] {
            if attachment.hasItemConformingToTypeIdentifier(kUTTypeAudio as String) {
                attachment.loadItem(forTypeIdentifier: kUTTypeAudio as String, options: nil) { [weak self] data, error in
                    if let url = data as? URL {
                        // Store in App Group folder
                        AudioShareStore.shared.storeFiles(urls: [url], groupName: "group.com.theirapp.audioShare")
                    }
                }
            }
        }
        
        // Open host app via deep link
        if let url = URL(string: "theirapp://audioShare") {
            var responder = self as UIResponder?
            while responder != nil {
                if let application = responder as? UIApplication {
                    application.open(url, options: [:], completionHandler: nil)
                    break
                }
                responder = responder?.next
            }
        }
        
        // Complete the extension
        self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    override func isContentValid() -> Bool { return true }
    override func didSelectPost() {}
    override func configurationItems() -> [Any]! { return [] }
}
