    /* TODO:
 ?? Transparent canvas, multiple canvas elements ??
 center text on canvas
 use SVG as background/gauge and arrow
 use SVG as graph, manipulating path as text
 canvas: draw arrow and rotate it
 canvas: separately draw foreground, draw background 
 div markup for header & body & footer
 buttons as svg or as text links & other elements
*/

/*
setTimeout(function, milliseconds)
Executes a function, after waiting a specified number of milliseconds.

setInterval(function, milliseconds)
Same as setTimeout(), but repeats the execution of the function continuously.
The setTimeout() and setInterval() are both methods of the HTML DOM Window object.
*/
// amplitude 41.38 deg, or 360 deg , -41,38 to +41,38; arc length = 2*PI*Radius*(angle/360); chord length = 2*Radius*sin(angle/2); 
// add to body.onload

// requestAnimationFrame 
// use of offscreen canvas
/*
myCanvas.offscreenCanvas = document.createElement('canvas');
myCanvas.offscreenCanvas.width = myCanvas.width;
myCanvas.offscreenCanvas.height = myCanvas.height;

myCanvas.getContext('2d').drawImage(myCanvas.offScreenCanvas, 0, 0);

использовать несколько canvas, если требуется обеспечть а) фон, который меняется редко б) поверх фона что-то другое, что меняется чаще

var ctx = canvas.getContext('2d', { alpha: false }); - выключить прозрачность, но при этом пропадает возможность стирания через width += width

масштабировать канву с помощью css transforms, это быстрее

const sensBase = 20.0 // изначально было 4000.0 // базовый множитель чувствительности
var sensReduce // default 700 // [6100,700,200] min opt max /61 /7 /2
var sensGain // default 200 // in percents 10 - 3200
from 1/10 to 32.0 (min, low, mid, high, max) 

*/

'use strict';

var ble

var canvas
var sensUp, sensDown, sensText, sensDropdown, sensMin, sensMid, sensMax
var bleButton
var setButtonLeft, setButtonRight

var root, footer, main

const minTA = .941
const maxTA = 6.50
var baseTA = 2.00
var instTA = 2.00
var inst
var prev

var dataTA = null
var needleData = []
needleData.maxLength = 60 * 30
var velocityData = []
velocityData.maxLength = 60 * 30

var instTA_text = ""
var deltaTA_text = ""

const sensBase = 20.0 // изначально было 4000.0 // базовый множитель чувствительности
var sensReduce // default 700 // [6100,700,200] min opt max /61 /7 /2
var sensGain // default 200 // in percents 10 - 3200

let gaugeMin = -100
let gaugeMax = +100
let gaugeNow = (maxTA - minTA) / 2
let autoSet = true

// Gauge Parameters
// Mode-1: move needle; Mode-2: move gauge (background)
var divCount = 40
var setPosition = 15

// rect structure
function Rect(rect) {
  // if rect is not type of object then exception !
  let r
  if((rect === undefined) || (rect === null))
    r = { x:0, y:0, w:0, h:0 }
  else
    r = rect
  this.x = r.x
  this.y = r.y
  this.w = r.w
  this.h = r.h
} 

function ServerHandler(event) {
  
  if(inst !== undefined) prev = inst
  inst        = { timeStamp: event.timeStamp, r: event.data, ta: r2ta(event.data) }
  instTA      = inst.ta
  instTA_text = instTA.toFixed(2)
  
  raf()
}

function sensBoost_onclick(event) {
  sensReduce = event.target.value
  sensUpdate()
}

function ble_onclick() {
  if(ble == null) ble = new Ble()
  ble.connect()
}

function set_onclick() {
  window.focus();
	baseTA = instTA;
  raf();
}

function updateInstTA() {
  sensText.innerHTML = instTA_text
}

function toggleFullScreen(element) {
  if(!document.fullscreenElement) {
    element.requestFullscreen()
  } else {
    if(document.exitFullscreen()) {
     document.exitFullscreen() 
    }
  }
}

const bgColor = "#000"
const fgColor = "#FFF" // "#00FA9A" // "#7CFC00" // "#FFF"

let ws
function connectWebSocket() {
  
  ws = new WebSocket(ws_url, ws_protocol)
  
  ws.onmessage = function(event) {     
    function u2r(input) {
      const R0   = 84000 // ohms
      const vMin = 0.0 // volts
      const vMax = 3.211 // volts
      const vDif = vMax - vMin
      return (input < vDif) ? (input * R0) / (vDif - input) : 999999.9;
    }  
    const o = { } 
    o.timeStamp = event.timeStamp
    o.url = 'ws'
    o.data = u2r(event.data / 1000)
    ServerHandler(o) 
  }
  ws.onerror = function(event) { 
    console.log(event) 
    if(ws.connectTimeout) window.clearTimeout(ws.timeout)
    ws.connectTimeout = window.setTimeout(connectWebSocket, 3000)
  }
}


function onload() {
  // load settings
  loadSettings()
  addEventListener('blur', saveSettings)
  
  root = document.documentElement
  root.style.backgroundColor = bgColor
  root.style.color = fgColor

  bleButton = document.getElementById('bleButton');
  bleButton.addEventListener('click', ble_onclick);
    
  canvas = document.getElementById('canvas')
  canvas.context2d = canvas.getContext('2d')
  
  footer = document.getElementById("footer");
  if(footer) {      
    sensDown = document.getElementById("sensDown")
    sensUp   = document.getElementById("sensUp")
    
    sensText = document.getElementById("sensText")
    sensDropdown = document.getElementById("sensDropdown")
    
    sensDown.addEventListener('click', sensDown_onclick)
    sensUp.addEventListener('click', sensUp_onclick)
    
    sensText.addEventListener('click', (evt) => { sensDropdown.classList.toggle("hide"); })
    
    sensMin = document.getElementById("sensMin")
    sensMid = document.getElementById("sensMid")
    sensMax = document.getElementById("sensMax")
    
    sensMin.value = 6100
    sensMid.value =  700
    sensMax.value =  200
    
    sensMin.addEventListener('click', sensBoost_onclick)
    sensMid.addEventListener('click', sensBoost_onclick)
    sensMax.addEventListener('click', sensBoost_onclick)
    
    sensUpdate()
  }
  
  main = document.getElementById('main')
  main.addEventListener('click', set_onclick)
  
  // ENTER key
  let fullscreenElement = document.body
  document.addEventListener('keyup', function(event) { if (event.code === 'Enter') toggleFullScreen(fullscreenElement); }, false)
    
  // SPACE key
  document.addEventListener('keyup', function(event) { if (event.code === 'Space') set_onclick(); }, false)  
  

  // WebSocket
  if (('WebSocket' in window) && (window.WebSocket !== undefined)) connectWebSocket()
  
  //window.addEventListener('resize', onresize(), false)
  onresize()
}

function loadSettings() {
  let ls = window.localStorage
  sensReduce = 1 * ls.getItem('sensReduce')
  if(sensReduce == null) sensReduce = 700
  sensGain   = 1 * ls.getItem('sensGain')
  if(sensGain == null) sensGain = 200
}

function saveSettings() {
  let ls = window.localStorage
  ls.setItem('sensReduce', sensReduce)
  ls.setItem('sensGain', sensGain)
}

function resizeCanvas(canvas) {
  let t = canvas
  let b = false
  if(t.width  !== canvas.clientWidth)  { t.width  =  canvas.clientWidth; b = true; }
  if(t.height !== canvas.clientHeight) { t.height = canvas.clientHeight; b = true; }
  return b
}
  
let meterLen 
let meterMin 
let meterMax 
let gd

let velocityMin = 0
let velocityMax = 0 
let velocityVal = 0

function drawFrame(timeStamp) {
  
  let gain = sensBase * sensGain / sensReduce // 4k * 4 / 7
  // диапазон, который рассматриваем за раз
  // чем больше sens, тем больше увеличение, тем меньший кусочек мы рассматриваем за раз ! не меняется при нажатии set
  const nSet   = 14
  const nCount = 38
  
  meterLen = (maxTA - minTA) / gain
  meterMin = baseTA - ((nCount - nSet) / nCount) * meterLen
  meterMax = baseTA + (nSet / nCount) * meterLen
  
  gd = (instTA - meterMin) / (meterMax - meterMin)
  if(gd <= 0) gd = 0.0
  if(gd >= 1) gd = 1.0
  
  if(needleData.push([instTA, gd]) > needleData.maxLength) needleData.shift()
    
  // resize canvas if needed
  resizeCanvas(canvas)
  // clear canvas
  canvas.width += 0
  
  let ctx, x, y, w, h
  ctx = canvas.getContext('2d')
  x = 0
  y = 0
  w = canvas.width
  h = canvas.height / 2
  
  let o = { ctx, x, y, w, h } 
  drawGauge0(o)
  
  x = 0
  y = o.gaugeHeight
  w = canvas.width
  h = o.gaugeHeight
  let graphOptions = { ctx, x, y, w, h }
  
  drawNeedleGraph( graphOptions )
  
  // auto set if autoset is true
  if((instTA > meterMax) || (instTA < meterMin)) {
    if(autoSet) { set_onclick(); return }
  }
  
}

function drawNeedleGraph(options) {
  let ctx, x, y, w, h
  ({ctx, x, y, w, h} = options)
  ctx.save()
  ctx.setTransform(1,0,0,1,0,0)
  let lineWidth = w / 600
  x += lineWidth
  y += lineWidth
  w -= 2 * lineWidth
  h -= 2 * lineWidth
  ctx.lineWidth = lineWidth * 1.5
  ctx.translate(x, y)
  
  let clipPath = new Path2D()
  clipPath.rect(0, 0, w, h)
  ctx.clip(clipPath)
  
  ctx.beginPath()
  ctx.strokeStyle = fgColor
  let dd = needleData
  for(let i = 0; i < dd.length; i++) {
    let d = dd[i]
    let sy = 1 - d[1]
    if(sy < 0) sy = 0
    if(sy > 1) sy = 1
    let x = i * w / dd.maxLength
    let y = h * sy
    if(i === 0) 
      ctx.moveTo(x,y)
    else
      ctx.lineTo(x,y)
  }
  ctx.stroke()
  ctx.restore()
}

function drawGauge0(options) {
  let ctx = options.ctx
  let a, b, i
  let x, y, w, h
  //let ctx, x, y, w, h
  //({ctx, x, y, w, h} = options)
  ctx.save()
  ctx.setTransform(1,0,0,1,0,0)
  
  const divCount   = 38
  const sweepAngle = 2 * 41.38
  const startAngle = 180 + 90 - sweepAngle / 2
  const endAngle   = 180 + 90 + sweepAngle / 2
  
  let rmax, rmin, p, lineWidth

  //sweepAngle, divCount
  
  ({x, y, w, h} = options)
  lineWidth = w / 300
  w -= lineWidth * 2
  h -= lineWidth * 2
  function calc() {
    rmax = w / 2 / Math.sin(((sweepAngle / 2) * Math.PI / 180))
    p = Math.PI * 2 * rmax * sweepAngle / 360 / divCount
    rmin = rmax - 5.618 * p 
  }
  calc()
  const hmin = rmax - Math.abs((rmin) * Math.sin((180 + 90 - sweepAngle/2) * Math.PI / 180))
  let sf = 1.0
  if(h < hmin) {
    sf = h/hmin
    w *= sf
    lineWidth *= sf
    w -= 2 * lineWidth * (sf - 1)
    h -= 2 * lineWidth * (sf - 1)
    calc()
  }
  options.gaugeHeight = (Math.min(h, hmin)) + sf * (2 * lineWidth)
    
  const fontSize = p
  const rset    = rmax
  const rgauge1 = rmax  - p * .618
  const rgauge2 = rgauge1 - 2 * p
  const rtext   = Math.min(rgauge1, rgauge2) + Math.abs(rgauge1 - rgauge2) / 2
  const rdivs   = rgauge1 - 3 * p
  const rneedle = rgauge1 - 2.5 * p
  
  ctx.fillStyle   = fgColor
  ctx.strokeStyle = fgColor
  ctx.lineWidth   = lineWidth
   
  // draw date.now
  ctx.save()
  ctx.translate(lineWidth, lineWidth)
  ctx.font = fontSize.toFixed(2)* 0.75 + 'px Tahoma'
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'top'
  let timeOptions = { hour12: false, hour: '2-digit', minute: '2-digit' }
  let dateNow = new Date(Date.now())
  let currentTime = dateNow.toLocaleTimeString([], timeOptions) 
  ctx.fillText(currentTime, options.w - 0.2 * p - 2 * lineWidth, 0.25 * p)
  ctx.restore()
  
  x += (options.w - w) / 2
  y += lineWidth

  ctx.translate(x, y)
  
  
  ctx.save()
  ctx.translate(w/2, rmax)
     
  function arad(i) {
    return (startAngle + i / divCount * sweepAngle) * Math.PI/180
  }
  
  function drawGaugeSectorArcs(min, max) {
    ctx.beginPath()
    ctx.arc(0, 0, rgauge1, arad(min), arad(max), false)
    ctx.arc(0, 0, rgauge2, arad(max), arad(min),  true)
    ctx.closePath()
    ctx.stroke()
  }
  
  function drawGaugeSectorLines(list) {
    list.forEach(i => {
      ctx.save()
      ctx.rotate(arad(i))
      ctx.moveTo(rgauge1, 0)
      ctx.lineTo(rgauge2, 0)
      ctx.restore()
    })
    ctx.stroke()
  }
  
  // draw set division line
  ctx.save()
  ctx.rotate(arad(14))
  ctx.moveTo(rset   , 0)
  ctx.lineTo(rgauge2, 0)
  ctx.stroke()
  ctx.restore()
  
  drawGaugeSectorArcs( 0, 11)
  drawGaugeSectorArcs(17, 38)
  
  drawGaugeSectorLines(Array.of(4,6,8,10))        
  drawGaugeSectorLines(Array.of(18,20,22,24,28,30,32,34))
  
  // l-shaped markers
  ctx.save()
  ctx.beginPath()
  for(i = 0; i <= divCount; i++) {
    ctx.save()
    a = arad(i)
    b = rdivs
    ctx.rotate(a)
    ctx.translate(b, 0)
    ctx.moveTo(p/2, 0);
    ctx.lineTo(  0, 0);
    switch(i) {
      case(0):
      ctx.lineTo(0, +p/4)
      break
      case(divCount):
      ctx.lineTo(0, -p/4)
      break
      default:
      ctx.moveTo(0, -p/4);
      ctx.lineTo(0, +p/4);  
    }
    ctx.restore()
  }
  ctx.stroke()
  ctx.restore()
   
  // gauge text
  function drawGaugeText(text, n) {
    let m = ctx.measureText(text)
    ctx.save()
    let a = (startAngle + n/divCount * sweepAngle) * Math.PI / 180
    let r = rtext
    ctx.translate(r * Math.cos(a), r * Math.sin(a))
    ctx.rotate(a + Math.PI/2)
    let h = Math.abs(rgauge1 - rgauge2) * 0.618
    let w = Math.abs(m.actualBoundingBoxLeft) + Math.abs(m.actualBoundingBoxRight)
    ctx.clearRect(-w/2, -h/2, w, h)
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }
  ctx.save()
  ctx.font = fontSize.toFixed(2) + 'px Tahoma'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  drawGaugeText("RAISE",  2)
  drawGaugeText("SET"  , 14)
  drawGaugeText("FALL" , 26)
  drawGaugeText("TEST" , 36)
  ctx.restore()

  // draw arrow angle
  function drawArrow(angle) {
    let a = (angle) * Math.PI / 180
    let r = rneedle
    let w =  1.5 * p
    let h = 0.5 * w
    
    ctx.save()
    ctx.rotate(a)
    // needle with hand and cap
    function arrowPath(options = {}) {
      let al, ah, hl, hh;
      ({ arrowLength: al = 1.5 * p, arrowHeight: ah = 0.5 * al, handHeight: hh = 0.10, handLength : hl = rmax } = options)
      
      let ap = new Path2D
      // needla arm 1st part
      ap.moveTo(al * 1.00, +0.000 * ah)
      ap.lineTo(al * 0.25, +0.500 * ah)
      ap.lineTo(al * 0.00, +0.225 * ah)
      // needle hand
      ap.lineTo(al * 0.00, +ah * (0.225 - hh))
      ap.lineTo(al - hl,   +ah * (0.225 - hh))
      ap.lineTo(al - hl,   -ah * (0.225 - hh))
      ap.lineTo(al * 0.00, -ah * (0.225 - hh))
      // needle cap 2nd part
      ap.lineTo(al * 0.00, -ah * 0.225)
      ap.lineTo(al * 0.25, -ah * 0.500)
      ap.closePath()
      return ap
    }
      
    ctx.translate(r - w, 0)
    ctx.fill(arrowPath({ handLength: rdivs }))
    ctx.lineWidth = 0.618
    ctx.strokeStyle = bgColor
    ctx.restore()    
    
    // point of origin circle 
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = fgColor
    ctx.arc(0, 0, p/2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  drawArrow(startAngle + sweepAngle * (1 - gd))
  
  // draw instTA
  ctx.save()
  ctx.font = fontSize.toFixed(2)* 1.25 + 'px Tahoma'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(instTA_text, 0, -(rmin))
  ctx.restore()
  
  // initial restore
  ctx.restore()
}

function startTime() {
  const today = new Date();
  let h = today.getHours();
  let m = today.getMinutes();
  let s = today.getSeconds();
  document.getElementById('txt').innerHTML =  h + ":" + m + ":" + s;
  setTimeout(startTime, 1000);
}

function sensUp_onclick() {
  let a = sensGain
  if      (a <  100) a +=  10
  else if (a <  500) a +=  50
  else if (a < 1600) a += 100
  else               a += 200
  if(a <   10) a =   10
  if(a > 3200) a = 3200
  sensGain = a
  sensUpdate()
}

function sensDown_onclick() {
  let a = sensGain
  if      (a <=  100) a -=  10
  else if (a <=  500) a -=  50
  else if (a <= 1600) a -= 100
  else                a -= 200
  if(a <   10) a =   10
  if(a > 3200) a = 3200
  sensGain = a
  sensUpdate()
}

function sensUpdate() {
  [sensMin, sensMid, sensMax].forEach( a => { a.style.borderColor = (a.value == sensReduce) ? fgColor : null; } )
  sensText.innerHTML = (sensGain / 100).toFixed(1)  
}

function drawArrow(canvas) {
  let context = canvas.context2d
  let w = canvas.width
  let h = canvas.height
  let ox = w / 2
  let oy = h / 2
  let radius = ((w > h) ? h : w) / 2
 
  let sensitivity = startAngle * sensGain / sensReduce 

  let angle = sensitivity * (baseTA - instTA) / (maxTA - minTA)
  
  if(angle > gaugeMax) {
    angle = gaugeMax
    set_onclick()
    return
  }
  
  if(angle < gaugeMin) {
    angle = gaugeMin
    set_onclick()
    return
  }
  
  //moveTo , lineTo
  
  let x = w * (angle - gaugeMin) / (gaugeMax- gaugeMin)
  context.strokeStyle = fgColor
  context.lineWidth = 2
  context.moveTo(x, 0)
  context.lineTo(x, h)
  context.stroke()
}

function drawInstTA(canvas) {
  let ctx = canvas.context2d  
  let w = canvas.width
  let h = canvas.height
  let ox = w / 2
  let oy = h / 2
  let radius = ((w > h) ? h : w) / 2
  
  let text = instTA_text + " " + deltaTA_text
  
  ctx.font = 'bold 14pt Tahoma';
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = fgColor
  ctx.fillText(text,ox, oy);
}

function drawGauge180(canvas) {
  let w = canvas.width
  let h = canvas.height
  let context = canvas.context2d
  
  let divCount = 40
  let divSet = 15
  let divLen = 10 * h / 100 // 10%
  
  let padding = 10
  
  context.save()
  w -= padding
  h -= padding
  context.translate(padding/2, padding/2)
  
  context.lineWidth = 2
  context.beginPath()
  for(let i = 0; i <= divCount; i++) {
    let x = i * w / divCount
    context.beginPath()
    context.strokeStyle = (i % 2) ? '#7F7F7F' : '#CCCCCC'
    context.moveTo(x, 0)
    context.lineTo(x, divLen)
    context.moveTo(x, h)
    context.lineTo(x, h - divLen)
    context.stroke()
  }
  context.restore()
}

function drawGauge(canvas) {
  let w = canvas.width
  let h = canvas.height
  let ox = w / 2
  let oy = h / 2 
  let radius = ((w > h) ? h : w) / 2
  let context = canvas.context2d
  context.beginPath()
  context.arc(ox, oy, radius, 2 * Math.PI, false)
  context.stroke()
}

function arrayMin(arr) {
  return arr.reduce(function (p, v) {
    return ( p < v ? p : v );
  });
}

function arrayMax(arr) {
  return arr.reduce(function (p, v) {
    return ( p > v ? p : v );
  });
}


function r2ta(input) {
	/*
  input in OHMS
	PC = 21250*(TA - 0.941)/(6.5 - TA)
	TA = PC/(PC + 21250)*(6.5 - .941) + .941 
  TA   PC
  .941 0  
	1.0  227
	2.0  5k
	3.0  12.5k
	4.0  26k
	5.0  57.5k
	6.0  215k
	6.5  infinity
	*/ 
  return (input >= 999999) ? maxTA : input / (input + 21250) * (maxTA - minTA) + minTA;
}

function ta2r(input) {
  /*
  input in TA
  minTA = 0.941
  maxTA = 6.5
	PC = 21250 * (TA - minTA) / (maxTA - TA)
	TA = PC / (PC + 21250) * (maxTA - minTA) + minTA 
  TA   PC
	.941 0
  1.0  227
	2.0  5k
	3.0  12.5k
	4.0  26k
	5.0  57.5k
	6.0  215k
	6.5  infinity
	*/
  return 21250 * (input - minTA) / (maxTA - input) 
}

function onresize() {
  //canvas.style.width  = 
  //canvas.style.height = 
  
  // footer
  // remainder is canvas.height
  
  // two canvas (one for graph, one for gauge)
  // OR
  // one canvas with 2 regions -> the better
  // background-canvas
  // foreground canvas
  
  //  To actually set this as the background, you can take advantage of the canvas element's toDataURL method which will create an image from your canvas, which you can set as the //src of an image or a background:

  //const bgCanvas = document.createElement('canvas')  
  let h = (window.innerHeight - (footer.clientHeight))
  canvas.style.width  = window.innerWidth + 'px'
  canvas.style.height = 1 * h + 'px'
  raf()
}

window.raf = () => { window.requestAnimationFrame(drawFrame) }
window.addEventListener('load', onload, false)
window.addEventListener('resize', () => { if(window.resizeTimeout) clearTimeout(window.resizeTimeout); window.resizeTimeout = setTimeout(onresize, 200) }, false )