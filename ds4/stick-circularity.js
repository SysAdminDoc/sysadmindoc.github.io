class JoystickState {
  constructor() {
    this.reset();
  }

  reset() {
    this.llData = new Array(48).fill(0);
    this.rrData = new Array(48).fill(0);
    this.enableCircularTest = false; // This should be set based on user interaction (e.g., checkbox state)
    this.checkCircularity = false; // Use a getter/setter for a more controlled state change.
  }

  /*resetCircularity() {
    this.reset();
    this.checkCircularity = false;
    document.getElementById('circ-data').style.display = 'none';
  }*/

  resetCircularity() {
    this.reset();
    this.llData.fill(0);
    this.rrData.fill(0);
    this.enableCircularTest = this.checkCircularity;
    const circularElement = document.getElementById('circ-data');
    if (this.enableCircularTest) {
      circularElement.style.display = 'block';
    } else {
      circularElement.style.display = 'none';
    }
  }

  update(lx, ly, rx, ry) {
    let MAX_N = this.llData.length;
    for (let i = 0; i < MAX_N; i++) {
        // Calculate angle in radians for each data point on circle/sphere.
        let angle = (i / MAX_N) * 2 * Math.PI;

        // Calculate the x and y coordinates of the data points.
        let x = Math.cos(angle);
        let y = Math.sin(angle);

        // Update the data array with the maximum distance between the stick position and the data point.
        this.llData[i] = Math.max(this.llData[i], Math.sqrt((lx - x) ** 2 + (ly - y) ** 2));
    }

    MAX_N = this.rrData.length;
    for (let i = 0; i < MAX_N; i++) {
        // Calculate angle in radians for each data point on circle/sphere.
        let angle = (i / MAX_N) * 2 * Math.PI;

        // Calculate the x and y coordinates of the data points.
        let x = Math.cos(angle);
        let y = Math.sin(angle);

        // Update the data array with the maximum distance between the stick position and the data point.
        this.rrData[i] = Math.max(this.rrData[i], Math.sqrt((rx - x) ** 2 + (ry - y) ** 2));
    }
    
    /*const plx = lx / 128 * 100 - 1;
    const ply = ly / 128 * 100 - 1;
    const prx = rx / 128 * 100 - 1;
    const pry = ry / 128 * 100 - 1;*/

    // adding data points based on joystick positions.
    if (this.enableCircularTest) {
      //const pld = Math.sqrt(plx * plx + ply * ply);
      const pld = Math.sqrt(lx*lx + ly*ly);
      //const pla = this.findIndexForAngle((Math.atan2(ply, plx) * Math.PI / MAX_ANGLES) % (MAX_ANGLES / 2));
      const pla = (parseInt(Math.round(Math.atan2(ly, lx) * MAX_N / 2.0 / Math.PI)) + MAX_N) % MAX_N;
      let old = this.llData[pla];
      if (old === undefined) old = 0;
      this.llData[pla] = Math.max(old, pld);

      //const prd = Math.sqrt(prx * prx + pry * pry);
      const prd = Math.sqrt(rx*rx + ry*ry);
      //const pra = this.findIndexForAngle((Math.atan2(pry, prx) * Math.PI / MAX_ANGLES) % (MAX_ANGLES / 2));
      const pra = (parseInt(Math.round(Math.atan2(ry, rx) * MAX_N / 2.0 / Math.PI)) + MAX_N) % MAX_N;
      old = this.rrData[pra];
      if (old === undefined) old = 0;
      this.rrData[pra] = Math.max(old, prd);
    }
  }

  findIndexForAngle(angle) {
    return Math.floor((angle * MAX_ANGLES / (Math.PI / 2)) % MAX_ANGLES);
  }

  get checkCircularity() {
    return document.getElementById('checkCircularity').checked;
  }

  set checkCircularity(value) {
    document.getElementById('checkCircularity').checked = value;
    this.enableCircularTest = value;
    
    if (value) {
      document.getElementById('circ-data').style.display = 'flex';
    } else {
      document.getElementById('circ-data').style.display = 'none';
    }
  }

  render() {
    // The DOM manipulation can be simplified by using template elements and updating their properties.
    const stickCanvas = document.getElementById('stickCanvas');
    const ctx = stickCanvas.getContext('2d');
    const stickSize = 60;
    const halfBaseHeight = 20 + stickSize;
    const halfYOffset = 15 + stickSize;
    const canvasWidth = stickCanvas.width;
    const canvasHeight = stickCanvas.height;
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
  
    // Left circle
    ctx.beginPath();
    ctx.arc(halfBaseHeight, halfYOffset, stickSize, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  
    // Right circle
    ctx.beginPath();
    ctx.arc(canvasWidth - halfBaseHeight, halfYOffset, stickSize, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  
    if (this.enableCircularTest) {
      drawData(this.llData, halfBaseHeight, halfYOffset, canvasWidth - halfBaseHeight, ctx);
      drawData(this.rrData, canvasWidth - halfBaseHeight, halfYOffset, halfBaseHeight, ctx);
    }
  
    ctx.strokeStyle = '#aaaaaa';
    ctx.beginPath();
    ctx.moveTo(halfBaseHeight - stickSize, halfYOffset);
    ctx.lineTo(halfBaseHeight + stickSize, halfYOffset);
    ctx.closePath();
    ctx.stroke();
  
    ctx.beginPath();
    ctx.moveTo(canvasWidth - halfBaseHeight - stickSize, halfYOffset);
    ctx.lineTo(canvasWidth - halfBaseHeight + stickSize, halfYOffset);
    ctx.closePath();
    ctx.stroke();
  
    ctx.beginPath();
    ctx.moveTo(halfBaseHeight, halfYOffset - stickSize);
    ctx.lineTo(halfBaseHeight, halfYOffset + stickSize);
    ctx.stroke();
  
    ctx.beginPath();
    ctx.moveTo(canvasWidth - halfBaseHeight, halfYOffset - stickSize);
    ctx.lineTo(canvasWidth - halfBaseHeight, halfYOffset + stickSize);
    ctx.stroke();
  
    const plx = Joystick.llData[0] || 0;
    const ply = Joystick.llData[1] || 0;
    const prx = Joystick.rrData[0] || 0;
    const pry = Joystick.rrData[1] || 0;
  
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.arc(halfBaseHeight + plx * stickSize, halfYOffset + ply * stickSize, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(halfBaseHeight, halfYOffset);
    ctx.lineTo(halfBaseHeight + plx * stickSize, halfYOffset + ply * stickSize);
    ctx.stroke();
  
    ctx.beginPath();
    ctx.arc(canvasWidth - halfBaseHeight + prx * stickSize, halfYOffset + pry * stickSize, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(canvasWidth - halfBaseHeight, halfYOffset);
    ctx.lineTo(canvasWidth - halfBaseHeight + prx * stickSize, halfYOffset + pry * stickSize);
    ctx.stroke();

    if (this.enableCircularTest) {
        let ofl = 0, ofr = 0, lcounter = 0, rcounter = 0;

        for (let i = 0; i < this.llData.length; i++) 
            if(this.llData[i] > 0.2) {
                lcounter += 1;
                ofl += Math.pow(this.llData[i] - 1, 2);
            }
        
        for (let i = 0; i < this.rrData.length; i++) {
            if(this.rrData[i] > 0.2) {
                rcounter += 1;
                ofr += Math.pow(this.rrData[i] - 1, 2);
            }
        }

        if(lcounter > 0) ofl = Math.sqrt(ofl / lcounter) * 100;
        if(rcounter > 0) ofr = Math.sqrt(ofr / rcounter) * 100;

        const el = ofl.toFixed(2) + "%";
        const er = ofr.toFixed(2) + "%";

        document.getElementById('el-lbl').textContent = el;
        document.getElementById('er-lbl').textContent = er;
    }

    function drawData(data, startX, startY, endX, ctx) {
      const MAX_N = data.length;
      const angleStep = (2 * Math.PI) / MAX_N;
    
      for (let i = 0; i < MAX_N; i++) {
          const kd = data[i];
          const kd1 = data[(i + 1) % MAX_N];
    
          // Skip undefined values
          if (kd === undefined || kd1 === undefined) continue;
    
          const ka = i * angleStep;
          const ka1 = ((i + 1) % MAX_N) * angleStep;
    
          const kx = calculateCoordinates(ka, kd).x;
          const ky = calculateCoordinates(ka, kd).y;
          const kx1 = calculateCoordinates(ka1, kd1).x;
          const ky1 = calculateCoordinates(ka1, kd1).y;
    
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX + kx * stickSize , startY + ky * stickSize );
          ctx.lineTo(startX + kx1 * stickSize , startY + ky1 * stickSize );
          ctx.lineTo(startX, startY);
          ctx.closePath();
    
          const cc = (kd + kd1) / 2;
          const hh = ccToColor(cc);
          ctx.fillStyle = 'hsla(' + parseInt(hh) + ', 100%, 50%, 0.5)';
          ctx.fill();
      }
    
      function calculateCoordinates(angle, radius) {
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        };
      }
      
      // convert circularity data to HSL color value
      function ccToColor(cc) {
        const hh = 245 + (360 - 245) * Math.min(1, Math.max(0, (1 - cc) / 0.15)) % 360;
        return `hsla(${parseInt(hh, 10)}, 100%, 50%, 0.5)`;
      }
    }
  }
}

const Joystick = new JoystickState();

// Event listeners can be attached to the DOM elements directly in the HTML file.
document.addEventListener('DOMContentLoaded', () => {
   document.getElementById('checkCircularity')?.addEventListener('change', ({ target }) => Joystick.checkCircularity = target.checked);
   document.getElementById('resetCircBtn')?.addEventListener('click', Joystick.resetCircularity);
});

window.addEventListener('gamepadconnected', ({ gamepad }) => {
  //process_ds_input(gamepad);

   // setInterval(()=> process_ds_input(gamepad), 20);
});

// updateGamepadData
function process_ds_input(data) {
    var lx = data.data.getUint8(0);
    var ly = data.data.getUint8(1);
    var rx = data.data.getUint8(2);
    var ry = data.data.getUint8(3);

    // Update the joystick state with the new values
    Joystick.update(lx, ly, rx, ry);
    Joystick.render();
}

function reset_circularity() {
  Joystick.resetCircularity();
}

/*
var last_lx = 0, last_ly = 0, last_rx = 0, last_ry = 0;
var ll_updated = false;

var ll_data=new Array(48);
var rr_data=new Array(48);
var enable_circ_test = false;

function reset_circularity() {
    for(i=0;i<ll_data.length;i++) ll_data[i] = 0;
    for(i=0;i<rr_data.length;i++) rr_data[i] = 0;
    enable_circ_test = false;
    ll_updated = false;
    $("#checkCircularity").prop('checked', false);
    refresh_stick_pos();
}

function refresh_stick_pos() {
    var c = document.getElementById("stickCanvas");
    var ctx = c.getContext("2d");
    var sz = 60;
    var hb = 20 + sz;
    var yb = 15 + sz;
    var w = c.width;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';

    // Left circle
    ctx.beginPath();
    ctx.arc(hb, yb, sz, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right circle
    ctx.beginPath();
    ctx.arc(w - hb, yb, sz, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    function cc_to_color(cc) {
        var dd = Math.sqrt(Math.pow((1.0 - cc), 2));
        if(cc <= 1.0)
            hh = 220 - 220 * Math.min(1.0, Math.max(0, (dd - 0.05)) / 0.1);
        else
            hh = (245 + (360-245) * Math.min(1.0, Math.max(0, (dd - 0.05)) / 0.15)) % 360;
        return hh;
    }

    if(enable_circ_test) {
        var MAX_N = ll_data.length;

        for(i=0;i<MAX_N;i++) {
            var kd = ll_data[i];
            var kd1 = ll_data[(i+1) % ll_data.length];
            if (kd === undefined || kd1 === undefined) continue;
            var ka = i * Math.PI * 2 / MAX_N;
            var ka1 = ((i+1)%MAX_N) * 2 * Math.PI / MAX_N;

            var kx = Math.cos(ka) * kd;
            var ky = Math.sin(ka) * kd;
            var kx1 = Math.cos(ka1) * kd1;
            var ky1 = Math.sin(ka1) * kd1;

            ctx.beginPath();
            ctx.moveTo(hb, yb);
            ctx.lineTo(hb+kx*sz, yb+ky*sz);
            ctx.lineTo(hb+kx1*sz, yb+ky1*sz);
            ctx.lineTo(hb, yb);
            ctx.closePath();

            var cc = (kd + kd1) / 2;
            var hh = cc_to_color(cc);
            ctx.fillStyle = 'hsla(' + parseInt(hh) + ', 100%, 50%, 0.5)';
            ctx.fill();
        }

        for(i=0;i<MAX_N;i++) {
            var kd = rr_data[i];
            var kd1 = rr_data[(i+1) % rr_data.length];
            if (kd === undefined || kd1 === undefined) continue;
            var ka = i * Math.PI * 2 / MAX_N;
            var ka1 = ((i+1)%MAX_N) * 2 * Math.PI / MAX_N;

            var kx = Math.cos(ka) * kd;
            var ky = Math.sin(ka) * kd;
            var kx1 = Math.cos(ka1) * kd1;
            var ky1 = Math.sin(ka1) * kd1;

            ctx.beginPath();
            ctx.moveTo(w-hb, yb);
            ctx.lineTo(w-hb+kx*sz, yb+ky*sz);
            ctx.lineTo(w-hb+kx1*sz, yb+ky1*sz);
            ctx.lineTo(w-hb, yb);
            ctx.closePath();

            var cc = (kd + kd1) / 2;
            var hh = cc_to_color(cc);
            ctx.fillStyle = 'hsla(' + parseInt(hh) + ', 100%, 50%, 0.5)';
            ctx.fill();
        }
    }

    ctx.strokeStyle = '#aaaaaa';
    ctx.beginPath();
    ctx.moveTo(hb-sz, yb);
    ctx.lineTo(hb+sz, yb);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w-hb-sz, yb);
    ctx.lineTo(w-hb+sz, yb);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(hb, yb-sz);
    ctx.lineTo(hb, yb+sz);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w-hb, yb-sz);
    ctx.lineTo(w-hb, yb+sz);
    ctx.closePath();
    ctx.stroke();

    var plx = last_lx;
    var ply = last_ly;
    var prx = last_rx;
    var pry = last_ry;

    if(enable_circ_test) {
        var pld = Math.sqrt(plx*plx + ply*ply);
        var pla = (parseInt(Math.round(Math.atan2(ply, plx) * MAX_N / 2.0 / Math.PI)) + MAX_N) % MAX_N;
        var old = ll_data[pla];
        if(old === undefined) old = 0;
        ll_data[pla] = Math.max(old, pld);

        var prd = Math.sqrt(prx*prx + pry*pry);
        var pra = (parseInt(Math.round(Math.atan2(pry, prx) * MAX_N / 2.0 / Math.PI)) + MAX_N) % MAX_N;
        var old = rr_data[pra];
        if(old === undefined) old = 0;
        rr_data[pra] = Math.max(old, prd);
    }

    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.arc(hb+plx*sz,yb+ply*sz,4, 0, 2*Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(hb, yb);
    ctx.lineTo(hb+plx*sz, yb+ply*sz);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w-hb+prx*sz, yb+pry*sz,4, 0, 2*Math.PI);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w-hb, yb);
    ctx.lineTo(w-hb+prx*sz, yb+pry*sz);
    ctx.stroke();

    var lbl = "", lbx = "";
    $("#lx-lbl").text(float_to_str(plx));
    $("#ly-lbl").text(float_to_str(ply));
    $("#rx-lbl").text(float_to_str(prx));
    $("#ry-lbl").text(float_to_str(pry));

    if(enable_circ_test) {
        var ofl = 0, ofr = 0, lcounter = 0, rcounter = 0;
        ofl = 0; ofr = 0;
        for (i=0;i<ll_data.length;i++) 
            if(ll_data[i] > 0.2) {
                lcounter += 1;
                ofl += Math.pow(ll_data[i] - 1, 2);
            }
        for (i=0;i<rr_data.length;i++) {
            if(ll_data[i] > 0.2) {
                rcounter += 1;
                ofr += Math.pow(rr_data[i] - 1, 2);
            }
        }
        if(lcounter > 0)
            ofl = Math.sqrt(ofl / lcounter) * 100;
        if(rcounter > 0)
            ofr = Math.sqrt(ofr / rcounter) * 100;

        el = ofl.toFixed(2) + "%";
        er = ofr.toFixed(2) + "%";
        $("#el-lbl").text(el);
        $("#er-lbl").text(er);
    }
}

function circ_checked() { return $("#checkCircularity").is(':checked') }

function on_circ_check_change() {
    enable_circ_test = circ_checked();
    for(i=0;i<ll_data.length;i++) ll_data[i] = 0;
    for(i=0;i<rr_data.length;i++) rr_data[i] = 0;

    if(enable_circ_test) {
        $("#circ-data").show();
    } else {
        $("#circ-data").hide();
    }
    refresh_stick_pos();
}

function float_to_str(f) {
    if(f < 0.004 && f >= -0.004) return "+0.00";
    return (f<0?"":"+") + f.toFixed(2);
}

var on_delay = false;

function timeout_ok() {
    on_delay = false;
    if(ll_updated)
        refresh_stick_pos();
}

function refresh_sticks() {
    if(on_delay)
        return;

    refresh_stick_pos();
    on_delay = true;
    setTimeout(timeout_ok, 20);
}

function process_ds4_input(data) {
    var lx = data.data.getUint8(0);
    var ly = data.data.getUint8(1);
    var rx = data.data.getUint8(2);
    var ry = data.data.getUint8(3);

    var new_lx = Math.round((lx - 127.5) / 128 * 100) / 100;
    var new_ly = Math.round((ly - 127.5) / 128 * 100) / 100;
    var new_rx = Math.round((rx - 127.5) / 128 * 100) / 100;
    var new_ry = Math.round((ry - 127.5) / 128 * 100) / 100;

    if(last_lx != new_lx || last_ly != new_ly || last_rx != new_rx || last_ry != new_ry) {
        last_lx = new_lx;
        last_ly = new_ly;
        last_rx = new_rx;
        last_ry = new_ry;
        ll_updated = true;
        refresh_sticks();
    }
}

function process_ds_input(data) {
    var lx = data.data.getUint8(0);
    var ly = data.data.getUint8(1);
    var rx = data.data.getUint8(2);
    var ry = data.data.getUint8(3);

    var new_lx = Math.round((lx - 127.5) / 128 * 100) / 100;
    var new_ly = Math.round((ly - 127.5) / 128 * 100) / 100;
    var new_rx = Math.round((rx - 127.5) / 128 * 100) / 100;
    var new_ry = Math.round((ry - 127.5) / 128 * 100) / 100;

    if(last_lx != new_lx || last_ly != new_ly || last_rx != new_rx || last_ry != new_ry) {
        last_lx = new_lx;
        last_ly = new_ly;
        last_rx = new_rx;
        last_ry = new_ry;
        ll_updated = true;
        refresh_sticks();
    }
}
*/
