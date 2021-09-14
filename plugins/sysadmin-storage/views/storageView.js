define([
	"core/origin",
	"plugins/sysadmin/views/sysadminPluginView"
], function(Origin, SysadminPluginView) {

	var StorageView = SysadminPluginView.extend({

		name: "storage",

		events: {
			"click .plugins button": "onPluginsClick"
		},

		preRender: function() {
			$.ajax({
				url: "api/storage",
				error: function(jqXHR, textStatus, errorThrown) {
					Origin.Notify.alert({
						type: "error",
						text: Origin.l10n.t("app.storageerror")
					});
				},
				success: function(data, textStatus, jqXHR) {
					this.model = new Backbone.Model(data);
					this.render();
				}.bind(this)
			});
		},

		postRender: function() {
			this.setViewToReady();
		},

		onPluginsClick: function() {
			Origin.router.navigateTo("pluginManagement");
		}

	}, { template: "storage" });

	return StorageView;

});
