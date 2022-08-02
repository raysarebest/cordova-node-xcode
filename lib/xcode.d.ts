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

/**
 * Information about an Xcode project and how it's compiled into binary content
 */
export interface PBXProjectInternal extends XcodeProjectObject {
    /**
     * The name of the type this object represents. Note that this type is internal to the Xcode project, and doesn't correspond to a JavaScript or TypeScript type
     */
    isa: "PBXProject";
    /**
     * The identifier of the project's build configuration list. Concrete data can be accessed through the project's `XCConfigurationList` object archive
     */
    buildConfigurationList: XcodeProjectObjectReference<XCConfigurationList>;
    /**
     * Information describing the project's build configuration list, ignored by Xcode when parsing
     */
    buildConfigurationList_comment?: string;
    /**
     * Human-readable text defining the minimum version of Xcode that the project supports
     */
     compatibilityVersion: string;
    /**
     * The locale that the project was developed in. This is usually an ISO 639-1 locale idenifier in modern projects, though it may also be a plain English name of a language in older projects
     */
    developmentRegion: string;
    /**
     * The list of locales that the project supports. This usually contains ISO 639-1 locale idenifiers in modern projects, though it may also contain a plain English names of languages in older projects, or the special keyword `Base`, which refers to the value of the `developmentRegion`. It will always include at least 1 entry, which is the `developmentRegion`, or the corresponding ISO 639-1 locale identifier if the `developmentRegion` is a plain English name
     */
    knownRegions: string[];
    /**
     * Indicates if Xcode has scanned the contents of the files in the project for their encoding information
     */
    hasScannedForEncodings: 0 | 1;
    /**
     * The identifier of the main group of the project. This is the root of Xcode's internal file tree for the project, displayed in its file tree (Project navigator) sidebar. Concrete data can be accessed through the project's `PBXGroup` object archive
     */
    mainGroup: XcodeProjectObjectReference<PBXGroup>;
    /**
     * The identifier of the group where the project's compiled outputs can be found. Concrete data can be accessed through the project's `PBXGroup` object archive
     */
    productRefGroup: XcodeProjectObjectReference<PBXGroup>;
    /**
     * Information describing the project's products group, ignored by Xcode when parsing
     */
    productRefGroup_comment?: string;
    /**
     * The root directory of all files related to this project, relative to the `.xcodeproj` (almost certainly the parent directory of this `.pbxproj` file). Empty by default, which specifies the directory that the `.xcodeproj` is in is the project root. Can contain special sequences like `..` and symlinks
     */
    projectDirPath: string;
    /**
     * The identifiers of the targets produced by this project. Concrete data for each target can be accessed through the project's `PBXNativeTarget` object archive
     */
    targets: XcodeCommentedValue<XcodeProjectObjectReference<PBXNativeTarget>>[];
    /**
     * The identifiers of remote Swift packages this project uses, managed by the Swift Package Manager. Concrete data for each target can be accessed through the project's `XCRemoteSwiftPackageReference` object archive
     */
    packageReferences?: XcodeCommentedValue<XcodeProjectObjectReference<XCRemoteSwiftPackageReference>>;
    /**
     * A list of project-specific properties about the project
     */
    attributes: PBXProjectAttributeList;
    /**
     * A list of references to sub-projects of this project
     */
    projectReferences?: PBXProjectReference[];
}

/**
 * A list of project-specific properties about an Xcode project
 */
export interface PBXProjectAttributeList {
    [key: string]: unknown;

    /**
     * The default text that every class in the project is suggested to begin with
     */
    CLASSPREFIX?: string;
    /**
     * The name of the organization that the project is maintained by
     */
    ORGANIZATIONNAME?: string
    /**
     * The last version of Xcode that prompted the user to upgrade the project's settings to the latest version. This is stored in the project file as a 4-digit integer that represents a specific Xcode version. For example `0420` refers to Xcode 4.2, which this property would represent as the number 420
     */
    LastUpgradeCheck?: number;
    /**
     * The last version of Xcode that prompted the user to upgrade the version of Swift that the project uses. This is stored in the project file as a 4-digit integer that represents a specific Xcode version. For example `0420` refers to Xcode 4.2, which this property would represent as the number 420
     */
    LastSwiftUpdateCheck?: number;
    /**
     * Indicates if targets produced by this project should be compiled in parallel to each other if they don't depend on each other
     */
    BuildIndependentTargetsInParallel?: (0 | 1) | ("YES" | "NO");
    /**
     * Attributes specific to targets within the project
     */
    TargetAttributes?: XcodeTargetAttributeArchive;
}

/**
 * A map of identifiers for {@link PBXTarget} objects to attributes that configure them in the context of an Xcode project
 */
export interface XcodeTargetAttributeArchive {
    [key: XcodeProjectObjectReference<PBXTarget>]: XcodeTargetAttributeConfiguration | undefined;
}

/**
 * A group of configuration properties for a specific {@link PBXTarget} in the context of an Xcode project
 */
export interface XcodeTargetAttributeConfiguration {
    [key: string]: unknown;

    /**
     * Identifies the version of Xcode that was used to create the target. Has properties that amount to a semantic version identifier, such as `11.4` or `6.1.1`
     */
    CreatedOnToolsVersion: string;
    /**
     * The identifier of the target that includes the tests for this target
     */
    TestTargetID?: XcodeProjectObjectReference<PBXTarget>
    /**
     * The Apple-internal identifier of the development team that signs the target
     */
    DevelopmentTeam?: string;
    /**
     * Indicates if Xcode should attempt to manage the provisioning and codesigning of the target or if the target should rely on user-defined settings for provisioning and signing
     */
    ProvisioningStyle?: "Manual" | "Automatic";
}

/**
 * A reference to a sub-project of a {@link PBXProject}
 */
export interface PBXProjectReference {
    /**
     * The identifier of the group where the sub-project's compiled outputs can be found. Concrete data can be accessed through the parent project's `PBXGroup` object archive
     */
    ProductGroup: XcodeProjectObjectReference<PBXGroup>;
    /**
     * The project-internal identifier of the file where the sub-project's configuration file. Concrete data can be accessed through the parent project's `PBXFileReference` object archive
     */
    ProjectRef: XcodeProjectObjectReference<PBXFileReference>;
}

/**
 * Information about an Xcode project and how it's compiled into binary content, using a single root directory for its contents
 */
export interface PBXSingleRootProject extends PBXProjectInternal {
    /**
     * Seemingly unused by modern Xcode, but used for source control features of very old versions. Otherwise equivalent to `projectDirPath`, which you probably wanna use instead in most contexts
     */
    projectRoot: string;
}

/**
 * Information about an Xcode project and how it's compiled into binary content, using multiple root directories for its contents
 */
export interface PBXMultipleRootProject extends PBXProjectInternal {
    /**
     * Seemingly unused by modern Xcode, but used for source control features of very old versions. Otherwise a multiple-path equivalent to `projectDirPath`, which you probably wanna use instead in most contexts
     */
    projectRoots: string[];
}