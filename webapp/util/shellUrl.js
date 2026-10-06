sap.ui.define([
  "sap/base/Log",
  "sap/base/util/ObjectPath"
], (Log, ObjectPath) => {
  "use strict";

  const LOG_COMPONENT = "com.jhah.zhrjhahseclp.util.shellUrl";

  /**
   * The launchpad's shell container. It is only ever looked up, never loaded:
   * inside the launchpad it already exists, and outside there is none to load.
   *
   * @returns {object|undefined} The shell container
   */
  function getShellContainer() {
    return sap.ui.require("sap/ushell/Container") || ObjectPath.get("sap.ushell.Container");
  }

  return {
    /**
     * Finds the URL of the launchpad this app runs in, without its hash.
     *
     * @returns {Promise<string>} The launchpad URL
     */
    async resolveShellBaseUrl() {
      try {
        // The container knows its own launchpad URL, and in the app runtime
        // it answers over postMessage.
        const sFlpUrl = await getShellContainer().getFLPUrl(false);
        if (!sFlpUrl) {
          throw new Error("container returned no FLP URL");
        }
        return sFlpUrl.split("#")[0];
      } catch (oError) {
        Log.warning(
          "getFLPUrl unavailable, deriving shell base",
          (oError && oError.message) || String(oError),
          LOG_COMPONENT
        );
      }

      // The parent document is the shell.
      if (document.referrer) {
        return document.referrer.split("#")[0];
      }

      // Last resort: strip the destination suffix off our own host.
      const oUrl = new URL(window.location.href);
      const aHost = oUrl.hostname.split(".");
      aHost[0] = aHost[0].replace(/-sapdelim-.*$/, "");
      return `${oUrl.protocol}//${aHost.join(".")}/site`;
    },

    /**
     * Builds the launchpad URL that opens an application without the shell
     * header, so the app can sit directly under this dashboard's own chrome.
     *
     * The intent hash has the form #SemanticObject-action?params&/innerRoute.
     * The first parameter separator is "?": an "&" there would fold the
     * parameters into the action name and the intent would not resolve.
     *
     * @param {string} sShellBaseUrl Launchpad URL without hash
     * @param {object} oIntent The navigation target
     * @param {string} oIntent.semanticObject Semantic object of the application
     * @param {string} oIntent.action Action of the application
     * @param {Object<string,string>} [oIntent.params] Intent parameters
     * @param {string} [oIntent.innerRoute] Route inside the application
     * @returns {string} The URL to load
     */
    buildIntentUrl(sShellBaseUrl, oIntent) {
      const sSeparator = sShellBaseUrl.includes("?") ? "&" : "?";
      let sHash = `#${oIntent.semanticObject}-${oIntent.action}`;

      const sParams = Object.entries(oIntent.params || {})
        .map(([sName, vValue]) => `${sName}=${vValue}`)
        .join("&");
      if (sParams) {
        sHash += "?" + sParams;
      }

      if (oIntent.innerRoute) {
        sHash += "&/" + oIntent.innerRoute.replace(/^[&/]+/, "");
      }

      return `${sShellBaseUrl}${sSeparator}sap-ushell-config=headerless${sHash}`;
    },
  };
});
