/**
 * src/constants/design-metrics.js
 * Centralized Design Metrics & Token Catalog.
 * Bridges CSS variables from style_config.css to JavaScript components for dynamic styles and inline calculations.
 */

export const SPACING = {
  none: '0px',
  xxs: '2px',
  xs: '4px',
  s: '8px',
  m: '12px',
  l: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
  huge: '48px',
};

export const COMPONENT_METRICS = {
  // Navigation & Shell
  headerHeight: '52px',
  tabHeight: '34px',
  tabPadding: '4px 14px',

  // Stats & Dashboard
  statCardMinHeight: '48px',
  statCardBorderRadius: '10px',
  statIconBoxSize: '28px',
  statIconSize: '15px',

  // Search & Filters
  searchBarHeight: '34px',
  filterBtnHeight: '32px',
  filterSheetWidthDesktop: '50vw',
  filterSheetMinWidth: '540px',
  filterSheetMaxWidth: '780px',
  omnisearchWidthDesktop: '1040px',
  omnisearchWidthTablet: '94vw',
  omnisearchMinHeight: '620px',
  omnisearchMaxHeight: '90vh',
  omnisearchHeaderHeight: '56px',
  omnisearchRadius: '20px',
  omnisearchItemHeight: '56px',

  // Buttons
  btnHeightSm: '28px',
  btnHeightMd: '32px',
  btnHeightLg: '38px',
  btnRadius: '9999px',
  actionBtnHeight: '28px',
  actionBtnCorner: '8px',

  // Floating Action Button
  fabHeight: '40px',
  fabMinWidth: '40px',
  fabRadius: '12px',

  // Avatars
  avatarXs: '24px',
  avatarSm: '28px',
  avatarMd: '34px',
  avatarLg: '52px',

  // Cards & Modals
  cardPadding: '12px 14px',
  cardRadius: '12px',
  modalRadius: '16px',
};

export const SHAPE_CORNERS = {
  none: '0px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
};

export const Z_INDEX = {
  deep: -1,
  base: 0,
  card: 1,
  header: 100,
  navigationRail: 110,
  stickyTableHead: 150,
  dropdown: 200,
  drawer: 300,
  modalBackdrop: 400,
  modal: 500,
  toast: 600,
  sessionLockOverlay: 9999,
};

export default {
  SPACING,
  COMPONENT_METRICS,
  SHAPE_CORNERS,
  Z_INDEX,
};
