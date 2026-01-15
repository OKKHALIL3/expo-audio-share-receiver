const {
  withXcodeProject,
  withEntitlementsPlist,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs-extra");
const path = require("path");

const EXTENSION_TARGET_NAME = "AudioShareExtension";
const STORYBOARD_NAME = "MainInterface";

/**
 * Config plugin for expo-audio-share-receiver
 * Automatically sets up the iOS Share Extension for audio file sharing
 */
const withAudioShareExtension = (config, options = {}) => {
  const {
    appGroupId,
    urlSchemes = [config.scheme || config.slug],
    urlPath = "audioShare",
    extensionName,
  } = options;

  if (!appGroupId) {
    throw new Error(
      "expo-audio-share-receiver: appGroupId is required. Example: 'group.com.yourapp.audioShare'"
    );
  }

  // Add App Groups to main app entitlements
  config = withMainAppEntitlements(config, appGroupId);

  // Create extension files
  config = withShareExtensionFiles(config, {
    appGroupId,
    urlSchemes,
    urlPath,
    extensionName: extensionName || config.name,
  });

  // Add the share extension target to Xcode project
  config = withShareExtensionTarget(config, {
    appGroupId,
    extensionName: extensionName || config.name,
  });

  return config;
};

/**
 * Add App Groups entitlement to the main app
 */
const withMainAppEntitlements = (config, appGroupId) => {
  return withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.security.application-groups"] = [appGroupId];
    return config;
  });
};

/**
 * Create all extension files (Swift, plist, storyboard, entitlements)
 */
const withShareExtensionFiles = (config, options) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const { appGroupId, urlSchemes, urlPath, extensionName } = options;
      const platformProjectRoot = config.modRequest.platformProjectRoot;

      const extensionDir = path.join(platformProjectRoot, EXTENSION_TARGET_NAME);
      await fs.ensureDir(extensionDir);

      const libraryIosDir = path.join(__dirname, "..", "ios");

      await copySwiftFiles(libraryIosDir, extensionDir, {
        appGroupId,
        urlSchemes,
        urlPath,
        extensionName,
      });

      await createExtensionInfoPlist(extensionDir, extensionName);
      await createExtensionEntitlements(extensionDir, appGroupId);
      await createStoryboard(extensionDir);

      console.log(
        `[expo-audio-share-receiver] Created extension files in ${extensionDir}`
      );

      return config;
    },
  ]);
};

/**
 * Add the Share Extension target to the Xcode project
 */
const withShareExtensionTarget = (config, options) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;

    const bundleId = config.ios?.bundleIdentifier;
    if (!bundleId) {
      throw new Error("iOS bundleIdentifier is required");
    }
    const extensionBundleId = `${bundleId}.${EXTENSION_TARGET_NAME}`;
    const teamId = config.ios?.appleTeamId || config.ios?.teamId;

    // Check if target already exists
    const existingTarget = xcodeProject.pbxTargetByName(EXTENSION_TARGET_NAME);
    if (existingTarget) {
      console.log(
        `[expo-audio-share-receiver] Share extension target already exists, skipping...`
      );
      return config;
    }

    // Generate all UUIDs upfront
    const targetUuid = xcodeProject.generateUuid();
    const productFileUuid = xcodeProject.generateUuid();
    const buildConfigListUuid = xcodeProject.generateUuid();
    const debugBuildConfigUuid = xcodeProject.generateUuid();
    const releaseBuildConfigUuid = xcodeProject.generateUuid();
    const sourcesBuildPhaseUuid = xcodeProject.generateUuid();
    const resourcesBuildPhaseUuid = xcodeProject.generateUuid();
    const frameworksBuildPhaseUuid = xcodeProject.generateUuid();
    const groupUuid = xcodeProject.generateUuid();

    // File UUIDs
    const shareVCFileUuid = xcodeProject.generateUuid();
    const audioStoreFileUuid = xcodeProject.generateUuid();
    const storyboardFileUuid = xcodeProject.generateUuid();
    const infoPlistFileUuid = xcodeProject.generateUuid();
    const entitlementsFileUuid = xcodeProject.generateUuid();

    // Build file UUIDs
    const shareVCBuildFileUuid = xcodeProject.generateUuid();
    const audioStoreBuildFileUuid = xcodeProject.generateUuid();
    const storyboardBuildFileUuid = xcodeProject.generateUuid();

    const extensionRelativePath = EXTENSION_TARGET_NAME;
    const infoPlistPath = `${extensionRelativePath}/Info.plist`;
    const entitlementsPath = `${extensionRelativePath}/${EXTENSION_TARGET_NAME}.entitlements`;

    // Add file references
    const pbxFileRef = xcodeProject.hash.project.objects.PBXFileReference;

    // File paths are relative to the group, not the project root
    pbxFileRef[shareVCFileUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "sourcecode.swift",
      path: "ShareViewController.swift",
      sourceTree: '"<group>"',
    };
    pbxFileRef[`${shareVCFileUuid}_comment`] = "ShareViewController.swift";

    pbxFileRef[audioStoreFileUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "sourcecode.swift",
      path: "AudioShareStore.swift",
      sourceTree: '"<group>"',
    };
    pbxFileRef[`${audioStoreFileUuid}_comment`] = "AudioShareStore.swift";

    pbxFileRef[storyboardFileUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "file.storyboard",
      path: `${STORYBOARD_NAME}.storyboard`,
      sourceTree: '"<group>"',
    };
    pbxFileRef[`${storyboardFileUuid}_comment`] = `${STORYBOARD_NAME}.storyboard`;

    pbxFileRef[infoPlistFileUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "text.plist.xml",
      path: "Info.plist",
      sourceTree: '"<group>"',
    };
    pbxFileRef[`${infoPlistFileUuid}_comment`] = "Info.plist";

    pbxFileRef[entitlementsFileUuid] = {
      isa: "PBXFileReference",
      lastKnownFileType: "text.plist.entitlements",
      path: `${EXTENSION_TARGET_NAME}.entitlements`,
      sourceTree: '"<group>"',
    };
    pbxFileRef[`${entitlementsFileUuid}_comment`] = `${EXTENSION_TARGET_NAME}.entitlements`;

    // Add product file reference
    pbxFileRef[productFileUuid] = {
      isa: "PBXFileReference",
      explicitFileType: '"wrapper.app-extension"',
      includeInIndex: 0,
      path: `${EXTENSION_TARGET_NAME}.appex`,
      sourceTree: "BUILT_PRODUCTS_DIR",
    };
    pbxFileRef[`${productFileUuid}_comment`] = `${EXTENSION_TARGET_NAME}.appex`;

    // Add build files
    const pbxBuildFile = xcodeProject.hash.project.objects.PBXBuildFile;

    pbxBuildFile[shareVCBuildFileUuid] = {
      isa: "PBXBuildFile",
      fileRef: shareVCFileUuid,
      fileRef_comment: "ShareViewController.swift",
    };
    pbxBuildFile[`${shareVCBuildFileUuid}_comment`] = "ShareViewController.swift in Sources";

    pbxBuildFile[audioStoreBuildFileUuid] = {
      isa: "PBXBuildFile",
      fileRef: audioStoreFileUuid,
      fileRef_comment: "AudioShareStore.swift",
    };
    pbxBuildFile[`${audioStoreBuildFileUuid}_comment`] = "AudioShareStore.swift in Sources";

    pbxBuildFile[storyboardBuildFileUuid] = {
      isa: "PBXBuildFile",
      fileRef: storyboardFileUuid,
      fileRef_comment: `${STORYBOARD_NAME}.storyboard`,
    };
    pbxBuildFile[`${storyboardBuildFileUuid}_comment`] = `${STORYBOARD_NAME}.storyboard in Resources`;

    // Create group for extension files
    const pbxGroup = xcodeProject.hash.project.objects.PBXGroup;
    pbxGroup[groupUuid] = {
      isa: "PBXGroup",
      children: [
        { value: shareVCFileUuid, comment: "ShareViewController.swift" },
        { value: audioStoreFileUuid, comment: "AudioShareStore.swift" },
        { value: storyboardFileUuid, comment: `${STORYBOARD_NAME}.storyboard` },
        { value: infoPlistFileUuid, comment: "Info.plist" },
        { value: entitlementsFileUuid, comment: `${EXTENSION_TARGET_NAME}.entitlements` },
      ],
      name: EXTENSION_TARGET_NAME,
      path: EXTENSION_TARGET_NAME,
      sourceTree: '"<group>"',
    };
    pbxGroup[`${groupUuid}_comment`] = EXTENSION_TARGET_NAME;

    // Add group to main project group
    const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
    const mainGroup = pbxGroup[mainGroupKey];
    if (mainGroup && mainGroup.children) {
      mainGroup.children.push({ value: groupUuid, comment: EXTENSION_TARGET_NAME });
    }

    // Add product to Products group
    const productsGroupKey = Object.keys(pbxGroup).find(
      (key) => !key.includes("_comment") && pbxGroup[key].name === "Products"
    );
    if (productsGroupKey) {
      pbxGroup[productsGroupKey].children.push({
        value: productFileUuid,
        comment: `${EXTENSION_TARGET_NAME}.appex`,
      });
    }

    // Common build settings
    const commonBuildSettings = {
      CLANG_ENABLE_MODULES: "YES",
      CODE_SIGN_ENTITLEMENTS: `"${entitlementsPath}"`,
      CODE_SIGN_STYLE: "Automatic",
      CURRENT_PROJECT_VERSION: "1",
      GENERATE_INFOPLIST_FILE: "NO",
      INFOPLIST_FILE: `"${infoPlistPath}"`,
      IPHONEOS_DEPLOYMENT_TARGET: "15.1",
      LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      MARKETING_VERSION: "1.0",
      PRODUCT_BUNDLE_IDENTIFIER: `"${extensionBundleId}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SKIP_INSTALL: "YES",
      SWIFT_EMIT_LOC_STRINGS: "YES",
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: '"1,2"',
    };

    if (teamId) {
      commonBuildSettings.DEVELOPMENT_TEAM = teamId;
    }

    // Add build configurations
    const pbxBuildConfig = xcodeProject.hash.project.objects.XCBuildConfiguration;

    pbxBuildConfig[debugBuildConfigUuid] = {
      isa: "XCBuildConfiguration",
      buildSettings: {
        ...commonBuildSettings,
        DEBUG_INFORMATION_FORMAT: "dwarf",
        MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
        SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
      },
      name: "Debug",
    };
    pbxBuildConfig[`${debugBuildConfigUuid}_comment`] = "Debug";

    pbxBuildConfig[releaseBuildConfigUuid] = {
      isa: "XCBuildConfiguration",
      buildSettings: {
        ...commonBuildSettings,
        COPY_PHASE_STRIP: "NO",
        DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
        SWIFT_OPTIMIZATION_LEVEL: '"-O"',
      },
      name: "Release",
    };
    pbxBuildConfig[`${releaseBuildConfigUuid}_comment`] = "Release";

    // Add configuration list
    const pbxConfigList = xcodeProject.hash.project.objects.XCConfigurationList;
    pbxConfigList[buildConfigListUuid] = {
      isa: "XCConfigurationList",
      buildConfigurations: [
        { value: debugBuildConfigUuid, comment: "Debug" },
        { value: releaseBuildConfigUuid, comment: "Release" },
      ],
      defaultConfigurationIsVisible: 0,
      defaultConfigurationName: "Release",
    };
    pbxConfigList[`${buildConfigListUuid}_comment`] = `Build configuration list for PBXNativeTarget "${EXTENSION_TARGET_NAME}"`;

    // Add Sources build phase
    const pbxSourcesBuildPhase = xcodeProject.hash.project.objects.PBXSourcesBuildPhase;
    pbxSourcesBuildPhase[sourcesBuildPhaseUuid] = {
      isa: "PBXSourcesBuildPhase",
      buildActionMask: 2147483647,
      files: [
        { value: shareVCBuildFileUuid, comment: "ShareViewController.swift in Sources" },
        { value: audioStoreBuildFileUuid, comment: "AudioShareStore.swift in Sources" },
      ],
      runOnlyForDeploymentPostprocessing: 0,
    };
    pbxSourcesBuildPhase[`${sourcesBuildPhaseUuid}_comment`] = "Sources";

    // Add Resources build phase
    const pbxResourcesBuildPhase = xcodeProject.hash.project.objects.PBXResourcesBuildPhase;
    pbxResourcesBuildPhase[resourcesBuildPhaseUuid] = {
      isa: "PBXResourcesBuildPhase",
      buildActionMask: 2147483647,
      files: [
        { value: storyboardBuildFileUuid, comment: `${STORYBOARD_NAME}.storyboard in Resources` },
      ],
      runOnlyForDeploymentPostprocessing: 0,
    };
    pbxResourcesBuildPhase[`${resourcesBuildPhaseUuid}_comment`] = "Resources";

    // Add Frameworks build phase
    const pbxFrameworksBuildPhase = xcodeProject.hash.project.objects.PBXFrameworksBuildPhase;
    pbxFrameworksBuildPhase[frameworksBuildPhaseUuid] = {
      isa: "PBXFrameworksBuildPhase",
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    pbxFrameworksBuildPhase[`${frameworksBuildPhaseUuid}_comment`] = "Frameworks";

    // Create the native target
    const pbxNativeTarget = xcodeProject.hash.project.objects.PBXNativeTarget;
    pbxNativeTarget[targetUuid] = {
      isa: "PBXNativeTarget",
      buildConfigurationList: buildConfigListUuid,
      buildConfigurationList_comment: `Build configuration list for PBXNativeTarget "${EXTENSION_TARGET_NAME}"`,
      buildPhases: [
        { value: sourcesBuildPhaseUuid, comment: "Sources" },
        { value: frameworksBuildPhaseUuid, comment: "Frameworks" },
        { value: resourcesBuildPhaseUuid, comment: "Resources" },
      ],
      buildRules: [],
      dependencies: [],
      name: `"${EXTENSION_TARGET_NAME}"`,
      productName: `"${EXTENSION_TARGET_NAME}"`,
      productReference: productFileUuid,
      productReference_comment: `${EXTENSION_TARGET_NAME}.appex`,
      productType: '"com.apple.product-type.app-extension"',
    };
    pbxNativeTarget[`${targetUuid}_comment`] = EXTENSION_TARGET_NAME;

    // Add to project targets
    const project = xcodeProject.getFirstProject();
    if (project && project.firstProject) {
      project.firstProject.targets.push({
        value: targetUuid,
        comment: EXTENSION_TARGET_NAME,
      });

      // Add target attributes
      if (!project.firstProject.attributes.TargetAttributes) {
        project.firstProject.attributes.TargetAttributes = {};
      }
      project.firstProject.attributes.TargetAttributes[targetUuid] = {
        CreatedOnToolsVersion: "15.0",
        ProvisioningStyle: "Automatic",
      };
      if (teamId) {
        project.firstProject.attributes.TargetAttributes[targetUuid].DevelopmentTeam = teamId;
      }
    }

    // Add embed extension phase to main app
    const mainTarget = xcodeProject.getFirstTarget();
    if (mainTarget) {
      const embedPhaseUuid = xcodeProject.generateUuid();
      const embedBuildFileUuid = xcodeProject.generateUuid();
      const containerProxyUuid = xcodeProject.generateUuid();
      const targetDependencyUuid = xcodeProject.generateUuid();

      // Add build file for embedding
      pbxBuildFile[embedBuildFileUuid] = {
        isa: "PBXBuildFile",
        fileRef: productFileUuid,
        fileRef_comment: `${EXTENSION_TARGET_NAME}.appex`,
        settings: { ATTRIBUTES: ["RemoveHeadersOnCopy"] },
      };
      pbxBuildFile[`${embedBuildFileUuid}_comment`] = `${EXTENSION_TARGET_NAME}.appex in Embed App Extensions`;

      // Add copy files phase
      const pbxCopyFilesBuildPhase = xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase || {};
      xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase = pbxCopyFilesBuildPhase;

      pbxCopyFilesBuildPhase[embedPhaseUuid] = {
        isa: "PBXCopyFilesBuildPhase",
        buildActionMask: 2147483647,
        dstPath: '""',
        dstSubfolderSpec: 13,
        files: [
          { value: embedBuildFileUuid, comment: `${EXTENSION_TARGET_NAME}.appex in Embed App Extensions` },
        ],
        name: '"Embed App Extensions"',
        runOnlyForDeploymentPostprocessing: 0,
      };
      pbxCopyFilesBuildPhase[`${embedPhaseUuid}_comment`] = "Embed App Extensions";

      // Add phase to main target
      const mainTargetObj = pbxNativeTarget[mainTarget.uuid];
      if (mainTargetObj && mainTargetObj.buildPhases) {
        mainTargetObj.buildPhases.push({
          value: embedPhaseUuid,
          comment: "Embed App Extensions",
        });
      }

      // Add container item proxy
      const pbxContainerItemProxy = xcodeProject.hash.project.objects.PBXContainerItemProxy || {};
      xcodeProject.hash.project.objects.PBXContainerItemProxy = pbxContainerItemProxy;

      pbxContainerItemProxy[containerProxyUuid] = {
        isa: "PBXContainerItemProxy",
        containerPortal: project.uuid,
        containerPortal_comment: "Project object",
        proxyType: 1,
        remoteGlobalIDString: targetUuid,
        remoteInfo: `"${EXTENSION_TARGET_NAME}"`,
      };
      pbxContainerItemProxy[`${containerProxyUuid}_comment`] = "PBXContainerItemProxy";

      // Add target dependency
      const pbxTargetDependency = xcodeProject.hash.project.objects.PBXTargetDependency || {};
      xcodeProject.hash.project.objects.PBXTargetDependency = pbxTargetDependency;

      pbxTargetDependency[targetDependencyUuid] = {
        isa: "PBXTargetDependency",
        target: targetUuid,
        target_comment: EXTENSION_TARGET_NAME,
        targetProxy: containerProxyUuid,
        targetProxy_comment: "PBXContainerItemProxy",
      };
      pbxTargetDependency[`${targetDependencyUuid}_comment`] = "PBXTargetDependency";

      // Add to main target dependencies
      if (mainTargetObj && mainTargetObj.dependencies) {
        mainTargetObj.dependencies.push({
          value: targetDependencyUuid,
          comment: "PBXTargetDependency",
        });
      }
    }

    console.log(
      `[expo-audio-share-receiver] Added Share Extension target: ${EXTENSION_TARGET_NAME}`
    );

    return config;
  });
};

/**
 * Copy and customize Swift files for the extension
 */
async function copySwiftFiles(libraryIosDir, extensionDir, options) {
  const { appGroupId, urlSchemes, urlPath, extensionName } = options;

  const shareViewControllerTemplate = await fs.readFile(
    path.join(libraryIosDir, "ShareViewController.swift"),
    "utf8"
  );

  const audioShareStore = await fs.readFile(
    path.join(libraryIosDir, "AudioShareStore.swift"),
    "utf8"
  );

  const urlSchemesString = urlSchemes.map((s) => `"${s}"`).join(", ");

  let customizedShareViewController = shareViewControllerTemplate
    .replace(
      /return "group\.com\.example\.audioshare"/g,
      `return "${appGroupId}"`
    )
    .replace(/return \["exampleapp"\]/g, `return [${urlSchemesString}]`)
    .replace(
      /open var hostAppURLPath: String \{[\s\S]*?return ""[\s\S]*?\}/,
      `open var hostAppURLPath: String {\n        return "${urlPath}"\n    }`
    )
    .replace(
      /openButton\.setTitle\("Open App"/g,
      `openButton.setTitle("Open ${extensionName}"`
    );

  if (!customizedShareViewController.includes("final class ShareViewController")) {
    customizedShareViewController += `

// Storyboard entry point
final class ShareViewController: ExpoAudioShareReceiverViewController {}
`;
  }

  await fs.writeFile(
    path.join(extensionDir, "ShareViewController.swift"),
    customizedShareViewController
  );
  await fs.writeFile(
    path.join(extensionDir, "AudioShareStore.swift"),
    audioShareStore
  );
}

/**
 * Create Info.plist for the share extension
 */
async function createExtensionInfoPlist(extensionDir, extensionName) {
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>${extensionName}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionAttributes</key>
		<dict>
			<key>NSExtensionActivationRule</key>
			<dict>
				<key>NSExtensionActivationSupportsFileWithMaxCount</key>
				<integer>10</integer>
			</dict>
		</dict>
		<key>NSExtensionMainStoryboard</key>
		<string>${STORYBOARD_NAME}</string>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.share-services</string>
	</dict>
</dict>
</plist>
`;

  await fs.writeFile(path.join(extensionDir, "Info.plist"), infoPlist);
}

/**
 * Create entitlements file for the share extension
 */
async function createExtensionEntitlements(extensionDir, appGroupId) {
  const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>${appGroupId}</string>
	</array>
</dict>
</plist>
`;

  await fs.writeFile(
    path.join(extensionDir, `${EXTENSION_TARGET_NAME}.entitlements`),
    entitlements
  );
}

/**
 * Create the storyboard for the share extension
 */
async function createStoryboard(extensionDir) {
  const storyboard = `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="13122.16" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="j1y-V4-xli">
    <dependencies>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="13104.12"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="ceB-am-kn3">
            <objects>
                <viewController id="j1y-V4-xli" customClass="ShareViewController" customModuleProvider="target" sceneMemberID="viewController">
                    <view key="view" opaque="NO" contentMode="scaleToFill" id="wbc-yd-nQP">
                        <rect key="frame" x="0.0" y="0.0" width="375" height="667"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <color key="backgroundColor" red="0.0" green="0.0" blue="0.0" alpha="0.0" colorSpace="custom" customColorSpace="sRGB"/>
                        <viewLayoutGuide key="safeArea" id="1Xd-am-t49"/>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="CEy-Cv-SGf" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
        </scene>
    </scenes>
</document>
`;

  await fs.writeFile(
    path.join(extensionDir, `${STORYBOARD_NAME}.storyboard`),
    storyboard
  );
}

module.exports = withAudioShareExtension;
