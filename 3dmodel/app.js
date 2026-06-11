/**
 * Main application coordinator, UI logic, EKG loop, and Quiz engine
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. INITIALIZE 3D VISUALIZER
    const visualizer = new Heart3DVisualizer('canvas-container');

    // 2. UI CONTROLS BINDING
    const btnPlayPause = document.getElementById('btn-play-pause');
    const sliderSpeed = document.getElementById('slider-speed');
    const labelBpm = document.getElementById('label-bpm');
    const footerBpm = document.getElementById('footer-bpm');
    const btnResetView = document.getElementById('btn-reset-view');
    const sliderLightness = document.getElementById('slider-lightness');
    const labelModeBtns = document.querySelectorAll('.label-mode-btn');

    // Toggle Beating (Play / Pause)
    if (btnPlayPause) {
        btnPlayPause.addEventListener('click', () => {
            const isBeating = !visualizer.isBeating;
            visualizer.setBeating(isBeating);
            btnPlayPause.classList.toggle('active', isBeating);
            
            const icon = btnPlayPause.querySelector('i');
            if (isBeating) {
                icon.className = 'fa-solid fa-pause';
                btnPlayPause.querySelector('span').textContent = 'Pulsing';
            } else {
                icon.className = 'fa-solid fa-play';
                btnPlayPause.querySelector('span').textContent = 'Static';
                const phaseEl = document.getElementById('footer-phase');
                const pressureEl = document.getElementById('footer-pressure');
                if (phaseEl) phaseEl.textContent = "Static Pause";
                if (pressureEl) pressureEl.textContent = "N/A";
            }
        });
    }

    // BPM Heart Rate Slider Control
    if (sliderSpeed) {
        sliderSpeed.addEventListener('input', (e) => {
            const bpmVal = parseInt(e.target.value);
            visualizer.setBpm(bpmVal);
            if (labelBpm) labelBpm.textContent = `${bpmVal} BPM`;
            if (footerBpm) footerBpm.innerHTML = `${bpmVal} <span class="stat-unit">BPM</span>`;
        });
    }

    // Label Mode Toggle Group (Show / Dot Only / Hide)
    labelModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            visualizer.setLabelsMode(mode);
            // Update active state on all buttons
            labelModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Adjust scene brightness
    if (sliderLightness) {
        sliderLightness.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (visualizer.ambientLight) visualizer.ambientLight.intensity = val;
            if (visualizer.dirLight) visualizer.dirLight.intensity = val * 1.2;
        });
    }

    // Reset View button
    if (btnResetView) {
        btnResetView.addEventListener('click', () => {
            visualizer.resetView();
        });
    }

    // Toggle Blood Path visibility
    const btnToggleBloodPath = document.getElementById('btn-toggle-blood-path');
    if (btnToggleBloodPath) {
        btnToggleBloodPath.addEventListener('click', () => {
            const isCurrentlyVisible = visualizer.isBloodPathVisible();
            const newVisibility = !isCurrentlyVisible;
            visualizer.toggleBloodPath(newVisibility);
            btnToggleBloodPath.classList.toggle('active', newVisibility);
            
            // Update button text/icon feedback
            const icon = btnToggleBloodPath.querySelector('i');
            const span = btnToggleBloodPath.querySelector('span');
            if (newVisibility) {
                icon.className = 'fa-solid fa-droplet';
                span.textContent = 'Blood Path';
            } else {
                icon.className = 'fa-solid fa-droplet-slash';
                span.textContent = 'Blood Path Hidden';
            }
        });
    }


    // 3. TABS NAVIGATION
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            // Clean slate pathway/highlights depending on tab
            visualizer.resetHighlights();
            
            if (tabId === 'anatomy') {
                showAnatomyPlaceholder();
            }
        });
    });


    // 4. ANATOMY EXPLORER LOGIC
    const anatomyPlaceholder = document.getElementById('anatomy-placeholder');
    const anatomyDetails = document.getElementById('anatomy-details');
    const btnBackToList = document.getElementById('btn-back-to-list');

    // DYNAMIC UI GENERATION
    const anatomicalListGrid = document.getElementById('anatomical-list-grid');
    const labelPartSelect = document.getElementById('label-part-select');
    const labelPositionPartSelect = document.getElementById('label-position-part-select');
    
    // Clear static options if any exist
    if (labelPartSelect) labelPartSelect.innerHTML = '';
    if (labelPositionPartSelect) labelPositionPartSelect.innerHTML = '<option value="">-- Select a part --</option>';
    if (anatomicalListGrid) anatomicalListGrid.innerHTML = '';

    let index = 1;
    Object.keys(heartPartsData).forEach(partKey => {
        const partData = heartPartsData[partKey];
        
        // 1. Create button for Anatomy Explorer
        if (anatomicalListGrid) {
            const btn = document.createElement('button');
            btn.className = 'anatomy-list-item';
            btn.setAttribute('data-part', partKey);
            btn.textContent = `${index}. ${partData.name}`;
            btn.addEventListener('click', () => {
                visualizer.selectPart(partKey);
                visualizer.focusCameraOn(partKey);
                showAnatomyDetails(partKey); // Open details immediately
            });
            anatomicalListGrid.appendChild(btn);
        }
        
        // 2. Create option for Label Adjustment
        if (labelPartSelect) {
            const opt = document.createElement('option');
            opt.value = partKey;
            opt.textContent = partData.name;
            labelPartSelect.appendChild(opt);
        }
        
        // 3. Create option for Label Positioning
        if (labelPositionPartSelect) {
            const opt2 = document.createElement('option');
            opt2.value = partKey;
            opt2.textContent = partData.name;
            labelPositionPartSelect.appendChild(opt2);
        }
        
        index++;
    });

    btnBackToList.addEventListener('click', () => {
        visualizer.resetView();
        showAnatomyPlaceholder();
    });

    // Callback when clicking 3D model part directly
    visualizer.onPartSelected = (partKey) => {
        showAnatomyDetails(partKey);
    };

    function showAnatomyPlaceholder() {
        anatomyPlaceholder.classList.remove('hidden');
        anatomyDetails.classList.add('hidden');
    }

    function showAnatomyDetails(partKey) {
        const partData = heartPartsData[partKey];
        if (!partData) return;

        anatomyPlaceholder.classList.add('hidden');
        anatomyDetails.classList.remove('hidden');

        // Populate fields
        document.getElementById('part-name').textContent = partData.name;
        document.getElementById('part-pronunciation').textContent = partData.pronunciation;
        document.getElementById('part-description').textContent = partData.description;
        document.getElementById('part-function').textContent = partData.function;
        document.getElementById('part-clinical').textContent = partData.clinical;

        // Set oxygenation badge
        const badge = document.getElementById('part-oxygen-badge');
        if (partData.oxygenated) {
            badge.textContent = "Oxygenated Blood";
            badge.className = "badge badge-accent";
        } else {
            badge.textContent = "Deoxygenated Blood";
            badge.className = "badge badge-primary";
        }

        // Display component position coordinates
        const positionSection = document.getElementById('part-position-section');
        if (positionSection) {
            const position = visualizer.getComponentPosition(partKey);
            document.getElementById('part-pos-x').textContent = position.x.toFixed(2);
            document.getElementById('part-pos-y').textContent = position.y.toFixed(2);
            document.getElementById('part-pos-z').textContent = position.z.toFixed(2);
            positionSection.style.display = 'block';
        }
    }



    // 6. BIND INTERACTIVE PROJECTED LABELS CLICK EVENTS
    document.querySelectorAll('.anatomy-label').forEach(label => {
        const card = label.querySelector('.label-card');
        if (card) {
            card.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop click from triggering orbit controls or 3D raycasting
                const partKey = label.getAttribute('data-part');
                visualizer.selectPart(partKey);
                visualizer.focusCameraOn(partKey);
            });
        }
    });

    // 7. LABEL/MANUAL PATH CONTROLS
    const manualControlCard = document.getElementById('manual-control-card');
    const btnToggleManualControls = document.getElementById('btn-toggle-manual-controls');

    if (btnToggleManualControls && manualControlCard) {
        btnToggleManualControls.addEventListener('click', () => {
            const isHidden = manualControlCard.style.display === 'none';
            manualControlCard.style.display = isHidden ? 'block' : 'none';
            btnToggleManualControls.innerHTML = isHidden 
                ? '<i class="fa-solid fa-sliders"></i> Hide Developer Controls' 
                : '<i class="fa-solid fa-sliders"></i> Show Developer Controls';
        });
    }

    // labelPartSelect and labelPositionPartSelect are already defined above
    const offsetXInput = document.getElementById('offset-x-input');
    const offsetYInput = document.getElementById('offset-y-input');
    const offsetZInput = document.getElementById('offset-z-input');
    const btnApplyLabelOffset = document.getElementById('btn-apply-label-offset');
    const btnResetLabelOffset = document.getElementById('btn-reset-label-offset');
    const chkLabelVisibility = document.getElementById('chk-label-visibility');
    const pathColorSelect = document.getElementById('path-color-select');
    const btnAddPathPoint = document.getElementById('btn-add-path-point');
    const btnClearPath = document.getElementById('btn-clear-path');
    const pathPointList = document.getElementById('path-point-list');
    const pathPointHelp = document.getElementById('path-point-help');
    const pathPointsRedInput = document.getElementById('path-points-red-input');
    const pathPointsBlueInput = document.getElementById('path-points-blue-input');
    const btnUpdatePath = document.getElementById('btn-update-path');
    const btnToggleFlow = document.getElementById('btn-toggle-flow');
    const sliderFlowSpeed = document.getElementById('slider-flow-speed');
    const flowSpeedValue = document.getElementById('flow-speed-value');

    function loadCurrentLabelOffset() {
        const partKey = labelPartSelect.value;
        if (!partKey) return;
        const current = visualizer.labelOffsets?.[partKey] || { x: 0, y: 0, z: 0 };
        offsetXInput.value = current.x;
        offsetYInput.value = current.y;
        offsetZInput.value = current.z;
        
        if (chkLabelVisibility) {
            chkLabelVisibility.checked = visualizer.isLabelVisible(partKey);
        }
    }

    function formatPoint(point) {
        return `${point.x.toFixed(3)}, ${point.y.toFixed(3)}, ${point.z.toFixed(3)}`;
    }

    function refreshPathPointList(color) {
        const validColor = color === 'blue' ? 'blue' : 'red';
        const points = visualizer.pathPoints?.[validColor] || [];
        if (pathPointList) {
            pathPointList.value = points.map(formatPoint).join('\n');
        }
        if (pathColorSelect) {
            pathColorSelect.value = validColor;
        }
        visualizer.setActivePathColor(validColor);
    }

    function loadCurrentPathPoints() {
        const activeColor = pathColorSelect?.value || 'red';
        refreshPathPointList(activeColor);

        if (pathPointsRedInput && visualizer.pathPoints?.red) {
            pathPointsRedInput.value = visualizer.pathPoints.red.map(formatPoint).join('\n');
        }
        if (pathPointsBlueInput && visualizer.pathPoints?.blue) {
            pathPointsBlueInput.value = visualizer.pathPoints.blue.map(formatPoint).join('\n');
        }
    }

    if (labelPartSelect) {
        labelPartSelect.addEventListener('change', loadCurrentLabelOffset);
        loadCurrentLabelOffset();
    }
    
    if (chkLabelVisibility) {
        chkLabelVisibility.addEventListener('change', (e) => {
            const partKey = labelPartSelect.value;
            if (partKey) {
                visualizer.setLabelVisibility(partKey, e.target.checked);
            }
        });
    }

    if (btnApplyLabelOffset) {
        btnApplyLabelOffset.addEventListener('click', () => {
            const partKey = labelPartSelect.value;
            const x = parseFloat(offsetXInput.value) || 0;
            const y = parseFloat(offsetYInput.value) || 0;
            const z = parseFloat(offsetZInput.value) || 0;
            visualizer.setLabelOffset(partKey, x, y, z);
            loadCurrentLabelOffset();
        });
    }

    if (btnResetLabelOffset) {
        btnResetLabelOffset.addEventListener('click', () => {
            const partKey = labelPartSelect.value;
            visualizer.setLabelOffset(partKey, 0, 0, 0);
            loadCurrentLabelOffset();
        });
    }

    // Clear ALL saved label positions from localStorage (helps when bad offsets are saved)
    const btnClearAllOffsets = document.getElementById('btn-clear-all-offsets');
    if (btnClearAllOffsets) {
        btnClearAllOffsets.addEventListener('click', () => {
            if (confirm('This will clear ALL saved label position offsets and reload. Labels will return to their default positions. Continue?')) {
                window.localStorage.removeItem('heart3dLabelOffsets');
                window.location.reload();
            }
        });
    }

    // 5b. LABEL POSITIONING BY CLICK (NEW FEATURE)
    // labelPositionPartSelect already declared above
    const btnPositionLabelByClick = document.getElementById('btn-position-label-by-click');
    const btnCancelLabelPositioning = document.getElementById('btn-cancel-label-positioning');
    const labelPositioningStatus = document.getElementById('label-positioning-status');
    const labelPositioningStatusText = document.getElementById('label-positioning-status-text');

    if (btnPositionLabelByClick) {
        btnPositionLabelByClick.addEventListener('click', () => {
            const partKey = labelPositionPartSelect.value;
            if (!partKey) {
                alert('Please select a part first');
                return;
            }

            const success = visualizer.startLabelPositioning(partKey);
            if (success) {
                // Show UI feedback
                btnPositionLabelByClick.style.display = 'none';
                btnCancelLabelPositioning.style.display = 'inline-block';
                labelPositioningStatus.style.display = 'block';
                labelPositioningStatusText.textContent = `Click on the 3D model to position "${partKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}"`;
                labelPartSelect.disabled = true;
            }
        });
    }

    if (btnCancelLabelPositioning) {
        btnCancelLabelPositioning.addEventListener('click', () => {
            visualizer.cancelLabelPositioning();
            btnPositionLabelByClick.style.display = 'inline-block';
            btnCancelLabelPositioning.style.display = 'none';
            labelPositioningStatus.style.display = 'none';
            labelPartSelect.disabled = false;
        });
    }

    // Callbacks for label positioning feedback
    visualizer.onLabelPositioningStart = (partKey) => {
        console.log('🎯 Label positioning started for:', partKey);
    };

    visualizer.onLabelPositioningEnd = () => {
        // Reset UI when positioning completes
        if (btnPositionLabelByClick && btnCancelLabelPositioning) {
            btnPositionLabelByClick.style.display = 'inline-block';
            btnCancelLabelPositioning.style.display = 'none';
            labelPositioningStatus.style.display = 'none';
            labelPartSelect.disabled = false;
        }
        console.log('✅ Label positioning completed');
    };

    if (pathColorSelect) {
        pathColorSelect.addEventListener('change', () => {
            refreshPathPointList(pathColorSelect.value);
            if (pathPointHelp) pathPointHelp.textContent = `Click the canvas to add points for the ${pathColorSelect.value} path.`;
        });
    }

    if (btnAddPathPoint) {
        btnAddPathPoint.addEventListener('click', () => {
            const activeColor = pathColorSelect?.value || 'red';
            const newMode = !visualizer.pathClickMode;
            visualizer.setActivePathColor(activeColor);
            visualizer.togglePathClickMode(newMode);
            btnAddPathPoint.textContent = newMode ? 'Stop Add Point Mode' : 'Add point by click';
            if (pathPointHelp) {
                pathPointHelp.textContent = newMode
                    ? `Click the canvas to place points for the ${activeColor} path.`
                    : 'Point placement paused. Use the button to resume.';
            }
        });
    }

    if (btnClearPath) {
        btnClearPath.addEventListener('click', () => {
            const activeColor = pathColorSelect?.value || 'red';
            visualizer.clearCirculationPath(activeColor);
            refreshPathPointList(activeColor);
            if (activeColor === 'red' && pathPointsRedInput) pathPointsRedInput.value = '';
            if (activeColor === 'blue' && pathPointsBlueInput) pathPointsBlueInput.value = '';
        });
    }

    if (pathPointList) {
        pathPointList.value = '';
    }

    if (pathPointsRedInput || pathPointsBlueInput) {
        loadCurrentPathPoints();
    }

    visualizer.onPathPointAdded = (point, color) => {
        if (color === (pathColorSelect?.value || 'red')) {
            refreshPathPointList(color);
        }
        if (color === 'red' && pathPointsRedInput) {
            pathPointsRedInput.value = visualizer.pathPoints.red.map(formatPoint).join('\n');
        }
        if (color === 'blue' && pathPointsBlueInput) {
            pathPointsBlueInput.value = visualizer.pathPoints.blue.map(formatPoint).join('\n');
        }
    };

    if (btnUpdatePath) {
        btnUpdatePath.addEventListener('click', () => {
            const redLines = pathPointsRedInput.value.trim().split(/\r?\n/).filter(line => line.trim());
            const blueLines = pathPointsBlueInput.value.trim().split(/\r?\n/).filter(line => line.trim());
            const redPoints = [];
            const bluePoints = [];

            for (const line of redLines) {
                const [x, y, z] = line.split(',').map(v => parseFloat(v.trim()));
                if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
                    redPoints.push({ x, y, z });
                }
            }
            for (const line of blueLines) {
                const [x, y, z] = line.split(',').map(v => parseFloat(v.trim()));
                if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
                    bluePoints.push({ x, y, z });
                }
            }

            let created = false;
            if (redPoints.length > 1) {
                visualizer.enableCirculationPath('red', redPoints);
                visualizer.toggleCirculationPath('red', true);
                created = true;
            } else {
                visualizer.clearCirculationPath('red');
            }
            if (bluePoints.length > 1) {
                visualizer.enableCirculationPath('blue', bluePoints);
                visualizer.toggleCirculationPath('blue', true);
                created = true;
            } else {
                visualizer.clearCirculationPath('blue');
            }
            if (created) {
                visualizer.toggleBloodFlow(true);
                if (btnToggleFlow) {
                    btnToggleFlow.classList.add('active');
                    const span = btnToggleFlow.querySelector('span');
                    if (span) span.textContent = 'Stop Blood Flow';
                }
            }
            loadCurrentPathPoints();
        });
    }

    if (btnToggleFlow) {
        btnToggleFlow.addEventListener('click', () => {
            visualizer.toggleBloodFlow(!visualizer.bloodFlowEnabled);
            btnToggleFlow.classList.toggle('active', visualizer.bloodFlowEnabled);
            const span = btnToggleFlow.querySelector('span');
            if (span) {
                span.textContent = visualizer.bloodFlowEnabled ? 'Stop Blood Flow' : 'Start Blood Flow';
            }
        });
        
        // Initial state
        btnToggleFlow.classList.toggle('active', visualizer.bloodFlowEnabled);
        const span = btnToggleFlow.querySelector('span');
        if (span) {
            span.textContent = visualizer.bloodFlowEnabled ? 'Stop Blood Flow' : 'Start Blood Flow';
        }
    }

    if (sliderFlowSpeed) {
        sliderFlowSpeed.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            visualizer.setBloodFlowSpeed(speed);
            if (flowSpeedValue) flowSpeedValue.textContent = speed.toFixed(2);
        });
        flowSpeedValue.textContent = parseFloat(sliderFlowSpeed.value).toFixed(2);
    }


    // 8. EKG MONITOR RENDERING LOOP
    const ekgCanvas = document.getElementById('ekg-canvas');
    const ctx = ekgCanvas.getContext('2d');
    
    // Scale canvas to match its client dimensions
    function resizeEkgCanvas() {
        ekgCanvas.width = ekgCanvas.clientWidth;
        ekgCanvas.height = ekgCanvas.clientHeight;
    }
    resizeEkgCanvas();
    window.addEventListener('resize', resizeEkgCanvas);

    // EKG parameters
    let ekgX = 0;
    const points = new Array(300).fill(null); // Keep historical points to trace a line
    
    function drawEkgGrid() {
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.08)';
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        const gridSpacing = 20;
        for (let x = 0; x < ekgCanvas.width; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ekgCanvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y < ekgCanvas.height; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ekgCanvas.width, y);
            ctx.stroke();
        }
    }

    function updateEkg() {
        // Sample voltage based on Three.js heart cycle time (visualizer.cycleTime)
        // Draw a scientifically accurate P-QRS-T complex
        const cycle = visualizer.cycleTime;
        let volt = 0;
        
        if (!visualizer.isBeating) {
            volt = 0; // Flatline if heartbeat is paused
        } 
        else if (cycle < 0.06) {
            // P Wave (Atrial Depolarization)
            const progress = cycle / 0.06;
            volt = Math.sin(progress * Math.PI) * 4;
        } 
        else if (cycle >= 0.06 && cycle < 0.12) {
            // PR Interval (flat delay)
            volt = 0;
        } 
        else if (cycle >= 0.12 && cycle < 0.14) {
            // Q Wave (Down spike)
            const progress = (cycle - 0.12) / 0.02;
            volt = -progress * 3;
        } 
        else if (cycle >= 0.14 && cycle < 0.17) {
            // R Spike (Massive ventricular depolarization upward spike)
            const progress = (cycle - 0.14) / 0.03;
            volt = -3 + progress * 25; // Reaches peak of 22
        } 
        else if (cycle >= 0.17 && cycle < 0.20) {
            // S Wave (Deep downward spike)
            const progress = (cycle - 0.17) / 0.03;
            volt = 22 - progress * 28; // Reaches depth of -6
        } 
        else if (cycle >= 0.20 && cycle < 0.23) {
            // Recoil back to baseline
            const progress = (cycle - 0.20) / 0.03;
            volt = -6 + progress * 6;
        } 
        else if (cycle >= 0.23 && cycle < 0.44) {
            // ST Segment (refractory plateau)
            volt = 0;
        } 
        else if (cycle >= 0.44 && cycle < 0.54) {
            // T Wave (Ventricular repolarization, medium bump)
            const progress = (cycle - 0.44) / 0.10;
            volt = Math.sin(progress * Math.PI) * 6;
        } 
        else {
            // TP Interval (resting baseline)
            volt = 0;
        }
        
        // Translate voltage to Y coordinate: center is baseline
        const baseline = ekgCanvas.height / 2;
        const targetY = baseline - volt;
        
        // Store point and step forward
        points.push(targetY);
        if (points.length > ekgCanvas.width) {
            points.shift();
        }
        
        // Render EKG Canvas
        ctx.clearRect(0, 0, ekgCanvas.width, ekgCanvas.height);
        
        // 1. Draw Grid
        drawEkgGrid();
        
        // 2. Draw Waveform line
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.85)';
        ctx.shadowColor = 'rgba(0, 230, 118, 0.4)';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        let started = false;
        for (let i = 0; i < points.length; i++) {
            if (points[i] === null) continue;
            
            // X coordinate goes from left to right
            const x = i;
            if (!started) {
                ctx.moveTo(x, points[i]);
                started = true;
            } else {
                ctx.lineTo(x, points[i]);
            }
        }
        ctx.stroke();
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;
        
        // 3. Draw Sweeping cursor indicator dot
        if (started && points.length > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(points.length - 1, points[points.length - 1], 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        requestAnimationFrame(updateEkg);
    }
    
    // Start EKG animation
    updateEkg();
});
