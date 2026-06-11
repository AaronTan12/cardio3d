class Heart3DVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // Setup Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0f19);
        
        // Setup Camera
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
        this.camera.position.set(0, 0, 8);
        
        // WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // CSS2D Renderer for Annotations
        this.labelRenderer = new THREE.CSS2DRenderer();
        this.labelRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none'; // Allow clicking through to orbit
        this.container.appendChild(this.labelRenderer.domElement);
        
        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 15;
        
        // Lighting - brighter for clearer view
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(this.ambientLight);
        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.dirLight.position.set(5, 5, 5);
        this.scene.add(this.dirLight);
        
        // State variables
        this.isBeating = true;
        this.bpm = 72;
        this.cycleTime = 0;
        this.clock = new THREE.Clock();
        
        this.gltfModel = null;
        this.mixer = null;
        this.action = null;
        
        this.labels = {}; // Store CSS2DObjects
        this.labelOffsets = {};
        this.labelsVisible = true;
        this.labelsMode = 'show'; // 'show' | 'dot-only' | 'hide'
        this.highlightedPart = null;
        this.onPartSelected = null;
        this._dotOnlyRevealTimer = null;

        this.storedOffsets = this.loadSavedLabelOffsets();
        this.storedCirculation = this.loadSavedCirculation();

        this.pathCurves = { red: null, blue: null };
        this.pathPoints = { red: [], blue: [] };
        this.circulationLines = { red: null, blue: null };
        this.bloodFlowBalls = { red: null, blue: null };
        this.bloodFlowParticles = { red: [], blue: [] };
        this.bloodFlowProgress = { red: 0, blue: 0 };
        this.pathClickMode = false;
        this.activePathColor = 'red';
        this.onPathPointAdded = null;
        this.flowSpeed = 0.6;
        this.bloodFlowEnabled = false;
        
        // Label positioning mode
        this.labelClickMode = false;
        this.selectedLabelForOffset = null;
        this.onLabelPositioningStart = null;
        this.onLabelPositioningEnd = null;
        
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.domElement.addEventListener('click', (event) => this.onCanvasClick(event));
        
        this.loadExternalModel();
        this.applySavedCirculationPaths();
        this.animate();
    }
    
    loadSavedLabelOffsets() {
        try {
            const raw = window.localStorage.getItem('heart3dLabelOffsets');
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn('Unable to read saved label offsets:', error);
            return {};
        }
    }

    saveLabelOffsets() {
        try {
            window.localStorage.setItem('heart3dLabelOffsets', JSON.stringify(this.labelOffsets));
        } catch (error) {
            console.warn('Unable to save label offsets:', error);
        }
    }

    loadSavedCirculation() {
        try {
            const raw = window.localStorage.getItem('heart3dCirculationData');
            return raw ? JSON.parse(raw) : {};
        } catch (error) {
            console.warn('Unable to read saved circulation data:', error);
            return {};
        }
    }

    saveCirculationData() {
        try {
            window.localStorage.setItem('heart3dCirculationData', JSON.stringify({
                paths: this.pathPoints,
                bloodFlowEnabled: this.bloodFlowEnabled,
                flowSpeed: this.flowSpeed
            }));
        } catch (error) {
            console.warn('Unable to save circulation data:', error);
        }
    }

    setActivePathColor(color) {
        this.activePathColor = color === 'blue' ? 'blue' : 'red';
    }

    togglePathClickMode(enabled) {
        this.pathClickMode = !!enabled;
    }

    onCanvasClick(event) {
        // Handle both path mode and label positioning mode
        if (!this.pathClickMode && !this.labelClickMode) return;
        if (!this.renderer || !this.camera) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        let point = null;
        if (this.gltfModel) {
            const hits = raycaster.intersectObject(this.gltfModel, true);
            if (hits.length > 0) {
                point = hits[0].point.clone();
            }
        }

        if (!point) {
            const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
            point = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, point);
        }

        if (point) {
            if (this.labelClickMode && this.selectedLabelForOffset) {
                // Update label position from clicked world position
                this.updateLabelOffsetFromWorldPosition(this.selectedLabelForOffset, point);
                this.cancelLabelPositioning();
            } else if (this.pathClickMode) {
                // Add blood path point
                this.addPathPointFromCanvas(this.activePathColor, point);
            }
        }
    }

    addPathPointFromCanvas(color, point) {
        const validColor = color === 'blue' ? 'blue' : 'red';
        if (!this.pathPoints[validColor]) this.pathPoints[validColor] = [];
        this.pathPoints[validColor].push(point.clone());
        if (this.pathPoints[validColor].length > 1) {
            if (this.circulationLines[validColor]) {
                this.updateCirculationPath(validColor, this.pathPoints[validColor]);
            } else {
                this.enableCirculationPath(validColor, this.pathPoints[validColor]);
            }
        }
        if (typeof this.onPathPointAdded === 'function') {
            this.onPathPointAdded(point.clone(), validColor);
        }
    }

    createBloodFlowParticlePool(color) {
        const validColor = color === 'blue' ? 'blue' : 'red';
        if (this.bloodFlowParticles[validColor].length > 0) return;

        const partGeom = new THREE.SphereGeometry(0.07, 10, 10);
        const partMat = new THREE.MeshStandardMaterial({
            color: validColor === 'blue' ? 0x4da6ff : 0xff5566,
            emissive: validColor === 'blue' ? 0x4da6ff : 0xff3344,
            emissiveIntensity: 0.75,
            metalness: 0.1,
            roughness: 0.35,
            depthTest: false
        });

        for (let i = 0; i < 18; i++) {
            const mesh = new THREE.Mesh(partGeom, partMat);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.visible = false;
            mesh.renderOrder = 1000;
            this.scene.add(mesh);
            this.bloodFlowParticles[validColor].push({
                mesh,
                progress: i / 18,
                speed: 0.08 + Math.random() * 0.08
            });
        }
    }

    applySavedCirculationPaths() {
        if (!this.storedCirculation || !this.storedCirculation.paths) return;

        ['red', 'blue'].forEach(color => {
            const points = this.storedCirculation.paths[color];
            if (Array.isArray(points) && points.length > 1) {
                this.enableCirculationPath(color, points);
                this.toggleCirculationPath(color, true);
            }
        });

        if (typeof this.storedCirculation.flowSpeed === 'number') {
            this.setBloodFlowSpeed(this.storedCirculation.flowSpeed);
        }

        if (this.storedCirculation.bloodFlowEnabled) {
            this.toggleBloodFlow(true);
        }
    }

    loadExternalModel() {
        console.log('📦 Starting to load GLTF model...');
        const loader = new THREE.GLTFLoader();
        const modelPath = './human_heart_beating_-_annotations.glb';
        
        loader.load(
            modelPath,
            (gltf) => {
                console.log('✅ GLTF model loaded successfully!');
                this.gltfModel = gltf.scene;
                
                // Auto scale and center
                const box = new THREE.Box3().setFromObject(this.gltfModel);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                const scale = 3.2 / Math.max(size.x, size.y, size.z);
                
                this.gltfModel.scale.set(scale, scale, scale);
                this.gltfModel.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
                
                this.scene.add(this.gltfModel);
                
                // Setup Animation
                if (gltf.animations && gltf.animations.length > 0) {
                    console.log('🎬 Found animations:', gltf.animations.length);
                    this.mixer = new THREE.AnimationMixer(this.gltfModel);
                    this.action = this.mixer.clipAction(gltf.animations[0]);
                    this.action.play();
                    this.updateBPMSpeed();
                }
                
                // Create CSS2D Annotations dynamically from joints
                this.setupAnnotations();
                
                // Hide loading overlay
                const loaderOverlay = document.getElementById('loading-overlay');
                if (loaderOverlay) {
                    loaderOverlay.style.opacity = 0;
                    setTimeout(() => loaderOverlay.style.display = 'none', 500);
                }
            },
            (progress) => {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                console.log('⏳ Loading progress:', percent + '%');
            },
            (error) => {
                console.error('❌ Failed to load model from:', modelPath);
                console.error('📋 Error details:', error);
                
                // Always hide the loading overlay on error and show error message
                const loaderOverlay = document.getElementById('loading-overlay');
                if (loaderOverlay) {
                    loaderOverlay.innerHTML = `
                        <div style="text-align: center; color: #e53935; padding: 20px;">
                            <i class="fa-solid fa-exclamation-circle" style="font-size: 3em; margin-bottom: 10px; display: block;"></i>
                            <p><strong>⚠️ Model Failed to Load</strong></p>
                            <p style="font-size: 0.9em; margin: 10px 0;">Missing file: ${modelPath}</p>
                            <p style="font-size: 0.8em; margin: 10px 0;">Please ensure the .glb file is in the same directory</p>
                            <p style="font-size: 0.8em; color: #666;">Check browser console (F12) for details</p>
                        </div>
                    `;
                    loaderOverlay.style.opacity = 1;
                    loaderOverlay.style.display = 'flex';
                    loaderOverlay.style.alignItems = 'center';
                    loaderOverlay.style.justifyContent = 'center';
                    loaderOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                }
            }
        );
    }
    
    setupAnnotations() {
        // Mapping skeleton joint names to our Anatomy Explorer parts
        const jointMap = {
            'right_atrium_jnt': 'right_atrium',
            'cardiac_muscle_jnt': 'myocardium', // Mapping cardiac muscle to myocardium
            'left_atrium_jnt': 'left_atrium',
            'left_mitral_valve_jnt': 'bicuspid_valve', // Using Bicuspid instead of Mitral
            'aortic_valve_02_jnt': 'aortic_valve',
            'left_tricuspid_valve_jnt': 'tricuspid_valve'
        };
        
        const fallbackAnchors = {
            right_atrium:      new THREE.Vector3( 0.55,  0.45,  0.05),
            right_ventricle:   new THREE.Vector3( 0.55,  0.00,  0.05),
            left_atrium:       new THREE.Vector3(-0.55,  0.45,  0.05),
            left_ventricle:    new THREE.Vector3(-0.50, -0.15,  0.00),
            septum:            new THREE.Vector3( 0.00,  0.00,  0.00),
            tricuspid_valve:   new THREE.Vector3( 0.35,  0.05,  0.00),
            bicuspid_valve:    new THREE.Vector3(-0.35,  0.05,  0.00),
            aortic_valve:      new THREE.Vector3( 0.00,  0.35, -0.10),
            pulmonary_valve:   new THREE.Vector3(-0.15,  0.50, -0.10),
            papillary_muscle:  new THREE.Vector3( 0.25, -0.25,  0.05),
            chordae_tendineae: new THREE.Vector3( 0.15, -0.05,  0.05),
            trabeculae_carneae:new THREE.Vector3( 0.05, -0.10,  0.10),
            aorta:             new THREE.Vector3( 0.00,  0.75, -0.15),
            vena_cava:         new THREE.Vector3( 0.45,  0.75,  0.05),
            pulmonary_artery:  new THREE.Vector3( 0.35,  0.55, -0.10),
            pulmonary_veins:   new THREE.Vector3(-0.55,  0.35, -0.15),
            myocardium:        new THREE.Vector3(-0.40, -0.20,  0.10),
            arterioles:        new THREE.Vector3( 0.80,  0.50,  0.00),
            capillaries:       new THREE.Vector3( 0.90,  0.50,  0.00),
            venules:           new THREE.Vector3(-0.80,  0.50,  0.00),
            venous_valves:     new THREE.Vector3(-0.90,  0.50,  0.00)
        };

        this.gltfModel.traverse((node) => {
            if (node.isBone || node.isObject3D) {
                let foundKey = null;
                Object.keys(jointMap).forEach(jntName => {
                    if (node.name.includes(jntName)) {
                        foundKey = jointMap[jntName];
                    }
                });
                
                // If it matches and we haven't already added a label for this part
                if (foundKey && !this.labels[foundKey]) {
                    this.createAnnotationLabel(foundKey, node);
                }
            }
        });

        // Ensure ALL parts in heartPartsData have a label.
        // IMPORTANT: Fallback placeholders are added to `this.scene` (NOT gltfModel)
        // so that they stay in world-space and are never affected by the heart animation.
        // Parenting to gltfModel would cause labels to drift/jump with the animated rig.
        Object.keys(heartPartsData).forEach(partKey => {
            if (!this.labels[partKey]) {
                const position = fallbackAnchors[partKey] || new THREE.Vector3(0, 0, 0);
                const placeholder = new THREE.Object3D();
                placeholder.position.copy(position);
                this.scene.add(placeholder); // scene root → never animated
                this.createAnnotationLabel(partKey, placeholder);
            }
        });
    }
    
    updateBPMSpeed() {
        if (this.mixer && this.action) {
            this.action.timeScale = this.bpm / 60;
        }
    }

    createAnnotationLabel(partKey, node) {
        const div = document.createElement('div');
        div.id = `label-${partKey}`;
        div.dataset.part = partKey;
        div.className = 'anatomy-label';
        div.style.pointerEvents = 'auto';
        div.style.marginLeft = '0px';
        div.style.marginTop = '0px';

        const dot = document.createElement('div');
        dot.className = 'label-dot';
        div.appendChild(dot);

        const card = document.createElement('div');
        card.className = 'label-card';
        card.textContent = partKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        div.appendChild(card);

        div.addEventListener('click', (event) => {
            event.stopPropagation();
            if (this.onPartSelected) this.onPartSelected(partKey);
            this.selectPart(partKey);
            this.focusCameraOn(partKey);
        });

        const labelObject = new THREE.CSS2DObject(div);
        labelObject.position.set(0, 0, 0);
        node.add(labelObject);

        div.style.display = this.labelsVisible ? 'block' : 'none';
        labelObject.visible = this.labelsVisible;
        this.labelOffsets[partKey] = { x: 0, y: 0, z: 0, visible: true };

        const savedOffset = this.storedOffsets[partKey];
        const baseOffset = savedOffset ? {
            x: Number(savedOffset.x) || 0,
            y: Number(savedOffset.y) || 0,
            z: Number(savedOffset.z) || 0,
            visible: savedOffset.visible !== false
        } : { x: 0, y: 0, z: 0, visible: true };

        this.labelOffsets[partKey] = { ...baseOffset };
        this.labels[partKey] = {
            object: labelObject,
            dom: div,
            node,
            offset: { ...baseOffset }
        };

        if (savedOffset) {
            this.setLabelOffset(partKey, baseOffset.x, baseOffset.y, baseOffset.z);
        }
        
        // Apply individual visibility
        if (!baseOffset.visible) {
            div.style.display = 'none';
            labelObject.visible = false;
        }
    }

    /**
     * Set the label display mode globally.
     * @param {'show'|'dot-only'|'hide'} mode
     */
    setLabelsMode(mode) {
        this.labelsMode = mode;
        this.labelsVisible = (mode !== 'hide');

        Object.keys(this.labels).forEach(partKey => {
            const lbl = this.labels[partKey];
            const individualVisible = this.isLabelVisible(partKey);

            if (mode === 'hide') {
                lbl.dom.style.display = 'none';
                lbl.object.visible = false;
                lbl.dom.style.pointerEvents = 'none';
            } else if (mode === 'dot-only') {
                if (individualVisible) {
                    lbl.dom.style.display = 'block';
                    lbl.object.visible = true;
                    lbl.dom.style.pointerEvents = 'auto';
                    // Show dot, hide card (unless active)
                    const card = lbl.dom.querySelector('.label-card');
                    const isActive = lbl.dom.classList.contains('active');
                    if (card) card.classList.toggle('label-card--hidden', !isActive);
                    lbl.dom.classList.add('dot-only-mode');
                } else {
                    lbl.dom.style.display = 'none';
                    lbl.object.visible = false;
                }
            } else { // 'show'
                if (individualVisible) {
                    lbl.dom.style.display = 'block';
                    lbl.object.visible = true;
                    lbl.dom.style.pointerEvents = 'auto';
                    const card = lbl.dom.querySelector('.label-card');
                    if (card) card.classList.remove('label-card--hidden');
                    lbl.dom.classList.remove('dot-only-mode');
                } else {
                    lbl.dom.style.display = 'none';
                    lbl.object.visible = false;
                }
            }
        });
    }
    
    selectPart(partKey) {
        this.resetHighlights();
        this.highlightedPart = partKey;
        
        if (this.labels[partKey]) {
            const dom = this.labels[partKey].dom;
            dom.classList.add('active');
            dom.querySelector('.label-dot').style.background = '#00ff44';
            dom.querySelector('.label-dot').style.boxShadow = '0 0 15px #00ff44';
            const card = dom.querySelector('.label-card');
            card.style.borderLeftColor = '#00ff44';
            card.style.color = '#00ff44';

            // In dot-only mode: temporarily reveal the card
            if (this.labelsMode === 'dot-only') {
                card.classList.remove('label-card--hidden');
                card.classList.add('label-card--reveal');
                // Clear any previous auto-hide timer
                if (this._dotOnlyRevealTimer) clearTimeout(this._dotOnlyRevealTimer);
                this._dotOnlyRevealTimer = setTimeout(() => {
                    // Only hide if this part is still the highlighted one
                    if (this.highlightedPart === partKey) {
                        this.resetHighlights();
                    }
                }, 3000);
            }
        }
    }
    
    resetHighlights() {
        if (this._dotOnlyRevealTimer) {
            clearTimeout(this._dotOnlyRevealTimer);
            this._dotOnlyRevealTimer = null;
        }
        Object.values(this.labels).forEach(lbl => {
            const dom = lbl.dom;
            dom.classList.remove('active');
            dom.querySelector('.label-dot').style.background = '';
            dom.querySelector('.label-dot').style.boxShadow = '';
            const card = dom.querySelector('.label-card');
            card.style.borderLeftColor = '';
            card.style.color = '';
            card.classList.remove('label-card--reveal');
            // Re-apply dot-only hiding if in that mode
            if (this.labelsMode === 'dot-only') {
                card.classList.add('label-card--hidden');
            }
        });
        this.highlightedPart = null;
    }
    
    setBeating(enabled) {
        this.isBeating = enabled;
        if (this.mixer && this.action) {
            this.action.timeScale = enabled ? (this.bpm / 60) : 0;
        }
    }
    
    setBpm(value) {
        this.bpm = value;
        this.updateBPMSpeed();
    }
    
    resetView() {
        this.controls.reset();
        this.camera.position.set(0, 0, 8);
        this.controls.target.set(0, 0, 0);
        this.resetHighlights();
    }
    
    focusCameraOn(partKey) {
        if (!this.labels[partKey]) return;
        
        const labelObj = this.labels[partKey].object;
        const targetPos = new THREE.Vector3();
        if (labelObj) {
            labelObj.getWorldPosition(targetPos);
        } else {
            this.labels[partKey].node.getWorldPosition(targetPos);
        }
        
        const duration = 800;
        const startCam = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        
        // Push camera away from target
        const offset = new THREE.Vector3(0, 0, 4);
        const endCam = targetPos.clone().add(offset);
        
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const t = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            
            this.camera.position.lerpVectors(startCam, endCam, ease);
            this.controls.target.lerpVectors(startTarget, targetPos, ease);
            
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
    
    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.labelRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = this.clock.getDelta();
        
        if (this.isBeating) {
            this.cycleTime += delta * (this.bpm / 60);
            if (this.cycleTime > 1) this.cycleTime -= 1;
            
            if (this.mixer) {
                this.mixer.update(delta);
            }
        }
        
        this.controls.update();
        this.updateBloodFlow(delta);
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    // ----- Utility Functions for Manual Adjustments -----

    // 1. Blood circulation path (simple line representation)
    enableCirculationPath(color, pointsArray) {
        const validColor = color === 'blue' ? 'blue' : 'red';
        if (this.circulationLines[validColor]) {
            this.scene.remove(this.circulationLines[validColor]);
            this.circulationLines[validColor].geometry.dispose();
            this.circulationLines[validColor].material.dispose();
            this.circulationLines[validColor] = null;
        }

        const points = pointsArray.map(p => new THREE.Vector3(p.x, p.y, p.z));
        this.pathPoints[validColor] = points;
        this.pathCurves[validColor] = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(this.pathCurves[validColor], Math.max(points.length * 10, 50), 0.04, 10, false);
        const tubeMaterial = new THREE.MeshStandardMaterial({
            color: validColor === 'blue' ? 0x4da6ff : 0xff4444,
            emissive: validColor === 'blue' ? 0x2c8fff : 0xff2c2c,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0.95,
            depthTest: false,
            side: THREE.DoubleSide
        });
        const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        tubeMesh.renderOrder = 999;
        this.circulationLines[validColor] = tubeMesh;
        this.circulationLines[validColor].visible = true;
        this.scene.add(tubeMesh);

        this.createBloodFlowBall(validColor);
        this.createBloodFlowParticlePool(validColor);
        this.bloodFlowProgress[validColor] = 0;
        if (this.bloodFlowBalls[validColor]) {
            const position = this.pathCurves[validColor].getPoint(0);
            if (position) this.bloodFlowBalls[validColor].position.copy(position);
        }
        this.saveCirculationData();
    }

    updateCirculationPath(color, pointsArray) {
        const validColor = color === 'blue' ? 'blue' : 'red';
        if (!this.circulationLines[validColor]) return;
        const points = pointsArray.map(p => new THREE.Vector3(p.x, p.y, p.z));
        this.pathPoints[validColor] = points;
        this.pathCurves[validColor] = new THREE.CatmullRomCurve3(points);
        const newGeometry = new THREE.TubeGeometry(this.pathCurves[validColor], Math.max(points.length * 10, 50), 0.02, 8, false);
        this.circulationLines[validColor].geometry.dispose();
        this.circulationLines[validColor].geometry = newGeometry;

        if (this.bloodFlowBalls[validColor]) {
            const position = this.pathCurves[validColor].getPoint(0);
            if (position) this.bloodFlowBalls[validColor].position.copy(position);
        }
        this.saveCirculationData();
    }

    toggleCirculationPath(color, show) {
        const validColor = color === 'blue' ? 'blue' : 'red';
        if (this.circulationLines[validColor]) {
            this.circulationLines[validColor].visible = !!show;
        }
    }

    clearCirculationPath(color) {
        const validColor = color === 'blue' ? 'blue' : 'red';
        if (this.circulationLines[validColor]) {
            this.scene.remove(this.circulationLines[validColor]);
            this.circulationLines[validColor].geometry.dispose();
            this.circulationLines[validColor].material.dispose();
            this.circulationLines[validColor] = null;
        }
        this.pathPoints[validColor] = [];
        this.pathCurves[validColor] = null;
        if (this.bloodFlowBalls[validColor]) {
            this.bloodFlowBalls[validColor].visible = false;
        }
        (this.bloodFlowParticles[validColor] || []).forEach(p => {
            if (p.mesh) p.mesh.visible = false;
        });
        this.saveCirculationData();
    }

    // 2. Toggle all annotation labels on/off (legacy - use setLabelsMode for full control)
    toggleLabels(show) {
        this.setLabelsMode(show ? (this.labelsMode === 'hide' ? 'show' : this.labelsMode) : 'hide');
    }

    // 3. Adjust individual label offset (in 3D space relative to anchor node)
    setLabelOffset(partKey, offsetX, offsetY, offsetZ = 0) {
        const lbl = this.labels[partKey];
        if (!lbl) return;
        
        // Preserve existing visibility state
        const isVisible = this.labelOffsets[partKey]?.visible !== false;
        
        this.labelOffsets[partKey] = { x: offsetX, y: offsetY, z: offsetZ, visible: isVisible };
        lbl.offset = { x: offsetX, y: offsetY, z: offsetZ };
        lbl.dom.style.marginLeft = '0px';
        lbl.dom.style.marginTop = '0px';
        if (lbl.object) {
            lbl.object.position.set(offsetX, offsetY, offsetZ);
        }
        this.saveLabelOffsets();
    }
    
    // Toggle individual label visibility
    setLabelVisibility(partKey, isVisible) {
        const lbl = this.labels[partKey];
        if (!lbl) return;
        
        if (!this.labelOffsets[partKey]) {
            this.labelOffsets[partKey] = { x: 0, y: 0, z: 0 };
        }
        this.labelOffsets[partKey].visible = !!isVisible;
        
        // Only update actual DOM if global labels are visible
        if (this.labelsVisible) {
            lbl.dom.style.display = isVisible ? 'block' : 'none';
            lbl.object.visible = !!isVisible;
            lbl.dom.style.pointerEvents = isVisible ? 'auto' : 'none';
        }
        
        this.saveLabelOffsets();
    }
    
    // Check if individual label is visible
    isLabelVisible(partKey) {
        if (!this.labelOffsets[partKey]) return true;
        return this.labelOffsets[partKey].visible !== false;
    }

    // 4. Blood flow and moving particle support
    createBloodFlowBall(color) {
        const validColor = color === 'blue' ? 'blue' : 'red';
        if (this.bloodFlowBalls[validColor]) return;
        const sphere = new THREE.SphereGeometry(0.12, 20, 20);
        const material = new THREE.MeshStandardMaterial({
            color: validColor === 'blue' ? 0x4da6ff : 0xff5566,
            emissive: validColor === 'blue' ? 0x4da6ff : 0xff3344,
            emissiveIntensity: 0.65,
            metalness: 0.1,
            roughness: 0.4
        });
        const ball = new THREE.Mesh(sphere, material);
        ball.castShadow = false;
        ball.receiveShadow = false;
        ball.visible = false;
        ball.renderOrder = 1000;
        material.depthTest = false;
        this.bloodFlowBalls[validColor] = ball;
        this.scene.add(ball);
    }

    toggleBloodFlow(show) {
        this.createBloodFlowBall('red');
        this.createBloodFlowBall('blue');
        this.createBloodFlowParticlePool('red');
        this.createBloodFlowParticlePool('blue');
        this.bloodFlowEnabled = !!show;
        Object.values(this.bloodFlowBalls).forEach(ball => {
            if (ball) ball.visible = this.bloodFlowEnabled;
        });
        ['red', 'blue'].forEach(color => {
            this.bloodFlowParticles[color].forEach(p => {
                p.mesh.visible = this.bloodFlowEnabled;
            });
        });
        this.saveCirculationData();
    }

    setBloodFlowSpeed(value) {
        this.flowSpeed = Math.max(0.05, value);
    }

    updateBloodFlow(delta) {
        if (!this.bloodFlowEnabled) return;
        ['red', 'blue'].forEach(color => {
            const curve = this.pathCurves[color];
            const ball = this.bloodFlowBalls[color];
            if (curve && ball) {
                this.bloodFlowProgress[color] = (this.bloodFlowProgress[color] + delta * this.flowSpeed) % 1;
                const position = curve.getPoint(this.bloodFlowProgress[color]);
                if (position) ball.position.copy(position);
            }
            const particles = this.bloodFlowParticles[color] || [];
            particles.forEach(p => {
                if (!curve) {
                    p.mesh.visible = false;
                    return;
                }
                p.progress = (p.progress + delta * this.flowSpeed * p.speed) % 1;
                const pos = curve.getPointAt(p.progress);
                if (pos) p.mesh.position.copy(pos);
                p.mesh.visible = this.bloodFlowEnabled;
            });
        });
    }

    /**
     * Get the 3D position coordinates of a heart component
     * @param {string} partKey - The component key (e.g., 'left_ventricle')
     * @returns {Object} Position object with x, y, z coordinates
     */
    getComponentPosition(partKey) {
        if (this.labels[partKey] && this.labels[partKey].node) {
            const node = this.labels[partKey].node;
            const worldPos = new THREE.Vector3();
            node.getWorldPosition(worldPos);
            
            // Also get local position for reference
            const localPos = node.position;
            
            return {
                x: Number(worldPos.x.toFixed(2)),
                y: Number(worldPos.y.toFixed(2)),
                z: Number(worldPos.z.toFixed(2)),
                local: {
                    x: Number(localPos.x.toFixed(2)),
                    y: Number(localPos.y.toFixed(2)),
                    z: Number(localPos.z.toFixed(2))
                }
            };
        }
        return { x: 0, y: 0, z: 0, local: { x: 0, y: 0, z: 0 } };
    }

    /**
     * Check if blood path is visible
     * @returns {boolean}
     */
    isBloodPathVisible() {
        if (this._bloodPathVisible === undefined) {
            this._bloodPathVisible = true;
        }
        return this._bloodPathVisible;
    }

    /**
     * Toggle visibility of blood path (circulation lines and blood flow particles)
     * @param {boolean} show - Whether to show the blood path
     */
    toggleBloodPath(show) {
        const isVisible = !!show;
        this._bloodPathVisible = isVisible;
        
        // Toggle circulation lines
        ['red', 'blue'].forEach(color => {
            if (this.circulationLines[color]) {
                this.circulationLines[color].visible = isVisible;
            }
            
            // Toggle blood flow particles
            if (this.bloodFlowParticles[color]) {
                this.bloodFlowParticles[color].forEach(p => {
                    if (p.mesh) p.mesh.visible = isVisible && this.bloodFlowEnabled;
                });
            }
            
            // Toggle blood flow balls
            if (this.bloodFlowBalls[color]) {
                this.bloodFlowBalls[color].visible = isVisible && this.bloodFlowEnabled;
            }
        });
        
        this.saveCirculationData();
    }

    /**
     * Start label positioning mode - allows clicking on model to set label position
     * @param {string} partKey - The component label to position
     */
    startLabelPositioning(partKey) {
        if (!this.labels[partKey]) return false;
        
        this.labelClickMode = true;
        this.selectedLabelForOffset = partKey;
        
        // Highlight the selected label
        this.selectPart(partKey);
        
        if (this.onLabelPositioningStart) {
            this.onLabelPositioningStart(partKey);
        }
        
        return true;
    }

    /**
     * Cancel label positioning mode
     */
    cancelLabelPositioning() {
        this.labelClickMode = false;
        this.selectedLabelForOffset = null;
        
        if (this.onLabelPositioningEnd) {
            this.onLabelPositioningEnd();
        }
    }

    /**
     * Update label offset based on where user clicked in 3D space
     * Calculates the local 3D offset needed to move label to clicked position
     * @param {string} partKey - The component label
     * @param {THREE.Vector3} worldPoint - The 3D world position that was clicked
     */
    updateLabelOffsetFromWorldPosition(partKey, worldPoint) {
        if (!this.labels[partKey]) return;
        
        const labelData = this.labels[partKey];
        const node = labelData.node;
        
        // Convert worldPoint to node's local coordinate system
        const localPoint = node.worldToLocal(worldPoint.clone());
        
        // Set the 3D offset
        this.setLabelOffset(partKey, localPoint.x, localPoint.y, localPoint.z);
        
        console.log(`📍 Label offset updated for ${partKey}: X=${localPoint.x.toFixed(3)}, Y=${localPoint.y.toFixed(3)}, Z=${localPoint.z.toFixed(3)}`);
    }

    /**
     * Check if label positioning mode is active
     * @returns {boolean}
     */
    isLabelPositioningActive() {
        return this.labelClickMode;
    }

    /**
     * Get current selected label for positioning
     * @returns {string|null}
     */
    getSelectedLabelForPositioning() {
        return this.selectedLabelForOffset;
    }
}


