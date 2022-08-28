import type { XcodeProjectObject, XcodeProjectObjectReference, XcodeCommentedValue } from "./xcode";
import type { XCConfigurationList } from "./xcconfigurationlist";
import type { XCSwiftPackageProductDependency } from "./xcswiftpackageproductdependency";
import type { PBXTargetDependency } from "./pbxtargetdependency";
import type { PBXBuildPhase } from "./pbxbuildphase";
import type { PBXBuildRule } from "./pbxbuildrule";
import type { PBXFileReference } from "./xcfilesystemobject";

/**
 * Basic information that describes a build pipeline and its output
 */
export declare interface PBXBaseTarget extends XcodeProjectObject {
    /**
     * A reference to the group of distinct sets of settings that can be used to compile the target. Concrete data can be accessed through the project's `XCConfigurationList` object archive
     */
    buildConfigurationList: XcodeProjectObjectReference<XCConfigurationList>;
    /**
     * Information describing the build configuration list, ignored by Xcode when parsing
     */
    buildConfigurationList_comment?: string;
    /**
     * References to the steps of the build pipeline for the target, in order of execution. Concrete data can be accessed through one of the project's {@link PBXBuildPhase}-based object archives
     */
    buildPhases: XcodeCommentedValue<XcodeProjectObjectReference<PBXBuildPhase>>[];
    /**
     * References to descriptions of any other targets that this target depends upon to be built before this target can be built. Concrete data can be accessed through the project's `PBXTargetDependency` object archive
     */
    dependencies: XcodeCommentedValue<XcodeProjectObjectReference<PBXTargetDependency>>[];
    /**
     * The name of the target in Xcode's interface
     */
    name: string;
    /**
     * The name of the compiled product that the target produces, sans any kind of file extension
     */
    productName: string;
}

/**
 * A build pipeline and output that Xcode natively understands how to execute and produce without external tooling
 */
export declare interface PBXNativeTarget extends PBXBaseTarget {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXNativeTarget";
    /**
     * References to custom methods of transforming specific input file types to output files. Concrete data for each rule can be accessed through the project's `PBXBuildRule` object archive
     */
    buildRules: XcodeCommentedValue<XcodeProjectObjectReference<PBXBuildRule>>[];
    /**
     * A reference to the information about the on-disk output file of the build pipeline
     */
    productReference: XcodeProjectObjectReference<PBXFileReference>;
    /**
     * Information about the on-disk output file of the build pipeline, ignored by Xcode when parsing
     */
    productReference_comment?: string;
    /**
     * References to the packages managed by the Swift Package Manager that this target depends on to be built before this target itself can be built
     */
    packageProductDependencies?: XcodeCommentedValue<XcodeProjectObjectReference<XCSwiftPackageProductDependency>>[];
    /**
     * The file path where the compiled product should be installed. Seemingly unused by modern Xcode
     */
    productInstallPath?: string;
    /**
     * The well-known type of product that this target produces
     */
    productType: XcodeProductType;
}

/**
 * A type of product that Xcode can produce
 */
export declare type XcodeProductType = '""' | '"com.apple.product-type.application"' | '"com.apple.product-type.framework"' | '"com.apple.product-type.framework.static"' | '"com.apple.product-type.xcframework"' | '"com.apple.product-type.library.dynamic"' | '"com.apple.product-type.library.static"' | '"com.apple.product-type.bundle"' | '"com.apple.product-type.bundle.unit-test"' | '"com.apple.product-type.bundle.ui-testing"' | '"com.apple.product-type.app-extension"' | '"com.apple.product-type.tool"' | '"com.apple.product-type.application.watchapp"' | '"com.apple.product-type.application.watchapp2"' | '"com.apple.product-type.application.watchapp2-container"' | '"com.apple.product-type.watchkit-extension"' | '"com.apple.product-type.watchkit2-extension"' | '"com.apple.product-type.tv-app-extension"' | '"com.apple.product-type.application.messages"' | '"com.apple.product-type.app-extension.messages"' | '"com.apple.product-type.app-extension.messages-sticker-pack"' | '"com.apple.product-type.xpc-service"' | '"com.apple.product-type.bundle.ocunit-test"' | '"com.apple.product-type.xcode-extension"' | '"com.apple.product-type.instruments-package"' | '"com.apple.product-type.app-extension.intents-service"' | '"com.apple.product-type.application.on-demand-install-capable"' | '"com.apple.product-type.metal-library"';

/**
 * A build pipeline and output that consists of the pipelines and outputs of one or more other targets
 */
export declare interface PBXAggregateTarget extends PBXBaseTarget {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXAggregateTarget";
}

/**
 * A build pipeline and output that Xcode relies on external tooling to execute and produce
 */
export declare interface PBXLegacyTarget extends PBXBaseTarget {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXLegacyTarget";
    /**
     * The file path to the script to execute, relative to the `buildWorkingDirectory`
     */
    buildToolPath: string;
    /**
     * The path to the directory that build tasks related to this target should be executed in the context of
     */
    buildWorkingDirectory: string;
    /**
     * Command line arguments that should be passed to the build tool when executing it
     */
    buildArgumentsString: string;
    /**
     * Indicates if the build settings defined in the current configuration should be mapped to environment variables that the build tool being executed can access. `1` if so, `0` if not
     */
    passBuildSettingsInEnvironment: 0 | 1;
}

/**
 * Instructions and information needed to transform input source files into output files ready for execution and/or distribution
 */
export declare type PBXTarget = PBXNativeTarget | PBXAggregateTarget | PBXLegacyTarget;