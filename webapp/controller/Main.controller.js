sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/core/HTML",
    "sap/ui/model/Sorter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  function (Controller, Fragment, HTML, Sorter, Filter, FilterOperator) {
    "use strict";

    var SHELL_FRAGMENTS = {
      EMPLOYEE:
        "com.jhah.zhrjhahseclp.fragments.employee.EmployeeDashboardShell",
      COORDINATOR:
        "com.jhah.zhrjhahseclp.fragments.coordinator.CoordinatorDashboardShell",
      SECURITY:
        "com.jhah.zhrjhahseclp.fragments.security.SecurityDashboardShell",
      ADMIN:
        "com.jhah.zhrjhahseclp.fragments.coordinator.CoordinatorDashboardShell",
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
        oBinding
          .requestContexts()
          .then(
            function (aContexts) {
              var sRole = "COORDINATOR";
              var bAdmin = false;
              var bStickerAdmin = false;
              if (aContexts.length) {
                var oUser = aContexts[0].getObject();
                bAdmin = oUser.Admin === "X";
                sRole = bAdmin ? "SECURITY" : "COORDINATOR";

                var oPersona =
                  this.getOwnerComponent()._getPersonaConfig(sRole);
                var bVarAuthorized = oUser.VARAuthorized === "X";
                bStickerAdmin = oUser.StickerAdmin === "X";
                var bTvsAuthorized =
                  oUser.TVSAuthorized === true || oUser.TVSAuthorized === "X";

                // Show "Business Visitor Access" (vendor) only when VARAuthorized is "X".
                // Show Sticker Management for Admins or Sticker Admins.
                // Show TVS (violations) only when TVSAuthorized.
                // Show ID Management only for Admins.
                var aAdminOnlyKeys = ["id"];
                var aNavItems = oPersona.navItems.filter(function (oNav) {
                  if (oNav.key === "vendor") {
                    return bVarAuthorized;
                  }
                  if (oNav.key === "sticker") {
                    // return bStickerAdmin;
                    return true;
                  }
                  if (oNav.key === "violations") {
                    return bTvsAuthorized;
                  }
                  if (aAdminOnlyKeys.indexOf(oNav.key) !== -1) {
                    return bAdmin;
                  }
                  return true;
                });

                oDashboardModel.setProperty("/role", sRole);
                oDashboardModel.setProperty("/pageTitle", oPersona.pageTitle);
                oDashboardModel.setProperty("/navItems", aNavItems);
                // Sticker section renders the admin KPI view when the user is a
                // Sticker Admin, otherwise the personal StickerMaster view.
                oDashboardModel.setProperty(
                  "/sticker/isAdmin",
                  bStickerAdmin,
                );
                oDashboardModel.setProperty(
                  "/showVendorSection",
                  bVarAuthorized,
                );
                var sName = oUser.UserName || "-";
                var sInitials =
                  sName !== "-"
                    ? sName
                      .split(" ")
                      .map(function (w) {
                        return w[0];
                      })
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()
                    : "?";
                oDashboardModel.setProperty("/user/name", sName);
                oDashboardModel.setProperty("/user/initials", sInitials);
                oDashboardModel.setProperty("/user/role", oPersona.roleLabel);
                oDashboardModel.setProperty(
                  "/user/position",
                  oUser.PostionText || "-",
                );
                oDashboardModel.setProperty("/user/id", oUser.Pernr || "-");
                oDashboardModel.setProperty(
                  "/user/loginId",
                  oUser.Usrid || "-",
                );
                oDashboardModel.setProperty(
                  "/user/badgeNo",
                  oUser.UserPosition || "-",
                );
                oDashboardModel.setProperty(
                  "/user/governmentId",
                  oUser.GovermentID || "-",
                );
                oDashboardModel.setProperty(
                  "/user/department",
                  oUser.OrganizationText || "-",
                );
                oDashboardModel.setProperty(
                  "/user/gender",
                  oUser.GenderDesc || "-",
                );

                // Format DOB from yyyyMMdd → dd/MM/yyyy, else show "-"
                var sDob = "-";
                if (oUser.DOB && oUser.DOB.length === 8) {
                  sDob =
                    oUser.DOB.substring(6, 8) +
                    "/" +
                    oUser.DOB.substring(4, 6) +
                    "/" +
                    oUser.DOB.substring(0, 4);
                }
                oDashboardModel.setProperty("/user/dob", sDob);
                oDashboardModel.setProperty(
                  "/user/bloodGroup",
                  oUser.BloodGroup || "-",
                );
                oDashboardModel.setProperty("/user/email", oUser.EMail || "-");
              }
              this._loadDashboardForRole(sRole);
              this._fetchLandingKpis(bAdmin);
              this._fetchStickerData(bStickerAdmin);
            }.bind(this),
          )
          .catch(
            function () {
              this._loadDashboardForRole("COORDINATOR");
              this._fetchLandingKpis(false);
              this._fetchStickerData(false);
            }.bind(this),
          );
      },

      _loadDashboardForRole: function (sRole) {
        var sFragment = SHELL_FRAGMENTS[sRole] || SHELL_FRAGMENTS.COORDINATOR;
        this._loadShellFragment(sFragment);
      },

      onNavItemSelect: function (oEvent) {
        var oItem = oEvent.getParameter("listItem");
        var sKey = oItem.getCustomData()[0].getValue();
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

        // Update selected flag on each nav item so binding reflects new state
        var aNavItems = oDashboardModel.getProperty("/navItems");
        var sTitle = "";
        aNavItems.forEach(function (oNav, i) {
          var bSelected = oNav.key === sKey;
          oDashboardModel.setProperty(
            "/navItems/" + i + "/selected",
            bSelected,
          );
          if (bSelected) {
            sTitle = oNav.title;
          }
        });
        oDashboardModel.setProperty("/selectedNavKey", sKey);
        oDashboardModel.setProperty("/embedTitle", sTitle);

        if (sKey === "vendor") {
          this._loadAppInFrame("BusiVisitorAccess", "manage");
        } else if (sKey === "violations") {
          this._loadAppInFrame("TrafficViolationSystem", "manage");
        } else if (sKey === "sticker") {
          this._loadAppInFrame("StickerMaster", "manage");
        }
        else if (sKey === "id") {
          this._loadAppInFrame("idmanagementsystem", "manage");
        }
        else if (sKey === "dashboard") {
          var sRole = oDashboardModel.getProperty("/role");
          this._loadDashboardForRole(sRole);
        }

      },

      onViewModeChange: function (oEvent) {
        var sKey = oEvent.getParameter("item").getKey(); // "org" | "my"
        var bAdmin = sKey === "org";
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

        oDashboardModel.setProperty("/viewMode", sKey);
        oDashboardModel.setProperty("/isAdmin", bAdmin);

        // Re-fetch KPIs with the new admin flag
        this._fetchLandingKpis(bAdmin);

        // If vendor frame is currently open, reload it with the updated flag
        if (oDashboardModel.getProperty("/isEmbedFrame")) {
          this._loadAppInFrame("BusiVisitorAccess", "manage");
        }
      },

      _loadAppInFrame: function (sSemanticObject, sAction, sInnerRoute) {
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        oDashboardModel.setProperty("/isEmbedFrame", true);
        this._setEmbedMode(true);

        var oContainer = this.byId("dashboardContent");
        oContainer.destroyItems();

        var bAdmin = oDashboardModel.getProperty("/isAdmin");

        // Resolve the target app to a shell-relative intent hash
        // (e.g. "#BusiVisitorAccess-manage?admin=false").
        var sHash;
        try {
          sHash = sap.ushell.Container.getService(
            "CrossApplicationNavigation",
          ).hrefForExternal({
            target: { semanticObject: sSemanticObject, action: sAction },
            params: { admin: bAdmin ? "true" : "false" },
          });
        } catch (e) {
          // fallback for local development outside a launchpad
          sHash =
            "#" +
            sSemanticObject +
            "-" +
            sAction +
            "&admin=" +
            (bAdmin ? "true" : "false");
        }

        // Deep-link into a specific object page of the target app by appending
        // the inner-app route (e.g. "/StickerMaster(StkReqId='266',...)").
        if (sInnerRoute) {
          sHash += (sInnerRoute.charAt(0) === "&" ? "" : "&") + sInnerRoute;
        }

        // hrefForExternal returns a hash that is relative to the launchpad
        // shell. In a standalone FLP this app shares the shell document, so a
        // bare "#..." src already resolves against the shell. In SAP Build Work
        // Zone this app runs inside the app-host iframe, so a bare "#..." src
        // resolves against THIS app's own index.html and just reloads the
        // dashboard. Resolve the hash against the shell (top window) URL so the
        // iframe src is absolute and loads the target app in both environments.
        var sUrl;
        if (sHash && sHash.charAt(0) === "#") {
          var sShellBase;
          try {
            // Work Zone: top window is the launchpad shell (same origin).
            sShellBase =
              (window.top && window.top.location.href) ||
              window.location.href;
          } catch (eTop) {
            // Cross-origin top window — fall back to this document's URL.
            sShellBase = window.location.href;
          }
          sUrl = sShellBase.split("#")[0] + sHash;
        } else {
          // Already an absolute URL — use as-is.
          sUrl = sHash;
        }

        var sFrameId = "jhahEmbedFrame";

        var oHtml = new HTML({
          content:
            '<iframe id="' +
            sFrameId +
            '" src="' +
            sUrl +
            '" style="width:100%;height:calc(100vh - 6.25rem);min-height:calc(100vh - 6.25rem);border:none;display:block;"></iframe>',
          sanitizeContent: false,
          preferDOM: true,
        });

        oHtml.attachAfterRendering(function () {
          var oIframe = document.getElementById(sFrameId);
          if (!oIframe) {
            return;
          }

          var fnHideShell = function () {
            try {
              var oDoc =
                oIframe.contentDocument || oIframe.contentWindow.document;
              if (!oDoc || !oDoc.body) {
                return;
              }

              // Directly hide the confirmed shell header element
              var oHeader = oDoc.querySelector("header#shell-header");
              if (oHeader) {
                oHeader.style.setProperty("display", "none", "important");
              }

              // Inject a persistent style so it survives re-renders
              if (!oDoc.getElementById("jhahShellHide")) {
                var oStyle = oDoc.createElement("style");
                oStyle.id = "jhahShellHide";
                oStyle.textContent =
                  "header#shell-header { display: none !important; height: 0 !important; }" +
                  "body, .sapUiBody, #canvas { padding-top: 0 !important; margin-top: 0 !important; }";
                (oDoc.head || oDoc.documentElement).appendChild(oStyle);
              }
            } catch (e) {
              /* cross-origin — silent fail */
            }
          };

          oIframe.addEventListener("load", function () {
            fnHideShell();
            // Watch for late re-renders (FLP loads shell asynchronously)
            try {
              var oDoc =
                oIframe.contentDocument || oIframe.contentWindow.document;
              var oObserver = new MutationObserver(fnHideShell);
              oObserver.observe(oDoc.body, { childList: true, subtree: true });
              setTimeout(function () {
                oObserver.disconnect();
              }, 8000);
            } catch (e) {
              /* cross-origin */
            }
          });

          fnHideShell(); // try immediately in case iframe was cached
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
          type: "XML",
        }).then(
          function (oShell) {
            oContainer.addItem(oShell);
            this._configureVisitorChart();
          }.bind(this),
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
        oBinding
          .requestContexts()
          .then(function (aContexts) {
            if (!aContexts.length) {
              return;
            }
            var oData = aContexts[0].getObject();

            oDashboardModel.setProperty(
              "/vendorKpis/0/value",
              String(oData.TotalRequests),
            );
            oDashboardModel.setProperty(
              "/vendorKpis/1/value",
              String(oData.ApprovedRequests),
            );
            oDashboardModel.setProperty("/vendorKpis/2/title", "In Progress");
            oDashboardModel.setProperty(
              "/vendorKpis/2/value",
              String(oData.InProgressRequests),
            );

            var iTotalVisitors =
              (oData.totalBusinessReqs || 0) +
              (oData.totalTempStaffReqs || 0) +
              (oData.totalTempJobReqs || 0) +
              (oData.totalProjectReqs || 0) +
              (oData.totalSecurityRequests || 0);
            oDashboardModel.setProperty(
              "/visitorChart/centerLabel",
              iTotalVisitors + " TODAY",
            );
            oDashboardModel.setProperty("/visitorChart/data", [
              { Category: "Business", Count: oData.totalBusinessReqs || 0 },
              {
                Category: "Temporary Staff Access",
                Count: oData.totalTempStaffReqs || 0,
              },
              { Category: "Temporary Job", Count: oData.totalTempJobReqs || 0 },
              { Category: "Project", Count: oData.totalProjectReqs || 0 },
              { Category: "Security", Count: oData.totalSecurityRequests || 0 },
            ]);
          })
          .catch(function () {
            // backend unreachable — static mock data remains in place
          });
      },

      /**
       * Loads the Sticker Management section data.
       *  - Sticker Admins see high-level KPIs (StickerKPI(true)/Set), mirroring
       *    the Business Visitor Access cards.
       *  - Non-admins see their own StickerMaster records (Active Sticker,
       *    Request Status list, and a personal KPI strip).
       */
      _fetchStickerData: function (bStickerAdmin) {
        var oStickerModel = this.getOwnerComponent().getModel("sticker");
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oStickerModel || !oDashboardModel) {
          return;
        }
        oDashboardModel.setProperty("/sticker/isAdmin", bStickerAdmin);

        var sKpiPath =
          "/StickerKPI(" + (bStickerAdmin ? "true" : "false") + ")/Set";
        oStickerModel
          .bindList(sKpiPath, undefined, undefined, undefined, {
            $select:
              "Dashboard,TotalRequests,ApprovedRequests," +
              "InProgressRequests,RejectedRequests",
          })
          .requestContexts()
          .then(function (aContexts) {
            if (!aContexts.length) {
              return;
            }
            var oData = aContexts[0].getObject();
            oDashboardModel.setProperty(
              "/sticker/kpis/0/value",
              String(oData.TotalRequests),
            );
            oDashboardModel.setProperty(
              "/sticker/kpis/1/value",
              String(oData.ApprovedRequests),
            );
            oDashboardModel.setProperty(
              "/sticker/kpis/2/value",
              String(oData.InProgressRequests),
            );
            oDashboardModel.setProperty(
              "/sticker/kpis/3/value",
              String(oData.RejectedRequests),
            );
            oDashboardModel.setProperty("/sticker/hasKpiData", true);
          })
          .catch(function () {
            // backend unreachable — "No data available" placeholder remains
          });

        if (!bStickerAdmin) {
          this._fetchStickerMasterForUser();
        }
      },

      _fetchStickerMasterForUser: function () {
        var oStickerModel = this.getOwnerComponent().getModel("sticker");
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oStickerModel) {
          return;
        }

        var oBinding = oStickerModel.bindList(
          "/StickerMaster",
          undefined,
          [new Sorter("RequestDate", true)],
          [new Filter("IsActiveEntity", FilterOperator.EQ, true)],
          {
            $select:
              "StkReqId,StkReqIdStr,StkType,StkTypeDesc,Status,StatsCriticality," +
              "ExpireDate,RequestDate,PlateNumEng,ArabicPlateNum," +
              "ManufacturerDesc,ColorDesc,DraftUUID,IsActiveEntity",
          },
        );

        oBinding
          .requestContexts(0, 50)
          .then(
            function (aContexts) {
              var aRequests = aContexts.map(
                function (oCtx) {
                  var o = oCtx.getObject();
                  return {
                    reqId: o.StkReqId,
                    reqIdStr: o.StkReqIdStr || o.StkReqId,
                    stkType: o.StkType || "-",
                    type: o.StkTypeDesc || "-",
                    status: o.Status || "-",
                    statusState: this._stickerCriticalityState(
                      o.StatsCriticality,
                    ),
                    crit: o.StatsCriticality,
                    expiry: this._formatOdataDate(o.ExpireDate),
                    plate: o.PlateNumEng || o.ArabicPlateNum || "-",
                    vehicle: [o.ManufacturerDesc, o.ColorDesc]
                      .filter(Boolean)
                      .join(" · "),
                    draftUUID:
                      o.DraftUUID || "00000000-0000-0000-0000-000000000000",
                    isActive: o.IsActiveEntity !== false,
                  };
                }.bind(this),
              );

              // KPI counts reflect all of the user's requests; the table shows
              // only the 5 most recent to keep the card compact.
              oDashboardModel.setProperty(
                "/sticker/requests",
                aRequests.slice(0, 5),
              );
              oDashboardModel.setProperty(
                "/sticker/hasUserData",
                aRequests.length > 0,
              );

              var iInProgress = aRequests.filter(function (r) {
                return r.crit === 2;
              }).length;
              var aActive = aRequests.filter(function (r) {
                return r.crit === 3;
              });
              oDashboardModel.setProperty(
                "/sticker/userKpis/0/value",
                String(aRequests.length),
              );
              oDashboardModel.setProperty(
                "/sticker/userKpis/1/value",
                String(iInProgress),
              );
              oDashboardModel.setProperty(
                "/sticker/userKpis/2/value",
                String(aActive.length),
              );

              // Active Sticker = most recent active/approved request
              if (aActive.length) {
                var oA = aActive[0];
                oDashboardModel.setProperty("/sticker/active", {
                  hasData: true,
                  plate: oA.plate,
                  type: oA.type,
                  vehicle: oA.vehicle,
                  expiry: oA.expiry,
                  status: oA.status,
                  statusState: oA.statusState,
                });
              } else {
                oDashboardModel.setProperty("/sticker/active/hasData", false);
              }
            }.bind(this),
          )
          .catch(function () {
            // backend unreachable — "No data available" placeholder remains
          });
      },

      _stickerCriticalityState: function (iCrit) {
        switch (iCrit) {
          case 3:
            return "Success";
          case 2:
            return "Warning";
          case 1:
            return "Error";
          default:
            return "None";
        }
      },

      _formatOdataDate: function (sDate) {
        if (!sDate || typeof sDate !== "string" || sDate.length < 10) {
          return "-";
        }
        var aParts = sDate.substring(0, 10).split("-");
        return aParts.length === 3
          ? aParts[2] + "/" + aParts[1] + "/" + aParts[0]
          : "-";
      },

      /**
       * Opens the Sticker Master app in the embedded frame, deep-linked to the
       * clicked request's object page.
       */
      onStickerRequestPress: function (oEvent) {
        var oCtx = oEvent.getSource().getBindingContext("dashboard");
        if (!oCtx) {
          return;
        }
        var oReq = oCtx.getObject();
        var sInnerRoute =
          "/StickerMaster(StkReqId='" +
          oReq.reqId +
          "',DraftUUID=" +
          oReq.draftUUID +
          ",IsActiveEntity=" +
          (oReq.isActive ? "true" : "false") +
          ")";

        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        var aNavItems = oDashboardModel.getProperty("/navItems") || [];
        aNavItems.forEach(function (oNav, i) {
          oDashboardModel.setProperty(
            "/navItems/" + i + "/selected",
            oNav.key === "sticker",
          );
        });
        oDashboardModel.setProperty("/selectedNavKey", "sticker");
        oDashboardModel.setProperty("/embedTitle", "Sticker Management");

        this._loadAppInFrame("StickerMaster", "manage", sInnerRoute);
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
            layout: { maxWidth: 0.35 },
          },
          plotArea: {
            dataLabel: {
              visible: true,
              type: "value",
            },
            colorPalette: [
              "#1d7db5",
              "#31a56e",
              "#d28c22",
              "#6d8fd7",
              "#9b59b6",
            ],
          },
        });
      },
    });
  },
);
