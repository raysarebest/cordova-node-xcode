import type { PBXProjectInternal } from "./pbxproject";
import type { XCRemoteSwiftPackageReference } from "./xcremoteswiftpackagereference";
import type { XCSwiftPackageProductDependency } from "./xcswiftpackageproductdependency";
import type { XCConfigurationList } from "./xcconfigurationlist";
import type { PBXBuildFile } from "./pbxbuildfile";

/**
 * The root object of an Xcode project, containing metadata about the project, and a reference to the project's data
 */
interface XcodeProjectDescriptor {
    /**
     * The Xcode project information
     */
    project: XcodeProject;
    /**
     * Leading metadata info about the project file. Generally just specifies the project file's character encoding
     */
    headComment?: string;
}

/**
 * Information contained in an Xcode project file
 */
interface XcodeProject {
    /**
     * The format version that the project uses. This has been `1` for every version of Xcode to date (current latest is Xcode 16.0 beta 4)
     */
    archiveVersion: 1;
    /**
     * Seemingly unused, but present in all Xcode projects. Purpose unclear
     */
    classes: {};
    /**
     * An integer specifying the Xcode project format version. Each integer is effectively a value in an enumeration specifying the minimum version of Xcode that can open the project
     */
    objectVersion: number;
    /**
     * Information about all the archives in the Xcode project file
     */
    objects: XcodeObjectArchiveList;
    /**
     * A reference to the root object of the project, a PBXProject instance
     */
    rootObject: XcodeProjectObjectReference<PBXProjectInternal>;
    /**
     * Information describing the root object, ignored by Xcode when parsing
     */
    rootObject_comment?: string;
}

/**
 * A comment that describes the purpose of the base key and value it corresponds to
 */
type XcodeProjectObjectComment = `${string}_comment`;

/**
 * A reference to an object in an Xcode project. This is a 96-bit identifier represented by a 24-character uppercase hexadecimal string, and must be unique across the entire project file
 * 
 * @template ObjectType The type of object the reference points to
 */
 export type XcodeProjectObjectReference<ObjectType extends XcodeProjectObject> = string;

/**
 * A list of all objects of a particular Xcode project object type, keyed by identifier
 * 
 * @template ObjectType The type of Xcode project object that is contained within this list
 */
export interface XcodeObjectArchive<ObjectType extends XcodeProjectObject> {
    [key: XcodeProjectObjectReference<ObjectType> | XcodeProjectObjectComment]: (typeof key extends XcodeProjectObjectComment ? string : ObjectType) | undefined;
}

/**
 * A comprehensive list of all objects in an Xcode project file, keyed by object type
 */
interface XcodeObjectArchiveList {
    /**
     * The list of objects included in the project file that describe how to emit distinct binary outputs
     */
    PBXProject: XcodeObjectArchive<PBXProjectInternal>;
    /**
     * The list of objects included in the project file that enumerate the sets of settings used to build a target or project. Note that unless manually changed, a project and the primary target of the same name will both have an entry in this list by default
     */
    XCConfigurationList: XcodeObjectArchive<XCConfigurationList>;
    /**
     * The list of objects included in the project file that describe a file that's either compiled or copied into a target in a build phase. If a file is operated upon more than once in the build pipeline (for example, if it's both compiled into the executable and copied into the asset library), it will have multiple, independent entries in this section
     */
    PBXBuildFile: XcodeObjectArchive<PBXBuildFile>;
    /**
     * The list of objects included in the project file that describe a remote (not local) Swift Package that should be included in the project by the Swift Package Manager. This won't be present if no project or target depends on any Swift packages via the Swift Package Manager
     */
    XCRemoteSwiftPackageReference?: XcodeObjectArchive<XCRemoteSwiftPackageReference>;
    /**
     * The list of objects included in the project file that describe modules produced by a remote (not local) Swift Package that should be compiled for use by other targets in the Xcode project. This won't be present if no project or target depends on any Swift packages via the Swift Package Manager
     */
    XCSwiftPackageProductDependency?: XcodeObjectArchive<XCSwiftPackageProductDependency>;
}

/**
 * A group of related information about an object in an Xcode project
 */
export interface XcodeProjectObject {
    /**
     * The name of the type this object represents
     */
    readonly isa: string;
}

/**
 * A value in an Xcode project file that has a corresponding comment describing its purpose
 * 
 * @template ValueType The type of data that is represented in the `value` property and described by the `comment`
 */
export interface XcodeCommentedValue<ValueType> {
    /**
     * The data for the value
     */
    value: ValueType
    /**
     * Information describing the value and/or its purpose
     */
    comment: string;
}