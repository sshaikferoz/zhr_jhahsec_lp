sap.ui.define([], () => {
  "use strict";

  const FRAGMENT_ROOT = "com.jhah.zhrjhahseclp.view.fragments.";

  /** Roles returned by the authorization service, one per application. */
  const Role = {
    ADMIN: "ADMIN",
    EMPLOYEE: "EMPLOYEE",
  };

  /** The two views of a dashboard section. */
  const ViewMode = {
    ADMIN: "admin",
    EMPLOYEE: "employee",
  };

  /** Key of the side navigation entry that shows the dashboard itself. */
  const DASHBOARD_KEY = "dashboard";

  /**
   * The applications shown on the dashboard, in side navigation order.
   *
   * `key` identifies the section everywhere: the side navigation entry, the
   * `/sections/<key>` and `/<key>` nodes of the dashboard model, and the
   * `<key>AdminSlot` / `<key>EmployeeSlot` containers in Main.view.xml.
   * `intent` is the launchpad intent of the application behind the section.
   */
  const SECTIONS = [
    {
      key: "visitor",
      titleKey: "visitorTitle",
      intent: { semanticObject: "BusiVisitorAccess", action: "manage" },
      fragments: {
        [ViewMode.ADMIN]: FRAGMENT_ROOT + "visitor.VisitorAccess",
        [ViewMode.EMPLOYEE]: FRAGMENT_ROOT + "visitor.VisitorAccess",
      },
    },
    {
      key: "violations",
      titleKey: "violationsTitle",
      intent: { semanticObject: "TrafficViolationSystem", action: "manage" },
      fragments: {
        [ViewMode.ADMIN]: FRAGMENT_ROOT + "violations.ViolationsAdmin",
        [ViewMode.EMPLOYEE]: FRAGMENT_ROOT + "violations.ViolationsEmployee",
      },
    },
    {
      key: "sticker",
      titleKey: "stickerNavTitle",
      intent: { semanticObject: "StickerMaster", action: "manage" },
      fragments: {
        [ViewMode.ADMIN]: FRAGMENT_ROOT + "sticker.StickerAdmin",
        [ViewMode.EMPLOYEE]: FRAGMENT_ROOT + "sticker.StickerEmployee",
      },
    },
    {
      key: "idCard",
      titleKey: "idCardTitle",
      intent: { semanticObject: "idmanagementsystem", action: "manage" },
      fragments: {
        [ViewMode.ADMIN]: FRAGMENT_ROOT + "idcard.IdCardAdmin",
        [ViewMode.EMPLOYEE]: FRAGMENT_ROOT + "idcard.IdCardEmployee",
      },
    },
  ];

  return {
    Role,
    ViewMode,
    DASHBOARD_KEY,

    /**
     * @returns {object[]} All section definitions
     */
    getAll() {
      return SECTIONS;
    },

    /**
     * @param {string} sKey Section key
     * @returns {object|undefined} The section definition
     */
    get(sKey) {
      return SECTIONS.find((oSection) => oSection.key === sKey);
    },

    /**
     * The view a section opens in for the given role: administrators start
     * in the admin view, employees in their own.
     *
     * @param {string} sRole Role of the user for the section's application
     * @returns {string|null} A view mode, or null if the role grants no access
     */
    getInitialViewMode(sRole) {
      if (sRole === Role.ADMIN) {
        return ViewMode.ADMIN;
      }
      return sRole === Role.EMPLOYEE ? ViewMode.EMPLOYEE : null;
    },
  };
});
