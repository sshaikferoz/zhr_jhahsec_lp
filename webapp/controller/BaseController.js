sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (Controller) => {
  "use strict";

  return Controller.extend("com.jhah.zhrjhahseclp.controller.BaseController", {
    /**
     * Returns a model of the component. Unlike the view's models, these are
     * available from onInit on.
     *
     * @param {string} [sName] Model name; omit for the default model
     * @returns {sap.ui.model.Model} The model
     */
    getModel(sName) {
      return this.getOwnerComponent().getModel(sName);
    },

    /**
     * @returns {Promise<sap.base.i18n.ResourceBundle>} The app's texts
     */
    getResourceBundle() {
      return Promise.resolve(this.getModel("i18n").getResourceBundle());
    },
  });
});
