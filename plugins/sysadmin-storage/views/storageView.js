define([
	"core/origin",
	"plugins/sysadmin/views/sysadminPluginView"
], function(Origin, SysadminPluginView) {

	var StorageView = SysadminPluginView.extend({

		name: "storage",

		events: {
			"click .plugins button": "onPluginsClick"
		},

		preRender: async function() {
			try {
				this.model = new Backbone.Model(await $.get("api/storage"));
				this.render();
				this.setViewToReady();
			} catch(e) {
				Origin.Notify.alert({ type: "error", text: Origin.l10n.t("app.storageerror") });
			}
		},

		onPluginsClick: function() {
			Origin.router.navigateTo("pluginManagement");
		}

	}, { template: "storage" });

	return StorageView;

});
