/**
 * A value for a setting in a target's build configuration. This can be of the proper `ValueType`, or a string specifying how the setting's value should be inherited from other settings
 */
export declare type XcodeBuildSettingValue<Type> = Type | string;

/**
 * The value of a setting in a target's build configuration that can a string in the format of an Objective-C-style `BOOL` (`YES` or `NO`)
 */
export declare type XcodeBuildSettingBooleanValue = XcodeBuildSettingValue<"YES" | "NO">;

/**
 * The value of a setting in a target's build configuration that can contain any unstructured data
 */
export declare type XcodeBuildSettingStringValue = XcodeBuildSettingValue<string>;

/**
 * The value of a setting in a target's build configuration that can contain a space-separated list of individual strings. If a particular string in a list should itself contain a space, that string should be wrapped in double quotes (`"`)
 */
export declare type XcodeBuildSettingStringListValue = XcodeBuildSettingValue<XcodeBuildSettingStringValue>;

/**
 * The value of a setting in a target's build configuration that can contain a UNIX-style path
 */
export declare type XcodeBuildSettingPathValue = XcodeBuildSettingValue<string>;

/**
 * The value of a setting in a target's build configuration that can contain a space-separated list of individual UNIX-like paths. If a particular path in a list should itself contain a space, that path should be wrapped in double quotes (`"`)
 */
 export declare type XcodeBuildSettingPathListValue = XcodeBuildSettingValue<XcodeBuildSettingPathValue>;

/**
 * The value of a setting in a target's build configuration that can contain a space-separated list of individual hardware architectures that an OpenCL kernel can be compiled for
 */
export declare type XcodeBuildSettingOpenCLArchitecturesValue = XcodeBuildSettingStringListValue;

/**
 * The value of a setting in a target's build configuration that can contain the common name of a code signing certificate in a development Mac's keychain
 */
export declare type XcodeBuildSettingCodeSignIdentityValue = XcodeBuildSettingValue<string>;

/**
 * The value of a setting in a target's build configuration that can contain a string identifier of an Apple Developer team, generally found in the "Membership" section of Apple's developer account management website
 */
export declare type XcodeBuildSettingDevelopmentTeamValue = XcodeBuildSettingValue<string>;

/**
 * The value of a setting in a target's build configuration that can contain the name or UUID of a provisioning profile
 */
export declare type XcodeBuildSettingProvisioningProfileSpecifierValue = XcodeBuildSettingValue<string>;

/**
 * The value of a setting in a target's build configuration that can contain a semantic version or identifier for a specific edition of GCC or Clang
 */
export declare type XcodeBuildSettingCompilerVersionValue = XcodeBuildSettingValue<string>;

/**
 * The value of a setting in a target's build configuration that can contain the UUID of a provisioning profile. This is only used for a legacy setting for very old versions of iOS that shouldn't be used in modern projects
 */
export declare type XcodeBuildSettingProvisioningProfileValue = XcodeBuildSettingValue<string>;