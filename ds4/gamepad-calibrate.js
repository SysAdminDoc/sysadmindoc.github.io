// last 7b13ccd
let
   device = null,
   devname = '',
   mode = 0,
   disable_btn = false;

function dec2hex(i) {
   return (i + 0x10000).toString(16).substr(-4).toUpperCase();
}
function dec2hex32(i) {
   return (i + 0x100000000).toString(16).substr(-8).toUpperCase();
}
function dec2hex8(i) {
   return (i + 0x100).toString(16).substr(-2).toUpperCase();
}

async function ds4_info() {
   const view = await device.receiveFeatureReport(0xa3);

   const cmd = view.getUint8(0, true);
   if (cmd != 0xa3 || view.buffer.byteLength != 49) return false;

   const k1 = new TextDecoder().decode(view.buffer.slice(1, 0x10)).replace(/\0/g, '');
   const k2 = new TextDecoder().decode(view.buffer.slice(0x10, 0x20)).replace(/\0/g, '');

   const
      hw_ver_major = view.getUint16(0x21, true),
      hw_ver_minor = view.getUint16(0x23, true),
      sw_ver_major = view.getUint32(0x25, true),
      sw_ver_minor = view.getUint16(0x25 + 4, true);

   let is_clone = false;
   try {
      const view = await device.receiveFeatureReport(0x81);
      await ds4_nvstatus(); // RangeError: Offset is outside the bounds of the DataVie (DataView.getUint8)
   }
   catch (e) {
      is_clone = true;
      disable_btn = true;
   }

   clear_info();
   append_info(l('Build Date:'), k1 + ' ' + k2);
   append_info(l('HW Version:'), dec2hex(hw_ver_major) + ':' + dec2hex(hw_ver_minor));
   append_info(l('SW Version:'), dec2hex32(sw_ver_major) + ':' + dec2hex(sw_ver_minor));
   append_info(l('Device Type:'), is_clone ? '<font color="red"><b>' + l('clone') + '</b></font>' : l('original'));
   append_info(l('Board Model:'), ds4_hw_to_bm(hw_ver_minor));

   if (!is_clone) {
      // All ok, safe to query NVS Status and BD Addr
      // await ds4_nvstatus();
      //await ds4_getbdaddr();
   }
   return true;

   function ds4_hw_to_bm(hw_ver) {
      switch (hw_ver >> 8) {
         case 0x31: return 'JDM-001'; break;
         case 0x43: return 'JDM-011'; break;
         case 0x81:
         case 0x82:
         case 0x83:
         case 0x93:
            return 'JDM-020';
            break;
         case 0x54: return 'JDM-030'; break;

         case 0x64:
         case 0x65:
         case 0x66:
         case 0x67:
         case 0x68:
         case 0x69:
         case 0x70:
         case 0x71:
         case 0x72:
         case 0x73:
         case 0x74:
            return 'JDM-040';
            break;
         case 0xa4: return 'JDM-050'; break;
         case 0xb4: return 'JDM-055'; break;
         //case 0xb0: return 'JDM-055 (clone)'; break;
         default: return 'Unknown'; break;
      }
   }
}

async function calibrateController(type, hasPermChanges) {
   const commands = {
      DS4: {
         begin: { reportId: 0x90, data: [1, 1, 2] },
         sample: { reportId: 0x90, data: [3, 1, 1] },
         end: { reportId: 0x90, data: [2, 1, 2] }
      },
      DS5: {
         begin: { reportId: 0x82, data: [1, 1, (mode === 2) ? 1 : 2] },
         sample: { reportId: 0x82, data: [3, 1, 1] },
         end: { reportId: 0x82, data: [2, 1, (mode === 2) ? 1 : 2] }
      }
   };

   const err = l('Calibration failed: ');

   try {
      if (hasPermChanges) { // Check for NVRAM unlock based on mode (DS4/DS5)
         const nvUnlockFunction = (mode === 1) ? ds4_nvunlock : ds5_nvunlock;
         await nvUnlockFunction();
         if (!verifyResponse(0x91010101, 0x920101ff) && mode === 1) {  // Verify for DS4
            return handleNvUnlockError(err);
         }
         else if (!verifyResponse(0x83010101) && mode === 2) {  // Verify for DS5
            return handleNvUnlockError(err);
         }
      }

      let reportId, data;

      switch(type) {
         // Begin calibration
         case 'begin':
            // const { reportId, data } = commands[mode === 1 ? 'DS4' : 'DS5'].begin;
            reportId = commands['DS4'].begin.reportId;
            data = commands['DS4'].begin.data;
            await sendFeatureReport(reportId, data);
            if (!verifyResponse((mode === 1) ? 0x91010101 : 0x83010101, (mode === 1) ? 0x920101ff : undefined)) {
               return handleCalibrationError(err + l('Error 1'));
            }
         break;
            
         // Sample (if applicable)
         case 'Sample':
             //    const { reportId, data } = commands[mode === 1 ? 'DS4' : 'DS5'].sample;
            //    await sendFeatureReport(reportId, data);
            //    if (!verifyResponse((mode === 1) ? 0x91010101 : 0x83010101, (mode === 1) ? 0x920101ff : undefined)) {
            //       return handleCalibrationError(err + l('Error 2'));
            //    }
         break;

         // End calibration
         case 'end':
            // const { reportId, data } = commands[mode === 1 ? 'DS4' : 'DS5'].end;
            reportId = commands['DS4'].end.reportId;
            data = commands['DS4'].end.data;
            await sendFeatureReport(reportId, data);
            if (!verifyResponse((mode === 1) ? 0x91010101 : 0x83010102, (mode === 1) ? 0x920101FF : undefined)) {
               return handleCalibrationError(err + l('Error 3'));
            }
         break;
      }

      if (hasPermChanges && mode === (mode === 1 ? 1 : 2)) {
         const nvLockFunction = (mode === 1) ? ds4_nvlock : ds5_nvlock;
         await nvLockFunction();
         if (!verifyResponse((mode === 1) ? 0x91010101 : 0x83010102, (mode === 1) ? 0x920101ff : undefined)) {
            return handleNvLockError(err);
         }
      }

      // Success message or further actions
      show_popup(l('Calibration completed'));
      return true;
   } catch (e) {
      await new Promise(r => setTimeout(r, 500));
      return handleCalibrationError(err + e);
   }
}

async function ds4_nvstatus() {
   await device.sendFeatureReport(0x08, alloc_req(0x08, [0xff, 0, 12]));
   const data = await device.receiveFeatureReport(0x11);
   const ret = data.getUint8(1, false);
   /*switch (ret) {
      // permanent
      case 0: $('#d-nvstatus').html(`<font color="red">${l('unlocked')}</font>`); break;
      // temporary
      case 1: $('#d-nvstatus').html(`<font color="green">${l('locked')}</font>`); break;
      default: $('#d-nvstatus').html(`<font color="purple">${ret}</font>`); break;
   }*/
   return ret;
}

async function ds5_nvstatus() {
   try {
      await device.sendFeatureReport(0x80, alloc_req(0x80, [3, 3]));
      await device.receiveFeatureReport(0x81);
      const ret = data.getUint32(1, false);

      switch (ret) {
         case 0x03030200:
            //$('#d-nvstatus').html(`<font color="red">${l('unlocked')}</font>`);
            return 0; // permanent
            break;

         case 0x03030201:
            //$('#d-nvstatus').html(`<font color="green">${l('locked')}</font>`);
            return 1; // temporary
            break;

         default:
            //$('#d-nvstatus').html(`<font color="purple">unk ${ret}</font>`);
            return ret; // unknown
            break;
      }
   }
   catch (e) {
      //$('#d-nvstatus').html(`<font color="red">${l('error')}</font>`);
      return 2; // error
   }
}

async function ds4_nvlock() {
   await device.sendFeatureReport(0xa0, alloc_req(0xa0, [10, 1, 0]));
}

async function ds4_nvunlock() {
   await device.sendFeatureReport(0xa0, alloc_req(0xa0, [10, 2, 0x3e, 0x71, 0x7f, 0x89]));
}

async function ds5_info() {
   try {
      const view = await device.receiveFeatureReport(0x20);

      const cmd = view.getUint8(0, true);
      if (cmd != 0x20 || view.buffer.byteLength != 64) return false;

      const build_date = new TextDecoder().decode(view.buffer.slice(1, 1 + 11));
      const build_time = new TextDecoder().decode(view.buffer.slice(12, 20));
      const old_build_time = build_date.search(/ 2020| 2021/);

      const fwtype = view.getUint16(20, true);
      const swseries = view.getUint16(22, true);
      const hwinfo = view.getUint32(24, true);
      const fwversion = view.getUint32(28, true);

      const deviceinfo = new TextDecoder().decode(view.buffer.slice(32, 32 + 12));
      const updversion = view.getUint16(44, true);
      const unk = view.getUint16(46, true);

      const fwversion1 = view.getUint32(50, true);
      const fwversion2 = view.getUint32(54, true);
      const fwversion3 = view.getUint32(58, true);

      clear_info();

      append_info(l('Build Date:'), `${build_date} ${build_time} ` + old_build_time ? '<font color="red"><b>' + l('old') + '</b></font>' : '');
      append_info(l('Firmware Type:'), '0x' + dec2hex(fwtype));
      append_info(l('SW Series:'), '0x' + dec2hex(swseries));
      append_info(l('HW Info:'), '0x' + dec2hex32(hwinfo));
      append_info(l('SW Version:'), '0x' + dec2hex32(fwversion));
      append_info(l('UPD Version:'), '0x' + dec2hex(updversion));
      append_info(l('FW Version1:'), '0x' + dec2hex32(fwversion1));
      append_info(l('FW Version2:'), '0x' + dec2hex32(fwversion2));
      append_info(l('FW Version3:'), '0x' + dec2hex32(fwversion3));
      append_info(l('Board Model:'), ds5_hw_to_bm(hwinfo));

      if (old_build_time != -1) {
         disable_btn = true;
         show_popup(l('This DualSense controller has outdated firmware.'));
         return true;
      }

      await ds5_nvstatus();
      //await ds5_getbdaddr();
      return true;

   } catch (e) {
      show_popup(l("Cannot read controller information"));
      return false;
   }

   function ds5_hw_to_bm(hw_ver) {
      switch (hw_ver >> 8) {
         case 0x03: return 'BDM-010'; break;
         case 0x04: return 'BDM-020'; break;
         case 0x83: return 'BDM-020'; break;
         case 0x05: return 'BDM-030'; break;
         case 0x06: return 'BDM-040'; break;
         case 0xa4: return 'BDM-040'; break;
         case 0x07: return 'BDM-050'; break;
         default: return 'Unknown'; break;
      }
   }
}

async function ds5_nvlock() {
   try {
      await device.sendFeatureReport(0x80, alloc_req(0x80, [3, 1]));
      await device.receiveFeatureReport(0x83);
   }
   catch (e) {
      await new Promise(r => setTimeout(r, 500));
      close_calibrate_window();
      return show_popup(l('NVS Lock failed: ') + e);
   }
}

async function ds5_nvunlock() {
   try {
      await device.sendFeatureReport(0x80, alloc_req(0x80, [3, 2, 101, 50, 64, 12]));
      await device.receiveFeatureReport(0x83);
   }
   catch (e) {
      await new Promise(r => setTimeout(r, 500));
      close_calibrate_window();
      return show_popup(l('NVS Unlock failed: ') + e);
   }
}

async function disconnect() {
   if (device == null) return;

   mode = 0;
   device.close();
   device = null;
   disable_btn = false;

   reset_circularity();
   $('#offlinebar').show();
   $('#onlinebar').hide();
   $('#mainmenu').hide();
   //$('#d-nvstatus').text = l('Unknown');
   //$('#d-bdaddr').text = l('Unknown');
   close_calibrate_window();
}

function handleDisconnectedDevice(e) {
   console.log('Disconnected:', e.device.productName);
   disconnect();
}

function alloc_req(id, data = []) {
   let len = data.length;
   try {
      device.collections[0].featureReports
         .forEach(e => {
            if (e.reportId == id) {
               len = e.items[0].reportCount;
            }
         });
   }
   catch (e) {
      console.log(e);
   }
   let out = new Uint8Array(len);
   for (let i = 0; i < data.length && i < len; i++) {
      out[i] = data[i];
   }
   return out;
}

async function continue_connection(report) {
   try {
      device.oninputreport = null;
      let connected = false;

      // Detect if the controller is connected via USB
      if (report.data.byteLength != 63) {
         $('#btnconnect').prop('disabled', false);
         disconnect();
         show_popup(l('Please connect the device using a USB cable.'))
         return;
      }
      switch (device.productId) {
         case 0x05c4:
            if (await ds4_info()) {
               connected = true;
               mode = 1;
               devname = l('Sony DualShock 4 V1');
               device.oninputreport = process_ds_input;
            }
            break;

         case 0x09cc:
            if (await ds4_info()) {
               connected = true
               mode = 1;
               devname = l('Sony DualShock 4 V2');
               device.oninputreport = process_ds_input;
            }
            break;

         case 0x0ce6:
            if (await ds5_info()) {
               connected = true;
               mode = 2;
               devname = l('Sony DualSense');
               device.oninputreport = process_ds_input;
            }
            break;

         case 0x0df2:
            if (await ds5_info()) {
               connected = true;
               mode = 0;
               devname = l('Sony DualSense Edge');
               device.oninputreport = process_ds_input;
               disable_btn = true;
            }
            break;

         default:
            $('#btnconnect').prop('disabled', false);
            show_popup(l('Connected invalid device: ') + dec2hex(device.vendorId) + ':' + dec2hex(device.productId));
            disconnect();
            return;
      }

      if (connected) {
         $('#devname').text(`${devname} (${dec2hex(device.vendorId)}:${dec2hex(device.productId)})`);
         $('#offlinebar').hide();
         $('#onlinebar').show();
         $('#mainmenu').show();
         $('#resetBtn').show();
         //$('#d-nvstatus').text = l('Unknown');
         //$('#d-bdaddr').text = l('Unknown');
      }
      else {
         $('#btnconnect').prop('disabled', false);
         show_popup(l('Connected invalid device: '));
         disconnect();
         return;
      }

      if (disable_btn) {
         switch (device.productId) {
            case 0x0ce6:
               show_popup(l("This DualSense controller has outdated firmware.") + "<br>" + l("Please update the firmware and try again."), true);
               break;

            case 0x0df2:
               show_popup(l('Calibration of the DualSense Edge is not currently supported.'));
               break;

            default:
               show_popup(l('The device appears to be a DS4 clone. All functionalities are disabled.'));
         }
      }

      $('.ds-btn').prop('disabled', disable_btn);
      $('#btnconnect').prop('disabled', false);
   }
   catch (error) {
      $('#btnconnect').prop('disabled', false);
      show_popup(l('Error: ') + error);
      return;
   }
}

async function connect() {
   reset_circularity();
   try {
      $('#btnconnect').prop('disabled', true);
      await new Promise(r => setTimeout(r, 100));

      const ds4v1 = { vendorId: 0x054c, productId: 0x05c4 };
      const ds4v2 = { vendorId: 0x054c, productId: 0x09cc };
      const ds5 = { vendorId: 0x054c, productId: 0x0ce6 };
      const ds5edge = { vendorId: 0x054c, productId: 0x0df2 };
      const requestParams = { filters: [ds4v1, ds4v2, ds5, ds5edge] };

      let devices = await navigator.hid.getDevices();
      if (devices.length === 0) {
         devices = await navigator.hid.requestDevice(requestParams);
         $('#btnconnect').prop('disabled', false);
         return;
      }
      else if (devices.length > 1) {
         $('#btnconnect').prop('disabled', false);
         show_popup(l('Please connect only one controller at time.'));
         return;
      }

      await devices[0].open();

      device = devices[0];
      device.oninputreport = continue_connection;
   }
   catch (error) {
      $('#btnconnect').prop('disabled', false);
      show_popup(l('Error: ') + error);
      return;
   }
}

let curModal = null;

async function multi_reset() {
   try {
      (mode == 1)
         // ds4
         ? await device.sendFeatureReport(0xa0, alloc_req(0x80, [4, 1, 0]))
         // ds5
         : await device.sendFeatureReport(0x80, alloc_req(0x80, [1, 1, 0]));
   }
   catch (error) { }
}

function close_calibrate_window() {
   if (curModal != null) {
      curModal.hide();
      curModal = null;
   }

   $('#calibCenterModal').modal('hide');
   cur_calib = 0;
   return;
}

function set_progress(pt) {
   $('.progress-bar').css('width', pt + '%');
}

function clear_info() {
   $('#fwinfo').html('');
}

function append_info(key, value) {
   $('#fwinfo').append(
      `<div class="hstack">
         <p>${key}</p>
         <p class="ms-auto">${value}</p>
      </div>`);
}

function show_popup(text) {
   $('#popupBody').text(text);
   new bootstrap.Modal(document.getElementById('popupModal'), {}).show();
}

function calib_perm_changes() { return $('#calibPermanentChanges').is(':checked') }

function reset_calib_perm_changes() {
   $('#calibPermanentChanges').prop('checked', false).parent().removeClass('active');
}

function close_new_calib() {
   $('#calibCenterModal').modal('hide');
   cur_calib = 0;
}

async function calib_step(i) {
   if (i < 1 || i > 7) return;

   const pc = calib_perm_changes();
   let ret = true;

   if (i >= 2 && i <= 6) {
      $('#btnSpinner').show();
      $('#calibNext').prop('disabled', true);
   }

   switch (i) {
      case 1: // Case for stick calibration
         $('#calibNextText').text(l('Start'));
         await new Promise(r => setTimeout(r, 100));
         ret = await calibrateController(pc);  // DS4 mode (1) and permanent changes flag
         break;

      case 2:
         $('#calibNextText').text(l('Initializing...'));
         await new Promise(r => setTimeout(r, 100));
         ret = await calibrateController(pc);  // DS4 mode (1) and permanent changes flag
         // ret = await multi_calib_sticks_begin(pc);
         break;

      case 6:
         $('#calibNextText').text(l('Sampling...'));
         await new Promise(r => setTimeout(r, 100));
         // ret = await multi_calib_sticks_sample();
         ret = await calibrateController(pc);  // DS4 mode (1) and permanent changes flag
         await new Promise(r => setTimeout(r, 100));
         $('#calibNextText').text(l('Storing calibration...'));
         await new Promise(r => setTimeout(r, 100));
         // ret = await multi_calib_sticks_end(pc);
         break;

      default:
         $('#calibNextText').text(l('Sampling...'));
         await new Promise(r => setTimeout(r, 100));
         // ret = await multi_calib_sticks_sample();
         ret = await calibrateController(false); // DS4 mode (1) but no permanent changes
         break;
   }

   if (i >= 2 && i <= 6) {
      await new Promise(r => setTimeout(r, 200));
      $('#calibNext').prop('disabled', false);
      $('#btnSpinner').hide();
   }

   if (ret == false) {
      close_new_calib();
      return;
   }

   for (j = 1; j < 7; j++) {
      $('#list-' + j).hide();
      $('#list-' + j + '-calib').removeClass('active');
   }

   $('#list-' + i).show();
   $('#list-' + i + '-calib').addClass('active');

   switch (i) {
      case 1:
         $('#calibTitle').text(l('Stick center calibration'));
         $('#calibNextText').text(l('Start'));
         break;

      case 6:
         $('#calibTitle').text(l('Stick center calibration'));
         $('#calibNextText').text(l('Done'));
         break;

      default:
         $('#calibTitle').html(l('Calibration in progress'));
         $('#calibNextText').text(l('Continue'));
         break;
   }

   if (i == 1 || i == 6) $('#calibCross').show();
   else $('#calibCross').hide();

}

let cur_calib = 0;
async function calib_open() {
   cur_calib = 0;
   reset_calib_perm_changes();
   await calib_next();
   new bootstrap.Modal(document.getElementById('calibCenterModal'), {}).show();
}

async function calib_next() {
   if (cur_calib == 6) {
      close_new_calib();
      return;
   }
   if (cur_calib < 6) {
      cur_calib += 1;
      await calib_step(cur_calib);
   }
}

function l(str) {
   return str;
}

$(function () {
   if (!('hid' in navigator)) {
      $('#offlinebar').hide();
      $('#onlinebar').hide();
      $('#missinghid').show();
      return;
   }

   $('#offlinebar').show();
   navigator.hid.addEventListener('disconnect', handleDisconnectedDevice);
});
