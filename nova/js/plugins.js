if (location.hash == '#demo') {
   // css fix
   const style = document.createElement('style');
   style.textContent = `
       li:not(:hover):has(input[type="checkbox"]:not(:checked)) {
          opacity: 1 !important;
       }
   `;
   document.head.appendChild(style);
   
   const script = injectScript('https://raw.githack.com/raingart/Nova-YouTube-extension/master/js/plugins.js');

   script.onload = () => {
      Plugins.load = function (list) {
         (list || this.list)
            .filter(n => !n.includes('/+')) // skip some plugin
            .forEach(plugin => {
               try {
                  this.injectScript('https://raw.githack.com/raingart/Nova-YouTube-extension/master/plugins/' + plugin);
               } catch (error) {
                  console.error(`plugin loading failed: ${plugin}\n${error.stack}`);
               }
            });
      };
      Plugins.load();

      window.addEventListener('load', () => {
         document.dispatchEvent(
            new CustomEvent(
               'settings-sync',
               {
                  bubbles: true,
                  detail: {
                     'plugins': window.nova_plugins.map(obj => { obj._runtime = function () { }; return obj; }),
                  }
               })
         );
      });
   };

   function injectScript(source = required()) {
      const script = document.createElement('script');
      if (source.endsWith('.js')) {
         script.src = source;
         script.defer = true; // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer:~:text=defer,-This
         // script.async = true;
      }
      // injectCode
      else {
         script.textContent = source.toString();
         // script.src = "data:text/plain;base64," + btoa(source);
         // script.src = 'data:text/javascript,' + encodeURIComponent(source)
      }
      (document.head || document.documentElement).append(script);
      return script;
   }
}
