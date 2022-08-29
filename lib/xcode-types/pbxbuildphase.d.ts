import type { XcodeCommentedValue, XcodeProjectObject, XcodeProjectObjectReference, XcodeCommentedObject } from "./xcode";
import type { PBXBuildFile } from "./pbxbuildfile";

/**
 * Basic information that describes a step required to transform input source to compiled/packaged output
 */
export declare interface PBXBaseBuildPhase extends XcodeProjectObject, XcodeCommentedObject {
    /**
     * A 32-bit integer describing a list of options as a bitmask. Exactly what each bit represents is unclear as Xcode generally defaults to 2147483647 (or 1111111111111111111111111111111 in binary, representing all options enabled), or 8 (1000 in binary) in some circumstances
     */
    buildActionMask: number;
    /**
     * Indicates if the phase should execute on any build, including debug builds (`0`), or if it should execute strictly on builds that produce a distribution archive (`1`)
     */
    runOnlyForDeploymentPostprocessing: 0 | 1;
    /**
     * A list of references to the files that are used by this build phase. Concrete data can be accessed through the project's `PBXBuildFile` object archive
     */
    files: XcodeCommentedValue<XcodeProjectObjectReference<PBXBuildFile>>[];
}

/**
 * A step in a build pipeline that copies specific files to a specific destination directory in the installable bundle that's output by the pipeline
 */
export declare interface PBXCopyFilesBuildPhase extends PBXBaseBuildPhase {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXCopyFilesBuildPhase";
    /**
     * The path to the destination folder that the `files` will be copied to, relative to a base path determined by the `dstSubfolderSpec`
     */
    dstPath: string;
    /**
     * An integer representing the method Xcode should use to generate the base path that the `dstPath` is relative to. The specific options are:
     * 
     * - `0`: `dstPath` must be absolute path, beginning with the root of the filesystem
     * - `16`: The products directory, which is the standard place where compiled products are output. This is equivalent to the `BUILT_PRODUCTS_DIR`, so it is guaranteed to be the same directory as the target's built product
     * - `1`: The wrapper directory, which is the root of the compiled bundle for the target
     * - `6`: The executables directory, which is the same directory as the compiled bundle's main executable binary
     * - `7`: The resources directory, which is a standard, but platform-specific directory where bundles can store their resources
     * - `15`: The Java resources directory, which is the directory that Java-based parts of the executable can find their resources. Equivalent to a subdirectory named `Java` in the bundle's normal resources directory
     * - `10`: The frameworks directory, which is the directory that the bundle stores any frameworks and/or libraries it embeds for internal use, which cannot be substituted with a newer version found elsewhere in the operating system. Equivalent to a subdirectory named `Frameworks` in the bundle's root directory
     * - `11`: The shared frameworks directory, which is the directory that the bundle stores any frameworks and/or libraries it embeds for internal use and potential use by other applications, which will be ignored and substituted with a newer version found elsewhere in the operating system if one is available. Equivalent to a subdirectory named `SharedFrameworks` in the bundle's root directory
     * - `12`: The shared support folder, which is the directory that the bundle stores any non-critical resource that is not a framework, library, or lodable bundle, which can be used by other applications. If a newer version of the resource is found elsewhere in the operating system, the newer version will be used, and the version in the bundle will be ignored. Equivalent to a subdirectory named `SharedSupport` in the bundle's root directory
     * - `13`: The plugins folder, which is the directory that the bundle stores any executables or loadable sub-bundles that a bundle uses, such as app extensions. Equivalent to a subdirectory named `Plugins` in the bundle's root directory
     * 
     * Other options are available in Xcode, but they set this to `16` and modify the `dstPath` directly to point to their special subfolders
     */
    dstSubfolderSpec: 0 | 16 | 1 | 6 | 7 | 15 | 10 | 11 | 12 | 13;
    /**
     * The name of the build phase displayed in Xcode's interface
     */
    name?: string;
}

/**
 * A step in a build pipeline that executes a shell script
 */
export declare interface PBXShellScriptBuildPhase extends PBXBaseBuildPhase {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXShellScriptBuildPhase";
    /**
     * The name of the build phase displayed in Xcode's interface
     */
    name?: string;
    /**
     * A list of absolute paths (allowing interpolation of build settings) to the files passed to this script as input
     */
    inputPaths: string[];
    /**
     * A list of absolute paths (allowing interpolation of build settings) to `.xcfilelist` files that enumerate the absolute paths (also allowing interpolation of build settings) to the files passed to this script as input. Introduced in Xcode 10
     */
    inputFileListPaths?: string[];
    /**
     * A list of absolute paths (allowing interpolation of build settings) to the files that this script generates
     */
    outputPaths: string[];
    /**
     * A list of absolute paths (allowing interpolation of build settings) to `.xcfilelist` files that enumerate the absolute paths (also allowing interpolation of build settings) to the files that this script generates. Introduced in Xcode 10
     */
    outputFileListPaths?: string[];
    /**
     * An absolute path to the shell that should execute the script
     */
    shellPath?: string;
    /**
     * The contents of the script to execute
     */
    shellScript: `"${string}"`;
    /**
     * Determines if the environment variables that are set when the script runs and their values should be dumped to the build log. `0` to not show the environment, or `1` to show them. If this property is missing, the environment will be shown by default
     */
    showEnvVarsInLog?: 0 | 1;
    /**
     * Determines if the script can be skipped during incremental builds if the script's context, inputs, and outputs all haven't changed since the previous build. `0` if the script can be skipped in such circumstances, or `1` to force the script to be run for every build. If this property is missing, the script will be skipped when appropriate by default
     */
    alwaysOutOfDate?: 0 | 1;
    /**
     * An absolute path (allowing interpolation of build settings) to a `make`-style dependency file that the build system uses to determine if the script can be skipped during incremental builds if its dependencies haven't changed
     */
    dependencyFile?: string;
}

/**
 * A step in a build pipeline that copies the public, private, and internal headers that the target uses into its compiled bundle
 */
export declare interface PBXHeadersBuildPhase extends PBXBaseBuildPhase {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXHeadersBuildPhase";
}

/**
 * A step in a build pipeline that copies files that are not libraries or executables that the executables produced by the target depend upon to run into the compiled bundle
 */
export declare interface PBXResourcesBuildPhase extends PBXBaseBuildPhase {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXResourcesBuildPhase";
}

/**
 * A step in a build pipeline that transforms source code into an executable binary
 */
export declare interface PBXSourcesBuildPhase extends PBXBaseBuildPhase {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXSourcesBuildPhase";
}

/**
 * A step in a build pipeline that links an executable compiled earlier in the pipeline with any libraries that it uses
 */
export declare interface PBXFrameworksBuildPhase extends PBXBaseBuildPhase {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXFrameworksBuildPhase";
}

/**
 * A step in a build pipeline that compiles Carbon resource definition files for legacy Mac OS systems
 */
export declare interface PBXRezBuildPhase extends PBXBaseBuildPhase {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXRezBuildPhase";
}

/**
 * A step in a build pipeline that transforms the source of a target into a compiled output bundle
 */
export declare type PBXBuildPhase = PBXCopyFilesBuildPhase | PBXShellScriptBuildPhase | PBXHeadersBuildPhase | PBXResourcesBuildPhase | PBXSourcesBuildPhase | PBXFrameworksBuildPhase | PBXRezBuildPhase;