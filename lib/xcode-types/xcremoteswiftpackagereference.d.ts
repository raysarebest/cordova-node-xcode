import type { XcodeProjectObject } from "./xcode";

/**
 * A reference to a remote (not local) Swift Package Manager-based package for use in an Xcode project
 */
export declare interface XCRemoteSwiftPackageReference extends XcodeProjectObject {
    /**
     * The name of the type this object represents
     */
    readonly isa: "XCRemoteSwiftPackageReference";
    /**
     * The remote URL at which the package's repository can be found. This might be an HTTP(S) or SSH URL, but cannot be a local file URL
     */
    repositoryURL: string;
    /**
     * The requirements for the package manager to meet to resolve the best version of the package to include in the project
     */
    requirement: XcodeRemoteSwiftPackageRequirement;
}

/**
 * A semantic version, essentially 3 integers separated by periods (.). More information about semantic versioning and its version identifiers can be found at https://semver.org
 */
export declare type SPMSemanticVersion = `${number}.${number}.${number}`;

/**
 * A set of parameters the Swift Package Manager should use to determine the best version of a package to include in a project
 */
export declare type XcodeRemoteSwiftPackageRequirement = SPMUpToNextMajorVersionRequirement | SPMUpToNextMinorVersionRequirement | SPMVersionRangeRequirement | SPMExactVersionRequirement | SPMBranchRequirement | SPMExactRevisionRequirement;

/**
 * A package requirment that tells the Swift Package Manager to get the latest version of a package, without upgrading the major version. For example, if the requested version is 4.0.0, the latest version in the 4.x.x series is 4.5.6, and the latest version available is version 5.0.0, the package manager will fetch version 4.5.6
 */
export declare interface SPMUpToNextMajorVersionRequirement {
    /**
     * The strategy the Swift Package Manager should use for resolving the best version of the package to download
     */
    kind: "upToNextMajorVersion";
    /**
     * The oldest semantic version of the package that should be considered. Note that this may not be the version that actually gets installed if a newer version of the package is availalbe that doesn't increase the semantic versioning major version value
     */
    minimumVersion: SPMSemanticVersion;
}

/**
 * A package requirment that tells the Swift Package Manager to get the latest version of a package, without upgrading the minor version. For example, if the requested version is 4.0.0, the latest version in the 4.0.x series is 4.0.2, the latest version in the 4.x.x series is 4.5.6, and the latest version available is version 5.0.0, the package manager will fetch version 4.0.2
 */
export declare interface SPMUpToNextMinorVersionRequirement {
    /**
     * The strategy the Swift Package Manager should use for resolving the best version of the package to download
     */
    kind: "upToNextMinorVersion";
    /**
     * The oldest semantic version of the package that should be considered. Note that this may not be the version that actually gets installed if a newer version of the package is availalbe that doesn't increase the semantic versioning major or minor version values
     */
    minimumVersion: SPMSemanticVersion;
}

/**
 * A package requirement that tells the Swift Package Manager to get the latest version of a package in a specific range, excluding the newest version of the range
 */
export declare interface SPMVersionRangeRequirement {
    /**
     * The strategy the Swift Package Manager should use for resolving the best version of the package to download
     */
    kind: "versionRange";
    /**
     * The oldest semantic version of the package that should be considered
     */
    minimumVersion: SPMSemanticVersion;
    /**
     * The newest semantic version of the package that should be considered. Note that SPM will never actually install this version. For example, if the `maximumVersion` is 6.0.0, the latest version in the 5.x.x series is the version that will actually be installed
     */
     maximumVersion: SPMSemanticVersion;
}

/**
 * A package requirement that tells the Swift Package Manager to get a specific version of a package
 */
export declare interface SPMExactVersionRequirement {
    /**
     * The strategy the Swift Package Manager should use for resolving the best version of the package to download
     */
    kind: "exactVersion";
    /**
     * The specific semantic version of the package that the Swift Package Manager should fetch
     */
    version: SPMSemanticVersion;
}

/**
 * A package requirement that tells the Swift Package Manager to get the latest commit on a specific branch of a package's source repository
 */
export declare interface SPMBranchRequirement {
    /**
     * The strategy the Swift Package Manager should use for resolving the best version of the package to download
     */
    kind: "branch";
    /**
     * The name of the branch in the package's source repository that the Swift Package Manager should track
     */
    branch: string;
}

/**
 * A package requirement that tells the Swift Package Manager to get a specific commit from a package's source repository
 */
export declare interface SPMExactRevisionRequirement {
    /**
     * The strategy the Swift Package Manager should use for resolving the best version of the package to download
     */
    kind: "revision";
    /**
     * The commit hash that the Swift Package Manager should fetch from the package's source repository
     */
    revision: string;
}