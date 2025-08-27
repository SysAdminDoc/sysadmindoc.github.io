const storageMethod = null;
let storeData;

const Storage = {
   //setParams: x => localStorage.setItem('store', JSON.stringify(x)),

   /*getParams(callback, sync_type, x) {
      const data = JSON.parse(localStorage.getItem('store'));
      callback(x ? data?.x : data);
   },*/

   setParams: x => { },
   getParams: callback => callback(storeData),
};

// window.addEventListener('load', () => {
//    document.addEventListener('submit', form => {
//       let newSettings = {};

//       for (let [key, value] of new FormData(form.target)) {
//          if (newSettings.hasOwnProperty(key)) { // SerializedArray
//             newSettings[key] += ',' + value; // add new
//             newSettings[key] = newSettings[key].split(','); // to array [old, new]

//          } else {
//             newSettings[key] = value;
//          };
//       }

//       //console.log(newSettings);

//       (async () => {
//          const rawResponse = await fetch('https://', {
//             method: 'POST',
//             headers: {
//                'Accept': 'application/json',
//                'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(newSettings)
//          });
//          //const content = await rawResponse.json();
//          //console.log(content);
//       })();

//    });
// });
