import type { XcodeCommentedObject, XcodeProjectObject, XcodeProjectObjectReference } from "./xcode";
import type { Unquoted } from "./helpers";

/**
 * Core information about an object that Xcode tracks that most likely (but not necessarily) has a backing representation by an object in the operating system's filesystem, such as a file or directory
 */
export declare interface XcodeBaseFileTreeObject extends XcodeProjectObject, XcodeCommentedObject {
    /**
     * A UNIX path to the backing representation of this object in the computer's filesystem, or where it would be if it existed. The base path this path is relative to is defined by the `sourceTree`
     */
    path: string;
    /**
     * Determines if the object and any children should be indexed by the code completion system. `0` means the object shouldn't be indexed, `1` means it should. If this key isn't present, the object will be indexed
     */
    includeInIndex?: 0 | 1;
    /**
     * Indicates if the object and any children should use tabs instead of spaces as the indentation delimiter. `0` to use spaces, `1` to use tabs
     */
    usesTabs?: 0 | 1;
    /**
     * The integer number of columns that constitutes a single indentation level. Note that if this doesn't align with the `tabWidth`, Xcode will indent using spaces, even if `usesTabs` is `1`
     */
    indentWidth?: number;
    /**
     * The integer number of columns that a single tab character should consume when rendered
     */
    tabWidth?: number;
    /**
     * Indicates if Xcode should render the part of a line that exceeds the editor's width on another line below that isn't reflected in the saved document. `0` to have the editor scroll horizontally, `1` to render overflow on extra virtual lines
     */
    wrapsLines?: 0 | 1;
}

/**
 * An object that Xcode tracks internally using a method other than relative to its direct parent group (folder/directory) that most likely (but not necessarily) has a backing representation by an object in the operating system's filesystem, such as a file or directory
 */
export declare interface XcodeUngroupedFileTreeObject extends XcodeBaseFileTreeObject {
    /**
     * An Xcode-internal identifier that describes the base path that the `path` property should be interpreted relative to
     */
    sourceTree: `"<absolute>"` | "SOURCE_ROOT" | "DEVELOPER_DIR" | "BUILT_PRODUCTS_DIR" | "SDKROOT";
    /**
     * The name (and extension, if applicable) of this object in the computer's filesystem
     */
    name: string;
}

/**
 * An object that Xcode tracks internally relative to its direct parent group (folder/directory) that most likely (but not necessarily) has a backing representation by an object in the operating system's filesystem, such as a file or directory
 */
export declare interface XcodeGroupedFileTreeObject extends XcodeBaseFileTreeObject {
    /**
     * An Xcode-internal identifier that describes the base path that the `path` property should be interpreted relative to
     */
    sourceTree: `"<group>"`;
}

/**
     * An Xcode-internal identifier that describes the base path that a file path should be interpreted relative to. Possible values include:
     * 
     * - `"<absolute>"`: The `path` must be an absolute path from the root of the computer's filesystem
     * - `"<group>"`: The base path is interpreted to be the path to the group that immediately contains this object
     * - `SOURCE_ROOT`: The base path is interpreted to be the path to the folder that contains the `.xcodeproj` file (almost certainly the parent of the parent of the `project.pbxproj` file, equivalent to the "Relative to Project" option in the Xcode interface)
     * - `DEVELOPER_DIR`: The base path is interpreted to be the active developer directory internal to Xcode (generally `/path/to/Xcode.app/Contents/Developer`), where Xcode stores its internal tooling, usually managed by the `xcode-select` command line tool
     * - `BUILT_PRODUCTS_DIR`: The base path is interpreted to be the directory where all the products of the associated target's build process can be found
     * - `SDKROOT`: The base path is interpreted to be the directory where the SDK of the platform being built for is located
     */
export declare type XcodeSourceTreeBase = (XcodeGroupedFileTreeObject | XcodeUngroupedFileTreeObject)["sourceTree"];

/**
 * An object that Xcode tracks that most likely (but not necessarily) has a backing representation by an object in the operating system's filesystem, such as a file or directory, meant strictly for extension
 */
export declare type XcodeAbstractFileTreeObject = XcodeGroupedFileTreeObject | XcodeUngroupedFileTreeObject;

/**
 * Core information about a file in the operating system's filesystem that Xcode tracks for use in a project
 */
export declare type PBXBaseFileReference = XcodeAbstractFileTreeObject & {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXFileReference";
    /**
     * A code that indicates the text encoding that the file uses. If no option is specified, Xcode will figure out the correct option
     */
    fileEncoding?: XcodeFileEncoding;
    /**
     * A code that indicates the line ending format the file uses. Options are:
     * 
     * - `0`: macOS / Unix (LF)
     * - `1`: Classic Mac OS (CR)
     * - `2`: Windows (CRLF)
     * 
     * If no option is specified, Xcode will figure out the correct option
     */
    lineEnding?: 0 | 1 | 2;
    /**
     * Used by ancient versions of Xcode to identify the programming language that the contents of a file is formatted with. Seemingly unused by modern Xcode. If you want similar functionality today, you should probably use the `lastKnownFileType` or `explicitFileType` instead
     */
    languageSpecificationIdentifier?: string;
    /**
     * A UTI-like sequence used by old versions of Xcode to identify the programming language that the contents of a file is formatted with. Seemingly unused by modern Xcode, but previously formatted like `xcode.lang.swift` or `xcode.lang.ruby`. Successor to the `languageSpecificationIdentifier`. If you want similar functionality today, you should probably use the `lastKnownFileType` or `explicitFileType` instead
     */
    xcLanguageSpecificationIdentifier?: string;
    /**
     * A UTI-like sequence used by old versions of Xcode to identify the the well-known structure purpose of a property list file. For example, the `Info.plist` of an iPhone app might have the identifier `com.apple.xcode.plist.structure-definition.iphone.info-plist`. Seemingly unused by modern Xcode
     */
    plistStructureDefinitionIdentifier?: string;
};

/**
 * An identifier that represents a text encoding that a file might use. Options are:
 * 
 * - `4`: Unicode (UTF-8)
 * - `10`: Unicode (UTF-16)
 * - `2415919360`: Unicode (UTF-16 Big Endian)
 * - `2483028224`: Unicode (UTF-16 Little Endian)
 * - `30`: Western (Mac OS Roman)
 * - `2147483649`: Japanese (Mac OS)
 * - `2147483650`: Traditional Chinese (Mac OS)
 * - `2147483651`: Korean (Mac OS)
 * - `2147483652`: Arabic (Mac OS)
 * - `2147483653`: Hebrew (Mac OS)
 * - `2147483654`: Greek (Mac OS)
 * - `2147483655`: Cyrillic (Mac OS)
 * - `2147483673`: Simplified Chinese (Mac OS)
 * - `2147483677`: Central European (Mac OS)
 * - `2147483683`: Turkish (Mac OS)
 * - `2147483685`: Icelandic (Mac OS)
 * - `5`: Western (ISO Latin 1)
 * - `9`: Central European (ISO Latin 2)
 * - `2147484163`: Western (ISO Latin 3)
 * - `2147484164`: Central European (ISO Latin 4)
 * - `2147484165`: Cyrillic (ISO 8859-5)
 * - `2147484166`: Arabic (ISO 8859-6)
 * - `2147484167`: Greek (ISO 8859-7)
 * - `2147484168`: Hebrew (ISO 8859-8)
 * - `2147484169`: Turkish (ISO Latin 5)
 * - `2147484170`: Nordic (ISO Latin 6)
 * - `2147484171`: Thai (ISO 8859-11)
 * - `2147484173`: Baltic (ISO Latin 7)
 * - `2147484174`: Celtic (ISO Latin 8)
 * - `2147484175`: Western (ISO Latin 9)
 * - `2147484176`: Romanian (ISO Latin 10)
 * - `12`: Western (Windows Latin 1)
 * - `15`: Central European (Windows Latin 2)
 * - `11`: Cyrillic (Windows)
 * - `13`: Greek (Windows)
 * - `14`: Turkish (Windows Latin 5)
 * - `2147484933`: Hebrew (Windows)
 * - `2147484934`: Arabic (Windows)
 * - `2147484935`: Baltic (Windows)
 * - `2147484936`: Vietnamese (Windows)
 * - `2147484672`: Latin-US (DOS)
 * - `8`: Japanese (Windows, DOS)
 * - `2147484705`: Simplified Chinese (Windows, DOS)
 * - `2147484706`: Korean (Windows, DOS)
 * - `2147484707`: Traditional Chinese (Windows, DOS)
 * - `3`: Japanese (EUC)
 * - `2147486000`: Simplified Chinese (GB 2312)
 * - `2147486001`: Traditional Chinese (EUC)
 * - `2147486016`: Korean (EUC)
 * - `21`: Japanese (ISO 2022-JP)
 * - `2147486209`: Japanese (Shift JIS)
 * - `2`: Western (NextStep)
 * - `7`: Non-lossy ASCII
 */
export declare type XcodeFileEncoding = 4 | 10 | 2415919360 | 2483028224 | 30 | 2147483649 | 2147483650 | 2147483651 | 2147483652 | 2147483653 | 2147483654 | 2147483655 | 2147483673 | 2147483677 | 2147483683 | 2147483685 | 5 | 9 | 2147484163 | 2147484164 | 2147484165 | 2147484166 | 2147484167 | 2147484168 | 2147484169 | 2147484170 | 2147484171 | 2147484173 | 2147484174 | 2147484175 | 2147484176 | 12 | 15 | 11 | 13 | 14 | 2147484933 | 2147484934 | 2147484935 | 2147484936 | 2147484672 | 8 | 2147484705 | 2147484706 | 2147484707 | 3 | 2147486000 | 2147486001 | 2147486016 | 21 | 2147486209 | 2 | 7;

/**
 * An Xcode-internal identifier that represents the type of contents of a file and hasn't been manipulated by any external system
 */
export declare type XcodeRawFileType = "archive.ar" | "archive.asdictionary" | "archive.binhex" | "archive.ear" | "archive.gzip" | "archive.jar" | "archive.macbinary" | `"archive.metal-library"` | "archive.ppob" | "archive.rsrc" | "archive.stuffit" | "archive.tar" | "archive.war" | "archive.zip" | "audio.aiff" | "audio.au" | "audio.midi" | "audio.mp3" | "audio.wav" | "com.apple.instruments.instrdst" | `"com.apple.instruments.package-definition"` | "compiled" | "compiled.air" | "compiled.javaclass" | `"compiled.mach-o"` | `"compiled.mach-o.bundle"` | `"compiled.mach-o.corefile"` | `"compiled.mach-o.dylib"` | `"compiled.mach-o.fvmlib"` | `"compiled.mach-o.objfile"` | `"compiled.mach-o.preload"` | "compiled.rcx" | "file" | "file.bplist" | "file.intentdefinition" | "file.mlmodel" | "file.playground" | "file.rcproject" | "file.scp" | "file.sks" | "file.skybox" | "file.storyboard" | "file.uicatalog" | "file.usdz" | "file.xcplaygroundpage" | "file.xib" | "folder" | "folder.assetcatalog" | "folder.documentationcatalog" | "folder.iconset" | "folder.imagecatalog" | "folder.mlpackage" | "folder.skatlas" | "folder.stickers" | "image.bmp" | "image.gif" | "image.icns" | "image.ico" | "image.jpeg" | "image.pdf" | "image.pict" | "image.png" | "image.tiff" | "net.daringfireball.markdown" | "sourcecode.ada" | "sourcecode.applescript" | "sourcecode.asm" | "sourcecode.asm.asm" | "sourcecode.asm.llvm" | "sourcecode.c" | "sourcecode.c.c" | "sourcecode.c.c.preprocessed" | "sourcecode.c.h" | "sourcecode.c.objc" | "sourcecode.c.objc.preprocessed" | "sourcecode.clips" | "sourcecode.cpp" | "sourcecode.cpp.cpp" | "sourcecode.cpp.cpp.preprocessed" | "sourcecode.cpp.h" | "sourcecode.cpp.objcpp" | "sourcecode.cpp.objcpp.preprocessed" | "sourcecode.dtrace" | "sourcecode.dylan" | "sourcecode.exports" | "sourcecode.fortran" | "sourcecode.fortran.f77" | "sourcecode.fortran.f90" | "sourcecode.glsl" | "sourcecode.iig" | "sourcecode.jam" | "sourcecode.java" | "sourcecode.javascript" | "sourcecode.lex" | "sourcecode.make" | "sourcecode.metal" | "sourcecode.mig" | `"sourcecode.module-map"` | "sourcecode.nasm" | "sourcecode.nqc" | "sourcecode.opencl" | "sourcecode.pascal" | "sourcecode.protobuf" | "sourcecode.rez" | "sourcecode.swift" | `"sourcecode.text-based-dylib-definition"` | "sourcecode.yacc" | "text" | "text.apinotes" | "text.css" | "text.html" | "text.html.other" | "text.json" | "text.man" | "text.pbxproject" | "text.plist" | "text.plist.entitlements" | "text.plist.ibClassDescription" | "text.plist.info" | "text.plist.pbfilespec" | "text.plist.pblangspec" | "text.plist.scriptSuite" | "text.plist.scriptTerminology" | "text.plist.strings" | "text.plist.stringsdict" | "text.plist.xcbuildrules" | "text.plist.xclangspec" | "text.plist.xcspec" | "text.plist.xcsynspec" | "text.plist.xctxtmacro" | "text.plist.xml" | "text.rtf" | "text.script" | "text.script.csh" | "text.script.perl" | "text.script.php" | "text.script.python" | "text.script.ruby" | "text.script.sh" | "text.script.worksheet" | "text.xcconfig" | "text.xcfilelist" | "text.xml" | "text.xml.dae" | "text.xml.ibArchivingDescription" | "text.yaml" | "unknown" | "video.avi" | "video.mpeg" | `"video.quartz-composer"` | "video.quicktime" | "wrapper" | `"wrapper.app-extension"` | "wrapper.application" | "wrapper.cfbundle" | `"wrapper.driver-extension"` | "wrapper.dsym" | "wrapper.framework" | "wrapper.htmld" | `"wrapper.installer-mpkg"` | `"wrapper.installer-pkg"` | `"wrapper.kernel-extension"` | "wrapper.nib" | `"wrapper.pb-project"` | `"wrapper.pb-target"` | `"wrapper.plug-in"` | "wrapper.rtfd" | "wrapper.scnassets" | "wrapper.scncache" | `"wrapper.spotlight-importer"` | "wrapper.storyboardc" | `"wrapper.system-extension"` | "wrapper.workspace" | "wrapper.xcclassmodel" | "wrapper.xcdatamodel" | "wrapper.xcdatamodeld" | "wrapper.xcframework" | "wrapper.xcmappingmodel" | `"wrapper.xpc-service"`;

/**
 * An Xcode-internal identifier that represents the type of contents of a file
 */
export declare type XcodeFileType = XcodeRawFileType | Unquoted<XcodeRawFileType>;

/**
 * A file in the operating system's filesystem that Xcode tracks for use in a project, which Xcode has inferred the type of its contents
 */
export declare type PBXInferredFileReference = PBXBaseFileReference & {
    /**
     * An Xcode-internal identifier of the type of contents that Xcode believes the file contains
     */
    lastKnownFileType: XcodeFileType;
};

/**
 * A file in the operating system's filesystem that Xcode tracks for use in a project, which has had the type of its contents explicitly defined to Xcode by a human
 */
export declare type PBXExplicitFileReference = PBXBaseFileReference & {
    /**
     * An Xcode-internal identifier of the type of contents that has been specified to Xcode
     */
    explicitFileType: XcodeFileType;
};

/**
 * A file in the operating system's filesystem that Xcode tracks for use in a project
 */
export declare type PBXFileReference = PBXInferredFileReference | PBXExplicitFileReference;

/**
 * A collection of filesystem objects, akin (but not necessarily equal to) a folder/directory in the operating system's filesystem
 */
export declare type PBXGroup = XcodeAbstractFileTreeObject & {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXGroup";
    /**
     * References to the members of this group. Concrete data for each can be accessed through the archive corresponding to the `isa` property of the reference
     */
    children: XcodeProjectObjectReference<XcodeFileTreeObject>[];
};

/**
 * A collection of filesystem objects that represent the same resource that has been localized into one or more languages
 */
export declare type PBXVariantGroup = Omit<PBXGroup, "isa"> & {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXVariantGroup";
};

/**
 * A collection of filesystem objects that represent several different versions of the same resource
 */
export declare type XCVersionGroup = Omit<PBXGroup, "isa"> & {
    /**
     * The name of the type this object represents
     */
    readonly isa: "XCVersionGroup";
    /**
     * A reference to the current version of the resource. Concrete data can be accessed through the project's `PBXFileReference` object archive
     */
    currentVersion: XcodeProjectObjectReference<PBXFileReference>;
    /**
     * Information about the reference to the current version of the resource, ignored by Xcode when parsing
     */
    currentVersion_comment?: string;
    /**
     * The Xcode-internal identifier of the type of contents of the files managed by this version group. Currently only used for Core Data model defnition files, though theoretically could expand to any {@link XcodeFileType} in the future
     */
    versionGroupType: "wrapper.xcdatamodel";
};

/**
 * An object that Xcode tracks that has a backing representation by an object in the operating system's filesystem, such as a file or directory
 */
export declare type XcodeFileTreeObject = PBXFileReference | PBXGroup | PBXVariantGroup | XCVersionGroup;