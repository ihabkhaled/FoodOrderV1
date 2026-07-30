export {
  DEFAULT_DEVICE_CONFIG,
  type DeviceConfig,
  loadDeviceConfig,
  loadNotificationPromptSeen,
  loadSidebarCollapsed,
  nextTheme,
  saveDeviceConfig,
  saveNotificationPromptSeen,
  saveSidebarCollapsed,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  SUPPORTED_THEMES,
} from './device-config.adapter';
export { impact } from './haptics.adapter';
export type { NotificationPermissionState } from './notification-permission.adapter';
export {
  queryNotificationPermission,
  requestNotificationPermission,
} from './notification-permission.adapter';
export { initializePlatform } from './platform-init.adapter';
export {
  isNativeApplication,
  runtimePlatformName,
} from './runtime-platform.adapter';
export type { TrayNotificationRequest } from './tray-notification.adapter';
export {
  showTrayNotification,
  subscribeToTrayNotificationTaps,
} from './tray-notification.adapter';
