define([ "core/origin", "./views/storageView" ], function(Origin, StorageView) {

	Origin.on("sysadmin:ready", function() {
		Origin.trigger("sysadmin:addView", {
			name: "storage",
			title: Origin.l10n.t("app.storage"),
			icon: "fa-hdd-o",
			view: StorageView
		});
	});

});
