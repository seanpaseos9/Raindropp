//
//  SafariWebExtensionHandler.swift
//  Save to Raindrop.io Extension
//
//  Created by Rustem Mussabekov on 18.09.2020.
//

import SafariServices
import os.log

let SFExtensionMessageKey = "message"

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

	func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems[0] as! NSExtensionItem
        let message = item.userInfo?[SFExtensionMessageKey]
        os_log(.default, "Received message from browser.runtime.sendNativeMessage: %@", message as! CVarArg)

        //created profiles send their uuid, the default profile sends nothing
        var profile: String? = nil
        if #available(macOS 14.0, iOS 17.0, *) {
            profile = (item.userInfo?[SFExtensionProfileKey] as? UUID)?.uuidString
        }

        let response = NSExtensionItem()
        response.userInfo = [ SFExtensionMessageKey: [ "profile_id": profile != nil ? profile! as Any : NSNull() ] ]

        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

}
