sap.ui.define([
  "sap/base/Log",
  "sap/base/security/encodeXML",
  "sap/m/MessageBox",
  "sap/m/MessageStrip",
  "sap/ui/core/HTML",
  "com/jhah/zhrjhahseclp/controller/BaseController",
  "com/jhah/zhrjhahseclp/model/sections",
  "com/jhah/zhrjhahseclp/service/AuthService",
  "com/jhah/zhrjhahseclp/service/IdCardService",
  "com/jhah/zhrjhahseclp/service/StickerService",
  "com/jhah/zhrjhahseclp/service/ViolationService",
  "com/jhah/zhrjhahseclp/service/VisitorService",
  "com/jhah/zhrjhahseclp/util/shellUrl"
], (
  Log,
  encodeXML,
  MessageBox,
  MessageStrip,
  HTML,
  BaseController,
  sections,
  AuthService,
  IdCardService,
  StickerService,
  ViolationService,
  VisitorService,
  shellUrl
) => {
  "use strict";

  const LOG_COMPONENT = "com.jhah.zhrjhahseclp.controller.Main";
  const ViewMode = sections.ViewMode;

  /** Text key per visitor category, in the order the chart shows them. */
  const VISITOR_CATEGORY_TEXTS = {
    business: "visitorCategoryBusiness",
    tempStaff: "visitorCategoryTempStaff",
    tempJob: "visitorCategoryTempJob",
    project: "visitorCategoryProject",
    security: "visitorCategorySecurity",
  };

  /**
   * Business Visitor Access shows the user's own figures in both of its
   * views; the organization-wide figures are not requested yet. Carried over
   * unchanged from the previous implementation.
   */
  const VISITOR_KPI_ADMIN_SCOPE = false;

  /**
   * Intent parameters passed to every embedded application. `admin` has
   * always been sent as true, whatever the user's role or the view shown on
   * the dashboard.
   */
  const EMBED_PARAMS = { admin: true };

  return BaseController.extend("com.jhah.zhrjhahseclp.controller.Main", {
    onInit() {
      // Section fragments already placed in their slot, as promises keyed by
      // section and view mode.
      this._mSectionFragments = new Map();
      // Identifies the latest request to embed an application.
      this._iEmbedToken = 0;

      this._initDashboard();
    },

    /* =========================================================== */
    /* event handlers                                              */
    /* =========================================================== */

    /**
     * Side navigation: shows the dashboard, or the selected application in
     * its place.
     *
     * @param {sap.ui.base.Event} oEvent selectionChange of the navigation list
     */
    onNavItemSelect(oEvent) {
      const sKey = oEvent.getParameter("listItem").data("navKey");

      this._selectNavItem(sKey);
      if (sKey === sections.DASHBOARD_KEY) {
        this._showDashboard();
      } else {
        this._embedApp(sKey);
      }
    },

    /**
     * Admin / Employee toggle of a dashboard section. The section key is
     * passed from the XML view, e.g.
     * selectionChange=".onViewModeChange($event, 'idCard')".
     *
     * @param {sap.ui.base.Event} oEvent selectionChange of the toggle
     * @param {string} sKey Section key
     */
    onViewModeChange(oEvent, sKey) {
      this._showSection(sKey, oEvent.getParameter("item").getKey());
    },

    /**
     * Opens the Sticker Master application on the object page of the pressed
     * request.
     *
     * @param {sap.ui.base.Event} oEvent press of the request link
     */
    onStickerRequestPress(oEvent) {
      const oContext = oEvent.getSource().getBindingContext("dashboard");

      this._selectNavItem("sticker");
      this._embedApp("sticker", oContext.getProperty("objectPagePath"));
    },

    /* =========================================================== */
    /* dashboard setup                                             */
    /* =========================================================== */

    /**
     * Reads the user's authorizations and opens every section they may see
     * in the view matching their role.
     */
    async _initDashboard() {
      const oAuthInfoModel = this.getModel("authInfo");
      let oAuthorization;

      try {
        oAuthorization = await AuthService.readAuthorization(oAuthInfoModel);
      } catch (oError) {
        Log.error("Failed to read the user's authorizations", oError, LOG_COMPONENT);
        const oBundle = await this.getResourceBundle();
        MessageBox.error(oBundle.getText("authorizationError"));
        return;
      }

      this._sUserId = oAuthorization.userId;
      // Kept as a promise: sections that need the personnel number wait for it.
      this._pUserProfile = this._applyResult(
        "/user",
        AuthService.readUserProfile(oAuthInfoModel, this._sUserId)
      );

      const oDashboardModel = this.getModel("dashboard");
      sections.getAll().forEach((oSection) => {
        const sRole = oAuthorization.roles[oSection.key];
        const sViewMode = sections.getInitialViewMode(sRole);

        if (sViewMode) {
          oDashboardModel.setProperty(
            `/sections/${oSection.key}/isAdmin`,
            sRole === sections.Role.ADMIN
          );
          this._showSection(oSection.key, sViewMode);
        }
      });
    },

    /* =========================================================== */
    /* sections                                                    */
    /* =========================================================== */

    /**
     * Switches a single dashboard section to the given view and refreshes
     * its data. Other sections are not touched.
     *
     * @param {string} sKey Section key
     * @param {string} sViewMode View to show
     * @returns {Promise} Resolves once the section is on screen with its data
     */
    _showSection(sKey, sViewMode) {
      this.getModel("dashboard").setProperty(`/sections/${sKey}/viewMode`, sViewMode);

      return Promise.all([
        this._loadSectionFragment(sKey, sViewMode),
        this._loadSectionData(sKey, sViewMode),
      ]).catch((oError) => {
        Log.error(`Failed to show section ${sKey} (${sViewMode})`, oError, LOG_COMPONENT);
      });
    },

    /**
     * Loads a section fragment into its slot once and reuses it afterwards.
     * Each view of a section has its own slot in Main.view.xml, shown
     * according to the section's view mode. The promise is cached, so
     * repeated or rapid toggles never create the same controls twice.
     *
     * @param {string} sKey Section key
     * @param {string} sViewMode View the fragment belongs to
     * @returns {Promise} Resolves once the fragment is in its slot
     */
    _loadSectionFragment(sKey, sViewMode) {
      const sCacheKey = `${sKey}/${sViewMode}`;

      if (!this._mSectionFragments.has(sCacheKey)) {
        // e.g. "stickerAdmin", placed in the slot "stickerAdminSlot"
        const sFragmentId = sKey + sViewMode.charAt(0).toUpperCase() + sViewMode.slice(1);

        const pFragment = this.loadFragment({
          id: sFragmentId,
          name: sections.get(sKey).fragments[sViewMode],
          addToDependents: false,
        })
          .then((oContent) => {
            this.byId(sFragmentId + "Slot").addItem(oContent);
          })
          .catch((oError) => {
            // Let the next toggle retry instead of replaying the failure.
            this._mSectionFragments.delete(sCacheKey);
            throw oError;
          });

        this._mSectionFragments.set(sCacheKey, pFragment);
      }

      return this._mSectionFragments.get(sCacheKey);
    },

    /**
     * @param {string} sKey Section key
     * @param {string} sViewMode View to load the data for
     * @returns {Promise} Resolves once the section's reads have settled
     */
    _loadSectionData(sKey, sViewMode) {
      switch (sKey) {
        case "visitor":
          return this._loadVisitorData();
        case "violations":
          return this._loadViolationsData(sViewMode);
        case "sticker":
          return this._loadStickerData(sViewMode);
        case "idCard":
          return this._loadIdCardData(sViewMode);
        default:
          return Promise.resolve();
      }
    },

    _loadVisitorData() {
      const pVisitor = Promise.all([
        VisitorService.readLandingKpis(this.getModel(), VISITOR_KPI_ADMIN_SCOPE),
        this.getResourceBundle(),
      ]).then(
        ([oKpis, oBundle]) =>
          oKpis && {
            kpi: oKpis.kpi,
            chart: Object.keys(VISITOR_CATEGORY_TEXTS).map((sCategory) => ({
              category: oBundle.getText(VISITOR_CATEGORY_TEXTS[sCategory]),
              count: oKpis.categories[sCategory],
            })),
          }
      );

      return this._applyResult("/visitor", pVisitor);
    },

    _loadViolationsData(sViewMode) {
      const oModel = this.getModel("tvs");

      if (sViewMode === ViewMode.ADMIN) {
        return this._applyResult(
          "/violations/admin",
          ViolationService.readAdminKpis(oModel)
        );
      }

      const pUser = this._pUserProfile.then((oProfile) => ({
        personnelNumber: oProfile && oProfile.id,
        loginId: this._sUserId,
      }));
      return this._applyResult(
        "/violations/employee/kpi",
        ViolationService.readEmployeeKpis(oModel, pUser)
      );
    },

    _loadStickerData(sViewMode) {
      const oModel = this.getModel("sticker");

      return Promise.all([
        // The KPIs of each view have their own node, named like the view mode.
        this._applyResult(
          `/sticker/${sViewMode}`,
          StickerService.readKpis(oModel, sViewMode === ViewMode.ADMIN)
        ),
        this._applyResult("/sticker/own", StickerService.readOwnStickers(oModel)),
      ]);
    },

    _loadIdCardData(sViewMode) {
      const oModel = this.getModel("idmgmt");

      if (sViewMode === ViewMode.ADMIN) {
        return Promise.all([
          this._applyResult("/idCard/admin/kpi", IdCardService.readAdminKpi(oModel)),
          this._applyResult(
            "/idCard/admin/requests",
            IdCardService.readPendingRequests(oModel)
          ),
        ]);
      }

      return Promise.all([
        this._applyResult(
          "/idCard/employee/active",
          IdCardService.readActiveCard(oModel)
        ),
        this._applyResult(
          "/idCard/employee/requests",
          IdCardService.readPendingRequests(oModel, this._sUserId)
        ),
      ]);
    },

    /**
     * Writes the outcome of a read to the dashboard model. A read that fails
     * or finds nothing is not an error for the dashboard: the node keeps its
     * "no data" state and the failure is logged.
     *
     * @param {string} sPath Path of the node in the dashboard model
     * @param {Promise<any>} pResult The pending read
     * @returns {Promise<any>} Resolves with the data read; undefined if there is none
     */
    _applyResult(sPath, pResult) {
      return pResult
        .then((vData) => {
          if (vData !== undefined) {
            this.getModel("dashboard").setProperty(sPath, vData);
          }
          return vData;
        })
        .catch((oError) => {
          Log.error(`Failed to load ${sPath}`, oError, LOG_COMPONENT);
        });
    },

    /* =========================================================== */
    /* navigation and embedded applications                        */
    /* =========================================================== */

    _selectNavItem(sKey) {
      this.getModel("dashboard").setProperty("/selectedNavKey", sKey);
    },

    /**
     * Returns from an embedded application to the dashboard. The sections
     * were only hidden, so they come back with their current view and data.
     */
    _showDashboard() {
      // Invalidate any embed still resolving its launchpad URL.
      this._iEmbedToken++;

      this._setEmbedMode(false);
      this.byId("dashboardContent").setBusy(false);
      this.byId("embeddedApp").destroyItems();
    },

    /**
     * Opens the application behind a section in an iframe filling the
     * dashboard content area.
     *
     * The iframe points at the launchpad shell with the target intent in the
     * hash, the same URL the shell itself would navigate to. Do not point it
     * at the resolved app URL: Work Zone resolves these ABAP-hosted apps to
     * /sap/bc/ui2/flp/ui5appruntime.html, an app container that proxies
     * ushell services to its parent over postMessage and waits for that
     * handshake before rendering. Nested here nothing answers it, so the app
     * would boot, fire its OData calls and then stay busy forever.
     *
     * @param {string} sKey Section key
     * @param {string} [sInnerRoute] Route inside the application
     */
    async _embedApp(sKey, sInnerRoute) {
      const oSection = sections.get(sKey);
      const oContainer = this.byId("dashboardContent");
      const oEmbeddedApp = this.byId("embeddedApp");
      const iToken = ++this._iEmbedToken;

      this._setEmbedMode(true);
      oEmbeddedApp.destroyItems();
      oContainer.setBusy(true);

      const oBundle = await this.getResourceBundle();
      const sTitle = oBundle.getText(oSection.titleKey);
      let sUrl;
      let oEmbedError;

      try {
        sUrl = shellUrl.buildIntentUrl(await shellUrl.resolveShellBaseUrl(), {
          ...oSection.intent,
          params: EMBED_PARAMS,
          innerRoute: sInnerRoute,
        });
      } catch (oError) {
        oEmbedError = oError;
      }

      // The user may have moved on while the launchpad URL was being resolved.
      if (iToken !== this._iEmbedToken) {
        return;
      }

      oContainer.setBusy(false);
      if (oEmbedError) {
        Log.error(`Failed to embed ${sKey}`, oEmbedError, LOG_COMPONENT);
        oEmbeddedApp.addItem(
          new MessageStrip({
            type: "Error",
            showIcon: true,
            text: oBundle.getText("embedError", [sTitle, oEmbedError.message]),
          }).addStyleClass("sapUiMediumMargin")
        );
        return;
      }

      Log.info("embedding " + sUrl, null, LOG_COMPONENT);
      oEmbeddedApp.addItem(
        new HTML({
          content: `<iframe class="jhahEmbedFrame" title="${encodeXML(sTitle)}" src="${encodeXML(encodeURI(sUrl))}"></iframe>`,
        })
      );
    },

    /**
     * @param {boolean} bEmbed Whether an application takes the place of the dashboard
     */
    _setEmbedMode(bEmbed) {
      this.getModel("dashboard").setProperty("/isEmbedFrame", bEmbed);
      this.byId("dashboardContent").toggleStyleClass("jhahDashboardContentEmbed", bEmbed);
    },
  });
});
