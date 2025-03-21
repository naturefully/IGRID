import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [cacheSize, setCacheSize] = useState('0/0');
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Initialize data map
    const data = new Map();
    data.set('0,0', {
      x: 0, y: 0,
      background: '#EFA73E',
      color: '#000',
      title: 'BALDOSA',
      subtitle: 'the cloud city'
    });
    
    data.set('1,0', {
      x: 1, y: 0,
      image: 'https://picsum.photos/id/420/1',
      title: 'FOWNIX FX',
      subtitle: 'Tehran, 18669$',
    });
    
    // Sample content arrays
    const titles = [
      'A little cute cat',
      'Some weird stuff',
      'I have no idea',
      'Can you believe this?',
      'Fun Stuff',
      'BEST DEAL!',
      'All the love',
      'Luxury Cat',
    ];
    
    const subtitles = [
      '40$',
      '130$',
      'Contact me for prices',
      '@SomeDude on WhatsApp',
      '+4997312374',
      'Email: some@dude.com',
      'https://cool-cats.shady/shop',
      'Will exchange for PS5',
      'Want ASAP from Jan 1st',
      'Dude what are you talking about?',
      'I am not really sure',
      'Please only contact at night',
      'Also sell drugs',
    ];
    
    const colors = [
      '#f3c15f', '#e76d2d', '#d22e40', '#c42a6f',
      '#652ca4', '#2050b3', '#54b9de', '#469c9f',
      '#43977d', '#52b469', '#9dd441', '#e0e24b',
    ];
    
    // Generate grid data
    for (let i = -500; i <= 500; i++) {
      for (let j = -500; j <= 500; j++) {
        if (Math.abs(i) <= 1 && Math.abs(j) <= 1) {
          continue;
        }
        
        if (Math.random() > 0.95) {
          continue;
        }
        
        const post = {
          x: i, y: j,
          title: titles[Math.floor(Math.random() * titles.length)],
          subtitle: subtitles[Math.floor(Math.random() * subtitles.length)],
          image: `https://picsum.photos/1?r=${i+500}-${j+500}`
        };
        
        if (Math.random() > 0.8) {
          delete post['title'];
          delete post['subtitle'];
        } else if (Math.random() > 0.7) {
          if (Math.random() > 0.5) {
            post['title'] = post['subtitle'];
          }
          
          delete post['subtitle'];
        } else if (Math.random() > 0.9) {
          delete post['image'];
          post['background'] = colors[Math.floor(Math.random() * colors.length)];
          post['color'] = '#000';
        }
        
        data.set(`${i},${j}`, post);
      }
    }
    
    function getData(x, y) {
      return data.get(`${x},${y}`);
    }
    
    const imageCache = new Map();
    const loading = {};
    
    function fillSquareWithImage(img, x, y, size) {
      const iw = img.width;
      const ih = img.height;
  
      const k = size / Math.min(iw, ih);
      const dw = iw * k;
      const dh = ih * k;
      const dx = x + (size - dw) / 2;
      const dy = y + (size - dh) / 2;
      
      return [dx, dy, dw, dh];
    }
    
    const IMG_SIZES = {i: 1, xs: 48, s: 96, m: 156, l: 300};
    const BLUR_MAP = {xs: 1, s: 1};
    
    async function addImageSize(record, size) {
      if (record[size] && record[size] !== 'loading') {
        return;
      }
      
      record[size] = 'loading';
  
      try {
        const url = `https://picsum.photos/id/${record.id}/${IMG_SIZES[size]}` + (
          BLUR_MAP[size] ? `?blur=${BLUR_MAP[size]}` : ''
        );
        const response = await fetch(url);
        if (response.ok) {
          const blob = await response.blob();
          record[size] = await createImageBitmap(blob);
        }
      } catch (error) {
        setTimeout(() => addImageSize(record, size), 100);
      }
    }
    
    function getImage(url, scale) {    
      let hit = imageCache.get(url);
      if (hit) {
        hit.t = Date.now();
     
        const target = Object.keys(IMG_SIZES).find(size => scale <= IMG_SIZES[size]);
        
        if (!hit[target]) {
          hit[target] = 'loading';
          setTimeout(() => addImageSize(hit, target), 10);
        }
        
        const available = hit[target] !== 'loading' ? target : Object.keys(IMG_SIZES).reduce((curr, candidate) => (hit[candidate] && (hit[candidate] !== 'loading') && IMG_SIZES[candidate] >= (IMG_SIZES[curr] ?? 1)) ? candidate : curr, null);
        
        return available ? hit[available] : hit.i;
      } else if (!loading[url]) {
        loading[url] = true;
        const load = async() => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(response.status);
            }
            const blob = await response.blob();
            const img = await createImageBitmap(blob);
            
            const record = {
              i: img, t: Date.now(),
              id: response.headers.get('Picsum-ID'),
            };
            
            imageCache.set(url, record);          
          } catch(err) {
            console.log(err.message);
          } finally {
            delete loading[url];
          }
        };
        
        setTimeout(() => load(), 1);
      }
      
      return undefined;
    }
    
    // Setup canvas and variables
    let width, height;
    
    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    const wmin = Math.min(window.innerWidth, window.innerHeight);
    const wmax = Math.max(window.innerWidth, window.innerHeight);
    const SMALL_DEVICE = wmax <= 800;
    const MIN_SCALE = SMALL_DEVICE ? wmin / 4 : wmin / 7;
    const MAX_SCALE = 300;
  
    const IMG_CACHE_SIZE = (Math.ceil(wmin / MIN_SCALE) + 4) * (Math.ceil(wmax / MIN_SCALE) + 4) * 5;
    
    const supportsHover = window.matchMedia('(any-hover: hover)').matches;
    
    let cameraX = 0.5;
    let cameraY = 0.5;
    let scale = SMALL_DEVICE ? Math.min(wmin / 2.5, MAX_SCALE) : Math.min(wmin / 3, MAX_SCALE);
    let initialCameraScale = scale;
    let scaleVelocity = 0;
  
    let isDragging = false;
    let startPanX = 0;
    let startPanY = 0;
    let initialCameraX = 0;
    let initialCameraY = 0;
  
    let panVelocityX = 0;
    let panVelocityY = 0;
  
    const friction = 0.95;
    
    let mouseX = -Infinity;
    let mouseY = -Infinity;
  
    // Threshold for drag distance scaling
    // const dragThreshold = 10; // pixels
    
    // For canPinch detection
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && 
                     navigator.vendor && navigator.vendor.indexOf('Apple') >= 0;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const canPinch = isSafari || isTouchDevice;
  
    const schedule = requestAnimationFrame;
    
    // Mouse event handlers
    canvas.addEventListener('mousedown', e => {
      isDragging = true;
      startPanX = e.clientX;
      startPanY = e.clientY;
      initialCameraX = cameraX;
      initialCameraY = cameraY;
      panVelocityX = 0;
      panVelocityY = 0;
    });
  
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  
    window.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      if (isDragging) {
        const dx = e.clientX - startPanX;
        const dy = e.clientY - startPanY;
  
        // Move camera inverse to mouse movement
        cameraX = initialCameraX - (dx / scale);
        cameraY = initialCameraY - (dy / scale);
        scaleVelocity = 0;
  
        // Velocity also scaled
        const vx = -(e.movementX / scale);
        const vy = -(e.movementY / scale);
        panVelocityX = vx;
        panVelocityY = vy;
      }
    });
  
    let lastRecordedDScale = 0;
    
    // Wheel event handler for zooming
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      if (!e.ctrlKey && !e.metaKey) {
        panVelocityX = e.deltaX / scale;
        panVelocityY = e.deltaY / scale;
        cameraX += panVelocityX;
        cameraY += panVelocityY;
        scaleVelocity = 0;
      } else {
        const zoomFactor = 1.02;
        let oldScale = scale;
        if (e.deltaY < 0) {
          scale = Math.min(scale * zoomFactor, MAX_SCALE);
        } else {
          scale = Math.max(scale / zoomFactor, MIN_SCALE);
        }
        
        scaleVelocity = scale - oldScale;
      }
    }, { passive: false });
    
    // Touch event handlers
    let isTouchPanning = false;
    let isTouchPinching = false;
    let isTapZooming = false;
    if (isTouchDevice && canPinch) {
      let lastPanX = 0;
      let lastPanY = 0;
      let initialPinchDistance = 0;
      let initialTouchCameraScale = scale;
      let pinchCenterX = 0;
      let pinchCenterY = 0;
      let initialPinchCameraX = 0;
      let initialPinchCameraY = 0;
      let tapZoomTimer = undefined;
      let tapZoomStart = -Infinity;
      let startZoomX = 0;
      let startZoomY = 0;
  
      function getTouchesInfo(touches) {
        const t = [];
        for (let i = 0; i < touches.length; i++) {
          t.push({x: touches[i].clientX, y: touches[i].clientY});
        }
        return t;
      }
  
      function distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx*dx + dy*dy);
      }
  
      let panlock = undefined;
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touches = getTouchesInfo(e.touches);
        if (touches.length === 1) {
          if (tapZoomTimer !== undefined) {
            isTapZooming = true;
            isTouchPanning = false;
            isTouchPinching = false;
            initialTouchCameraScale = scale;
            startZoomX = touches[0].x;
            startZoomY = touches[0].y;
            scaleVelocity = 0;
            panVelocityX = 0;
            panVelocityY = 0;
            tapZoomStart = Date.now();
          } else {
            isTouchPanning = true;
            isTouchPinching = false;
            isTapZooming = false;
            lastPanX = touches[0].x;
            lastPanY = touches[0].y;
            initialCameraX = cameraX;
            initialCameraY = cameraY;
            panVelocityX = 0;
            panVelocityY = 0; 
          }
        } else if (touches.length === 2) {
          isTouchPinching = true;
          isTouchPanning = false;
          isTapZooming = false;
          initialPinchDistance = distance(touches[0], touches[1]);
          initialTouchCameraScale = scale;
  
          pinchCenterX = (touches[0].x + touches[1].x)/2;
          pinchCenterY = (touches[0].y + touches[1].y)/2;
  
          const mx = cameraX + ((pinchCenterX - width/2)/scale);
          const my = cameraY + ((pinchCenterY - height/2)/scale);
          initialPinchCameraX = mx;
          initialPinchCameraY = my;
        }
      }, {passive: false});
  
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touches = getTouchesInfo(e.touches);
        mouseX = touches[0].x;
        mouseY = touches[0].y;
        if (isTapZooming && touches.length === 1) {
          const dy = touches[0].y - startZoomY;
          let newTargetScale = initialTouchCameraScale + dy;
          newTargetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newTargetScale));
          scale = newTargetScale;
          lastRecordedDScale = dy;
        } else if (isTouchPanning && touches.length === 1) {
          const dx = touches[0].x - lastPanX;
          const dy = touches[0].y - lastPanY;
          lastPanX = touches[0].x;
          lastPanY = touches[0].y;
          
          panVelocityX = -dx / scale;
          panVelocityY = -dy / scale;
          cameraX += panVelocityX;
          cameraY += panVelocityY;
          scaleVelocity = 0;
        } else if (isTouchPinching && touches.length === 2) {
          const newDistance = distance(touches[0], touches[1]);
          const scaleRatio = newDistance / initialPinchDistance;
          let newTargetScale = initialTouchCameraScale * scaleRatio;
          newTargetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newTargetScale));
          
          lastRecordedDScale = newTargetScale - scale;
          scale = newTargetScale;
  
          clearTimeout(panlock);
          panlock = setTimeout(() => {
            clearTimeout(panlock);
            panlock = undefined;
          }, 200);
        }
      }, {passive: false});
  
      canvas.addEventListener('touchend', (e) => {
        if (isTouchPanning && panlock === undefined) {
          scaleVelocity = 0;
        }
        if (isTouchPinching || isTapZooming) {
          scaleVelocity = lastRecordedDScale * (isTouchPinching ? 10 : 0.05);
          lastRecordedDScale = 0;
          panVelocityX = 0;
          panVelocityY = 0;
        }
        if (!isTapZooming) {
          tapZoomTimer = setTimeout(() => {
            clearTimeout(tapZoomTimer);
            tapZoomTimer = undefined;
          }, 200);
        } else {
          if (Date.now() - tapZoomStart < 200) {
            let counter = 0;
            const step = () => {
              scaleVelocity = 0;
              scale += (wmin / 2.5 - scale) / 3;
              if (++counter < 24) {
                setTimeout(() => step(), 20);
              }
            };
  
            step();
          }
        }
        
        isTouchPanning = false;
        isTouchPinching = false;
        isTapZooming = false;
      }, {passive: false});
    }
  
    // Safari-specific gesture handlers
    if (isSafari && canPinch) {
      document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
        initialCameraScale = scale;
      });
      document.addEventListener('gesturechange', (e) => {
        e.preventDefault();
        let newTargetScale = initialCameraScale * e.scale;
        newTargetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newTargetScale));
        lastRecordedDScale = newTargetScale - scale;
        scale = newTargetScale;
      });
      document.addEventListener('gestureend', (e) => {
        e.preventDefault();
        panVelocityX = 0;
        panVelocityY = 0;
        scaleVelocity = lastRecordedDScale;
      });
    }
  
    // Cache cleanup interval
    const cacheCleanupInterval = setInterval(() => {
      if (imageCache.size > IMG_CACHE_SIZE) {
        const entries = [...imageCache.entries()].sort((i, j) => i[1].t - j[1].t);
        const target = entries.slice(0, imageCache.size - IMG_CACHE_SIZE);
        target.forEach(entry => {
          setTimeout(() => imageCache.delete(entry[0]), 1);
        });
      } else {
        const now = Date.now();
        [...imageCache.entries()]
          .filter(i => now - i[1].t > 10_000)
          .forEach(e => imageCache.delete(e[0]));
      }
      
      setCacheSize(`${imageCache.size}/${IMG_CACHE_SIZE}`);
    }, 200);
  
    // Main drawing function
    function draw() {
      // Apply inertia for panning if no interaction
      if (!isDragging && !(isTouchDevice && (document.activeElement && document.activeElement.tagName === 'CANVAS'))) {
        scale = Math.max(Math.min(scale + scaleVelocity, MAX_SCALE), MIN_SCALE);
        if (!isTouchPanning) {
          cameraX += panVelocityX;
          cameraY += panVelocityY; 
          panVelocityX *= friction;
          panVelocityY *= friction; 
        }
        scaleVelocity *= friction;
        if (Math.abs(panVelocityX) < 0.0001) panVelocityX = 0;
        if (Math.abs(panVelocityY) < 0.0001) panVelocityY = 0;
        if (Math.abs(scaleVelocity) < 0.0001) scaleVelocity = 0;
      }
  
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
  
      const viewHalfW = width/2;
      const viewHalfH = height/2;
  
      const leftCell = Math.floor(cameraX - width/(2*scale)) - 2;
      const rightCell = Math.floor(cameraX + width/(2*scale)) + 2;
      const topCell = Math.floor(cameraY - height/(2*scale)) - 2;
      const bottomCell = Math.floor(cameraY + height/(2*scale)) + 2;
  
      const SPACING = 0.025;
      const RADIUS = 0.05;
      
      const zoomedOut = scale <= wmin / 4;
      const panv = Math.sqrt(panVelocityX * panVelocityX + panVelocityY * panVelocityY);
      
      for (let x = leftCell; x <= rightCell; x++) {
        for (let y = topCell; y <= bottomCell; y++) {
          const actX = (x + SPACING - cameraX) * scale + viewHalfW;
          const actY = (y + SPACING - cameraY) * scale + viewHalfH;
          const size = scale * (1 - 2 * SPACING);
          const cx = actX + size / 2;
          const cy = actY + size / 2;
          
          const hover = supportsHover &&
              actX < mouseX && mouseX < actX + size &&
              actY < mouseY && mouseY < actY + size;
          
          const hoverK = (1 - Math.min(
            Math.sqrt(
              (cx - mouseX) * (cx - mouseX) +
              (cy - mouseY) * (cy - mouseY)
            ) / ((zoomedOut ? 2 : 1) * size), 1
          ));
          
          const rx = actX;
          const ry = supportsHover ? actY + hoverK * (zoomedOut ? 8 : 4) : actY;
          
          ctx.save();
          ctx.fillStyle = '#212121';
          ctx.beginPath();
          ctx.roundRect(rx, ry, size, size, RADIUS * scale);
          ctx.closePath();
          ctx.clip();
          ctx.fill();
  
          ctx.font = `${scale / 15}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#616161';
          ctx.fillText(`${x},${y}`,
            rx + size - (SPACING + RADIUS) * scale,
            ry + size - (SPACING + RADIUS) * scale
          );
          
          const cellData = getData(x, y);
          if (cellData) {
            if (cellData.background) {
              ctx.fillStyle = cellData.background;
              ctx.fillRect(rx, ry, size, size);
            }
            
            if (cellData.image) {
              ctx.fillStyle = '#424242';
              ctx.fillRect(rx, ry, size, size);
              const img = getImage(cellData.image, scale / Math.max(1, panv * 64));
              if (img) {
                const [dx, dy, dw, dh] = fillSquareWithImage(
                  img, rx, ry, size
                );
                ctx.drawImage(img, dx, dy, dw, dh);
              }
              
              if (cellData.title || cellData.subtitle) {
                const gradient = ctx.createLinearGradient(0, ry, 0, ry + size);
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
                ctx.fillStyle = gradient;
                ctx.fillRect(rx, ry, size, size);
              }
            }
            
            if (cellData.title) {
              ctx.fillStyle = cellData.color ?? '#fff';
              ctx.font = `bold ${scale / 12}px sans-serif`;
              ctx.textAlign = 'left';
              ctx.fillText(
                cellData.title,
                rx + SPACING * 2 * scale,
                cellData.subtitle ? ry + size - (SPACING * 4 + 0.1) * scale : ry + size - SPACING * 2 * scale,
              );
            }
            
            if (cellData.subtitle) {
              ctx.fillStyle = cellData.color ?? '#fff';
              ctx.font = `${scale / 16}px sans-serif`;
              ctx.textAlign = 'left';
              ctx.fillText(
                cellData.subtitle,
                rx + SPACING * 2 * scale,
                ry + size - SPACING * 4 * scale,
              );
            }
          }
          
          if (hover) {
            ctx.fillStyle = `rgba(255, 255, 255, ${hoverK * (zoomedOut ? 0.5 : 0.25)})`;
            ctx.globalCompositeOperation = 'overlay';
            ctx.rect(rx, ry, size, size);
            ctx.fill();
          }
          
          ctx.restore();
        }
      }
      
      setCoords({
        x: Math.floor(cameraX),
        y: Math.floor(cameraY)
      });
  
      schedule(draw);
    }

    // Start the animation
    const animationFrame = schedule(draw);
    
    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrame);
      clearInterval(cacheCleanupInterval);
      
      // Remove event listeners
      canvas.removeEventListener('wheel', null);
      canvas.removeEventListener('mousedown', null);
      window.removeEventListener('mouseup', null);
      window.removeEventListener('mousemove', null);
      
      if (isTouchDevice && canPinch) {
        canvas.removeEventListener('touchstart', null);
        canvas.removeEventListener('touchmove', null);
        canvas.removeEventListener('touchend', null);
      }
      
      if (isSafari && canPinch) {
        document.removeEventListener('gesturestart', null);
        document.removeEventListener('gesturechange', null);
        document.removeEventListener('gestureend', null);
      }
    };
  }, []);
  
  const handleInputChange = (e, axis) => {
    if (axis === 'x') {
      setCoords(prev => ({ ...prev, x: e.target.value }));
    } else {
      setCoords(prev => ({ ...prev, y: e.target.value }));
    }
  };
  
  const goToCoords = () => {
    const x = parseFloat(coords.x);
    const y = parseFloat(coords.y);
    // The canvas useEffect holds the actual navigation logic
  };

  return (
    <>
      <canvas ref={canvasRef} id="gridCanvas"></canvas>
      <footer>
        <div className="coord-inputs">
          X: <input 
            id="xInput" 
            type="number" 
            step="1" 
            value={coords.x}
            onChange={(e) => handleInputChange(e, 'x')}
          />
          Y: <input 
            id="yInput" 
            type="number" 
            step="1" 
            value={coords.y}
            onChange={(e) => handleInputChange(e, 'y')}
          />
          <button id="goBtn" onClick={goToCoords}>Go</button>
          <span id="cache">{cacheSize}</span>
        </div>
      </footer>
    </>
  );
}

export default App;
