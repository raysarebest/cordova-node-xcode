import type { XcodeProjectObject, XcodeProjectObjectReference } from "./xcode";
import type { PBXFileReference } from "./xcfiletreeobject";
import type { PBXProjectInternal } from "./pbxproject";
import type { PBXTarget } from "./pbxtarget";

/**
 * Core information about a proxy object used for referencing an object (likely a target or the compiled product of a target) that is potentially in a different Xcode project than the current one
 */
export declare interface PBXBaseContainerItemProxy extends XcodeProjectObject {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXContainerItemProxy";
    /**
     * Information about the container of the object that's being proxied, ignored by Xcode when parsing
     */
    containerPortal_comment?: string;
    /**
     * Information about (usually the name of) the object being proxied
     */
    remoteInfo: string;
}

/**
 * A proxy object that references a target in either the current Xcode project or another Xcode project file that's referenced by the current one
 */
export declare interface PBXTargetContainerItemProxy extends PBXBaseContainerItemProxy {
    /**
     * An identifier that denotes the specific types of references that are represented by this proxy. Options are:
     * 
     * - `1`: A target in either the current Xcode project or a remote project 
     * - `2`: A file in an Xcode project other than the current one
     */
    proxyType: 1;
    /**
     * The object that contains the object being proxied. This is a reference to either the project metadata object in the current Xcode project file or the Xcode project file that contains a remote object being proxied. Concrete data can be accessed through the current project's either `PBXProject` or `PBXFileReference` object archive. If this is a reference to another Xcode project, the project file it references will need to be parsed to read the remote data. Note this likely points at the `.xcodeproj` directory in that case, and `project.pbxproj` will need to be appended to the `path` to parse it properly
     */
    containerPortal: XcodeProjectObjectReference<PBXProjectInternal | PBXFileReference>;
    /**
     * An identifier valid in the current project that specifies the target being proxied. Concrete data can be accessed through the current project's `PBXNativeTarget` object archive
     */
    remoteGlobalIDString: XcodeProjectObjectReference<PBXTarget>;
}

/**
 * A proxy object that references an object (likely the compiled product of a target) in an Xcode project other than the current one
 */
export declare interface PBXExternalFileContainerItemProxy extends PBXBaseContainerItemProxy {
    /**
     * An identifier that denotes the specific types of references that are represented by this proxy. Options are:
     * 
     * - `1`: A target in either the current Xcode project or a remote project 
     * - `2`: A file in an Xcode project other than the current one
     */
    proxyType: 2;
    /**
     * The object that contains the object being proxied. This is a reference to the Xcode project file that contains a remote object being proxied. Concrete data can be accessed through the current project's `PBXFileReference` object archive. The project file it references will need to be parsed to read the remote data. Note this likely points at the `.xcodeproj` directory in that case, and `project.pbxproj` will need to be appended to the `path` to parse it properly
     */
    containerPortal: XcodeProjectObjectReference<PBXFileReference>;
    /**
     * An identifier valid in the remote project that specifies the object being proxied, generally the compiled product of a target in the remote project. Concrete data can be accessed through the remote project's `PBXFileReference` object archive
     */
    remoteGlobalIDString: XcodeProjectObjectReference<PBXFileReference>;
}

/**
 * A proxy object used for referencing an object (likely a target or the compiled product of a target) that is potentially in a different Xcode project than the current one
 */
export declare type PBXContainerItemProxy = PBXTargetContainerItemProxy | PBXExternalFileContainerItemProxy;