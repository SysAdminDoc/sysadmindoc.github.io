console.debug('init optionsBilder-patch.js');

document.addEventListener('settings-sync', evt => {
   // console.debug('settings-sync:', evt.detail);

   // build the form
   window.nova_plugins = evt.detail.plugins;
   // Opt.init();

   // fill form
   storeData = evt.detail.settings;
   // PopulateForm.init();

}, { capture: true });
