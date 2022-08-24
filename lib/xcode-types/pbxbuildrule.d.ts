import type { XcodeProjectObject } from "./xcode";

/**
 * A method for transforming an input file that matches specific critera into one or more output files
 */
export interface PBXBuildRule extends XcodeProjectObject {
    /**
     * The name of the type this object represents
     */
    readonly isa: "PBXBuildRule";
    /**
     * The name of the build rule rendered in Xcode
     */
    name?: string;
    /**
     * The Xcode-internal identifier of the compiler that this build rule should invoke to process the file(s) it's given
     */
    compilerSpec: "com.apple.compilers.llvm.clang.1_0" | "com.apple.compilers.assetcatalog" | `"com.apple.build-tools.codesign"` | `"com.apple.build-tasks.compile-rc-project.xcplugin"` | `"com.apple.build-tasks.compile-scenekit-shadercache"` | `"com.apple.build-tasks.compile-skybox.xcplugin"` | `"com.apple.build-tasks.compile-usdz.xcplugin"` | `"com.apple.build-tasks.copy-png-file"` | `"com.apple.build-tasks.copy-plist-file"` | `"com.apple.build-tasks.copy-scenekit-assets"` | `"com.apple.build-tasks.copy-strings-file"` | `"com.apple.build-tasks.copy-tiff-file"` | "com.apple.compilers.model.coredatamapping" | "com.apple.compilers.coreml" | "com.apple.compilers.model.coredata" | "com.apple.compilers.gcc" | "com.apple.compilers.documentation" | "com.apple.compilers.dtrace" | `"com.apple.build-tasks.generate-texture-atlas.xcplugin"` | "com.apple.compilers.iconutil" | `"com.apple.compilers.instruments-package-builder"` | "com.apple.compilers.intents" | "com.apple.xcode.tools.ibtool.postprocessor" | "com.apple.xcode.tools.ibtool.storyboard.compiler" | "com.apple.xcode.tools.ibtool.storyboard.linker" | "com.apple.xcode.tools.ibtool.storyboard.postprocessor" | "com.apple.xcode.tools.ibtool.compiler" | "com.apple.compilers.iig" | "com.apple.compilers.lex" | `"com.apple.build-tasks.ls-register-url"` | "com.apple.compilers.metal" | "com.apple.compilers.mig" | "com.apple.compilers.nasm" | `"com.apple.build-tools.nmedit"` | "com.apple.compilers.opencl" | "com.apple.compilers.osacompile" | "com.apple.compilers.pbxcp" | "com.apple.compilers.scntool" | "com.apple.compilers.rez" | `"com.apple.build-tools.strip"` | "com.apple.xcode.tools.swift.compiler" | `"com.apple.build-tools.swift-abi-generation"` | `"com.apple.build-tools.swift-abi-checker"` | `"com.apple.build-tools.tapi.installapi"` | `"public.build-task.unifdef"` | "com.apple.compilers.yacc" | "com.apple.compilers.proxy.script";
    /**
     * A space-separated list of shell patterns that define the files this rule should run against. While this may be present, this will only have effect if `fileType` is `pattern.proxy`
     */
    filePatterns?: string;
    /**
     * The Xcode-internal identifier of the type of file this rule should run against
     */
    fileType: `"com.apple.instruments.package-definition"` | "compiled.air" | `"compiled.mach-o"` | `"compiled.mach-o.objfile"` | "file.intentdefinition" | "file.mlmodel" | "file.rcproject" | "file.skybox" | "file.storyboard" | "file.xib" | "folder.documentationcatalog" | "folder.mlpackage" | "sourcecode.asm" | "sourcecode.asm.asm" | "sourcecode.asm.llvm" | "sourcecode.c" | "sourcecode.clips" | "sourcecode.cpp" | "sourcecode.dtrace" | "sourcecode.dylan" | "sourcecode.fortran" | "sourcecode.glsl" | "sourcecode.iig" | "sourcecode.java" | "sourcecode.lex" | "sourcecode.metal" | "sourcecode.mig" | "sourcecode.nasm" | "sourcecode.opencl" | "sourcecode.pascal" | "sourcecode.protobuf" | "sourcecode.rez" | "sourcecode.swift" | "sourcecode.yacc" | "text.plist.strings" | "text.plist.stringsdict" | "text.plist.xcspec" | "text.xml.dae" | "wrapper.nib" | "wrapper.storyboardc" | "wrapper.xcclassmodel" | "wrapper.xcdatamodel" | "wrapper.xcdatamodeld" | "wrapper.xcmappingmodel" | "pattern.proxy";
    /**
     * An absolute path to the file that defines the dependencies for this rule, so that it may be skipped for incremental builds where none of its dependencies have changed. Build settings can be interpolated with the standarde `$()` syntax, and shell patterns are allowed. If this is not present, the rule will run for every build
     */
    dependencyFile?: string;
    /**
     * Absolute paths to the source files that this build rule transforms into output files. Build settings can be interpolated with the standarde `$()` syntax, and shell patterns are allowed
     */
    inputFiles: string[];
    /**
     * Absolute paths to the output files that this build rule generates. Build settings can be interpolated with the standarde `$()` syntax, and shell patterns are allowed
     */
    outputFiles: string[];
    /**
     * A list of space-separated flags to pass to the compiler when producing an output file. Each set of flags in this array will be applied only to the output file at the same index in the `outputFiles` array
     */
    outputFilesCompilerFlags?: string[];
    /**
     * Indicates if the rule can be edited by the user from Xcode. `1` allows user edits, but `0` makes the rule read-only to the user
     */
    isEditable: 0 | 1;
    /**
     * Indicates if the rule should be run for every processor architecture that the overall build process is generating a bundle for. `1` to repeatedly run the rule for every processor architecture, or `0` to run the rule once and use the single output for every architecture. If this property is not present, Xcode will default to the behavior as if it had been set to `1`
     */
    runOncePerArchitecture?: 0 | 1;
    /**
     * The source of the shell script that will execute to handle the processing of this build rule. While this may be present in other cases, this will only be honored if the `compilerSpec` is `com.apple.compilers.proxy.script`
     */
    script: string;
}