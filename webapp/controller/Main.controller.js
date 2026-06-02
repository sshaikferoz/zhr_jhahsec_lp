sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/core/HTML"
  ],
  function (Controller, Fragment, HTML) {
    "use strict";

    var SHELL_FRAGMENTS = {
      EMPLOYEE: "com.jhah.zhrjhahseclp.fragments.employee.EmployeeDashboardShell",
      COORDINATOR: "com.jhah.zhrjhahseclp.fragments.coordinator.CoordinatorDashboardShell",
      SECURITY: "com.jhah.zhrjhahseclp.fragments.security.SecurityDashboardShell",
      ADMIN: "com.jhah.zhrjhahseclp.fragments.coordinator.CoordinatorDashboardShell"
    };

    return Controller.extend("com.jhah.zhrjhahseclp.controller.Main", {
      onInit: function () {
        this._fetchEmployeeHeaderAndLoad();
      },

      _fetchEmployeeHeaderAndLoad: function () {
        var oODataModel = this.getOwnerComponent().getModel();
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

        if (!oODataModel) {
          this._loadDashboardForRole("COORDINATOR");
          return;
        }

        var oBinding = oODataModel.bindList("/EmployeeHeader");
        oBinding.requestContexts().then(function (aContexts) {
          var sRole = "COORDINATOR";
          var bAdmin = false;
          if (aContexts.length) {
            var oUser = aContexts[0].getObject();
            bAdmin = oUser.Admin === "X";
            sRole = bAdmin ? "SECURITY" : "COORDINATOR";

            var oPersona = this.getOwnerComponent()._getPersonaConfig(sRole);
            oDashboardModel.setProperty("/role", sRole);
            oDashboardModel.setProperty("/pageTitle", oPersona.pageTitle);
            oDashboardModel.setProperty("/navItems", oPersona.navItems);
            oDashboardModel.setProperty("/showVendorSection", true);
            oDashboardModel.setProperty("/user/name", oUser.UserName || oDashboardModel.getProperty("/user/name"));
            oDashboardModel.setProperty("/user/role", oPersona.roleLabel);
            oDashboardModel.setProperty("/user/department", oUser.OrganizationText || oDashboardModel.getProperty("/user/department"));
            oDashboardModel.setProperty("/user/id", oUser.Pernr || oDashboardModel.getProperty("/user/id"));
          }
          this._loadDashboardForRole(sRole);
          this._fetchLandingKpis(bAdmin);
        }.bind(this)).catch(function () {
          this._loadDashboardForRole("COORDINATOR");
          this._fetchLandingKpis(false);
        }.bind(this));
      },

      _loadDashboardForRole: function (sRole) {
        var sFragment = SHELL_FRAGMENTS[sRole] || SHELL_FRAGMENTS.COORDINATOR;
        this._loadShellFragment(sFragment);
      },

      onNavItemSelect: function (oEvent) {
        var sKey = oEvent.getParameter("item").getKey();
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        oDashboardModel.setProperty("/selectedNavKey", sKey);

        if (sKey === "vendor") {
          this._loadAppInFrame("BusiVisitorAccess", "manage");
        } else if (sKey === "dashboard") {
          var sRole = oDashboardModel.getProperty("/role");
          this._loadDashboardForRole(sRole);
        }
      },

      _loadAppInFrame: function (sSemanticObject, sAction) {
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        oDashboardModel.setProperty("/isEmbedFrame", true);
        this._setEmbedMode(true);

        var oContainer = this.byId("dashboardContent");
        oContainer.destroyItems();

        var sUrl;
        try {
          sUrl = sap.ushell.Container.getService("CrossApplicationNavigation")
            .hrefForExternal({ target: { semanticObject: sSemanticObject, action: sAction } });
        } catch (e) {
          // fallback for local development outside FLP
          sUrl = window.location.origin + "/sap/bc/ui2/flp#" + sSemanticObject + "-" + sAction;
        }

        var oHtml = new HTML({
          content: "<iframe src=\"" + sUrl + "\" style=\"width:100%;height:100%;min-height:calc(100vh - 3.5rem);border:none;display:block;\"></iframe>",
          sanitizeContent: false,
          preferDOM: true
        });

        oContainer.addItem(oHtml);
      },

      _loadShellFragment: function (sFragmentName) {
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        oDashboardModel.setProperty("/isEmbedFrame", false);
        this._setEmbedMode(false);

        var oContainer = this.byId("dashboardContent");
        oContainer.destroyItems();

        return Fragment.load({
          id: this.getView().getId(),
          name: sFragmentName,
          controller: this,
          type: "XML"
        }).then(
          function (oShell) {
            oContainer.addItem(oShell);
            this._configureVisitorChart();
          }.bind(this)
        );
      },

      _setEmbedMode: function (bEmbed) {
        var oContent = this.byId("dashboardContent");
        var oScroll = this.byId("mainScroll");
        if (oContent) {
          oContent.toggleStyleClass("jhahDashboardContentEmbed", bEmbed);
        }
        if (oScroll) {
          oScroll.toggleStyleClass("jhahMainScrollEmbed", bEmbed);
        }
      },

      _fetchLandingKpis: function (bAdmin) {
        var oODataModel = this.getOwnerComponent().getModel();
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oODataModel) {
          return;
        }
        var sPath = "/LandingPageKPI(" + (bAdmin ? "true" : "false") + ")/Set";
        var oBinding = oODataModel.bindList(sPath);
        oBinding.requestContexts().then(function (aContexts) {
          if (!aContexts.length) {
            return;
          }
          var oData = aContexts[0].getObject();

          oDashboardModel.setProperty("/vendorKpis/0/value", String(oData.TotalRequests));
          oDashboardModel.setProperty("/vendorKpis/1/value", String(oData.ApprovedRequests));
          oDashboardModel.setProperty("/vendorKpis/2/title", "In Progress");
          oDashboardModel.setProperty("/vendorKpis/2/value", String(oData.InProgressRequests));

          var iTotalVisitors = (oData.totalBusinessReqs || 0) + (oData.totalTempStaffReqs || 0) +
            (oData.totalTempJobReqs || 0) + (oData.totalProjectReqs || 0) + (oData.totalSecurityRequests || 0);
          oDashboardModel.setProperty("/visitorChart/centerLabel", iTotalVisitors + " TODAY");
          oDashboardModel.setProperty("/visitorChart/data", [
            { Category: "Business", Count: oData.totalBusinessReqs || 0 },
            { Category: "Temporary Staff Access", Count: oData.totalTempStaffReqs || 0 },
            { Category: "Temporary Job", Count: oData.totalTempJobReqs || 0 },
            { Category: "Project", Count: oData.totalProjectReqs || 0 },
            { Category: "Security", Count: oData.totalSecurityRequests || 0 }
          ]);
        }).catch(function () {
          // backend unreachable — static mock data remains in place
        });
      },

      _configureVisitorChart: function () {
        var oChart = this.byId("visitorCategoryChart");
        if (!oChart) {
          return;
        }
        oChart.setVizProperties({
          title: { visible: false },
          legend: {
            visible: true,
            position: "right",
            layout: { maxWidth: 0.35 }
          },
          plotArea: {
            dataLabel: {
              visible: true,
              type: "value"
            },
            colorPalette: ["#1d7db5", "#31a56e", "#d28c22", "#6d8fd7", "#9b59b6"]
          }
        });
      }
    });
  }
);
