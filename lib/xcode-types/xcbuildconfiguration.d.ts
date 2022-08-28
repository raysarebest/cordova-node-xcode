import type { XcodeProjectObject, XcodeProjectObjectReference } from "./xcode";
import type { XcodeKnownBuildSettings } from "./knownbuildsettings";
import type { PBXFileReference } from "./xcfilesystemobject";

/**
 * A group of specific settings that describe how to build a target
 */
export declare interface XCBuildConfiguration extends XcodeProjectObject {
    /**
     * The name of the type this object represents
     */
     readonly isa: "XCBuildConfiguration";
    /**
     * A reference to the `.xcconfig` file that defines all the settins that this configuration inherits from. Any settings defined in this configuration will take precedence over the same setting defined in the parent configuration
     */
    baseConfigurationReference: XcodeProjectObjectReference<PBXFileReference>;
    /**
     * Information describing the parent configuration reference, ignored by Xcode when parsing
     */
    baseConfigurationReference_comment?: string;
    /**
     * The name used to refer to this configuration
     */
    name: string;
}

/**
 * The basic format for a modifier to the effective situations of a build setting. 1-3 of these can be placed at the end of a setting key to change its value only in specific contexts, leaving the unmodified key's value to apply for all other contexts
 */
export declare type XcodeBuildSettingModifierDescriptor<Key extends string, Value extends string> = `[${Key}=${Value}]`;

/**
 * A valid SDK family that Xcode knows how to build targets against
 */
export declare type XcodePlatformSDK = "iphoneos" | "iphonesimulator" | "macosx" | "driverkit" | "watchos" | "watchsimulator" | "appletvos" | "appletvsimulator";
/**
 * A modifier that can be applied to a build setting to change the setting's value based on the SDK that Xcode is using when building a target
 */
export declare type XcodeSDKBuildSettingModifier = XcodeBuildSettingModifierDescriptor<"sdk", "*" | `${XcodePlatformSDK}${number | "*"}`>;

/**
 * A valid hardware architecture that Xcode knows how to build targets for
 */
export declare type XcodePlatformArchitecture = "armv6" | "armv7" | "armv7s" | "arm64" | "arm64e" | "arm*" | "x86_64" | "i386" | "ppc" | "ppc64";
/**
 * A modifier that can be applied to a build setting to change the setting's value based on the hardware architecture that the built target will be deployed to
 */
export declare type XcodeArchitechtureSettingModifier = XcodeBuildSettingModifierDescriptor<"arch", "*" | XcodePlatformArchitecture>;

/**
 * A modifier that can be applied to a build setting to change the setting's value based on the specific configuration group that's being used to build the target
 */
export declare type XcodeConfigurationSetingModifier = XcodeBuildSettingModifierDescriptor<"config", string>;

/**
 * A modifier to the effective situations of a build setting. 1-3 of these can be placed at the end of a setting key to change its value only in specific contexts, leaving the unmodified key's value to apply for all other contexts. If the same modifier key is specfied multiple times, the last one will take precedence. For example, for the setting `EXAMPLE_SETTING[arch=x86_64][arch=arm64]`, the setting's value will only apply for arm64 architectures
 */
export declare type XcodeBuildSettingModifier = XcodeSDKBuildSettingModifier | XcodeArchitechtureSettingModifier | XcodeConfigurationSetingModifier;

/**
 * Settings that will be applied to a target when building it. Specific settings can be overridden for specific SDKs, hardware architectures, and configurations by specifying each modifier between square brackets []. If the same modifier key is specfied multiple times, the last one will take precedence. For example, for the setting `EXAMPLE_SETTING[arch=x86_64][arch=arm64]`, the setting's value will only apply for arm64 architectures
 */
export declare type XcodeBuildSettings = XcodeKnownBuildSettings & {
    [Setting in keyof XcodeKnownBuildSettings as `"${Setting}${XcodeBuildSettingModifier}"`]?: XcodeKnownBuildSettings[Setting];
} & {
    [Setting in keyof XcodeKnownBuildSettings as `"${Setting}${XcodeBuildSettingModifier}${XcodeBuildSettingModifier}"`]?: XcodeKnownBuildSettings[Setting];
} & {
    [Setting in keyof XcodeKnownBuildSettings as `"${Setting}${XcodeBuildSettingModifier}${XcodeBuildSettingModifier}${XcodeBuildSettingModifier}"`]?: XcodeKnownBuildSettings[Setting];
} & {
    [key: string]: unknown | undefined;
};