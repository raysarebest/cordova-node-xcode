import type { XcodeProjectObject, XcodeProjectObjectReference, XcodePlatformFilter } from "./xcode";
import type { XCSwiftPackageProductDependency } from "./xcswiftpackageproductdependency";
import type { PBXFileReference } from "./xcfiletreeobject";

/**
 * Basic information about a file that's either comipled or copied into a target in a build phase
 */
export declare interface PBXBaseBuildFile extends XcodeProjectObject {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXBuildFile";
    /**
     * Information that describes how the file should treated while being built
     */
    settings?: PBXBuildFileSettings
}

/**
 * Information that describes how a file should treated while being built by a build phase
 */
export declare interface PBXBuildFileSettings {
    [key: string]: unknown;

    /**
     * Xcode-defined preferences about how the file should be compiled or built. Note that different values are appropriate here based on the type of file
     */
    ATTRIBUTES?: XcodeBuildFileSettingAttributes;
    /**
     * A space-separated list of file-specific flags to pass to the compiler when the file is built
     */
    COMPILER_FLAGS?: string | number;
    /**
     * The on-demand resource tags that describe the groups this resource file belongs to that define when it should be downloaded from Apple's servers onto the user's device
     */
    ASSET_TAGS?: (string | number)[];
    /**
     * Present in the context of targets that can be compiled for Mac Catalyst, defines which platforms the file can be built for. If the target supports Mac Catalyst but this property is missing, the file can be built for all platforms
     */
    platformFilter?: XcodePlatformFilter;
}

/**
 * Possible values for Xcode-defined preferences about how the file should be compiled or built. Note that different values are appropriate here based on the type of file
 */
export declare type XcodeBuildFileSettingAttributes = (("Public" | "Private") | ("Weak" | "Required") | ("CodeSignOnCopy" | "RemoveHeadersOnCopy") | string)[];

/**
 * A file locally managed by this project for compilation or copying into a target by a build phase in this project
 */
export declare interface PBXInternalBuildFile extends PBXBaseBuildFile {
    /**
     * A reference to the internal metadata for this file. Concrete data can be accessed through the project's `PBXFileReference` object archive
     */
    fileRef: XcodeProjectObjectReference<PBXFileReference>;
    /**
     * Information describing the file metadata, ignored by Xcode when parsing
     */
    fileRef_comment?: string;
}

/**
 * A Swift Package Manager-based dependency that should be compiled into a target in this project
 */
export declare interface PBXSwiftPackageBuildFile extends PBXBaseBuildFile {
    /**
     * A reference to the internal metadata for this package. Concrete data can be accessed through the project's `XCSwiftPackageProductDependency` object archive
     */
    productRef: XcodeProjectObjectReference<XCSwiftPackageProductDependency>;
    /**
     * Information describing the dependency metadata, ignored by Xcode when parsing
     */
    productRef_comment?: string;
}

/**
 * A file that's either comipled or copied into a target in a build phase
 */
export declare type PBXBuildFile = PBXInternalBuildFile | PBXSwiftPackageBuildFile;