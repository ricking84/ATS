/**
 * 3D Visualization for ATS Trailer
 * Uses Three.js to render and animate the trailer and boat
 */

class TrailerVisualizer {
    constructor(sideContainerId, rearContainerId) {
        this.sideContainer = sideContainerId ? document.getElementById(sideContainerId) : null;
        this.rearContainer = document.getElementById(rearContainerId);
        this.scene = null;
        this.sideCamera = null;
        this.rearCamera = null;
        this.sideRenderer = null;
        this.rearRenderer = null;
        this.trailer = null;
        this.water = null;
        this.ground = null;
        
        this.currentGyroX = 0;
        this.currentGyroY = 0;
        this.currentGyroZ = 0;
        
        this.currentDistanceLeft = 0;
        this.currentDistanceRight = 0;
        
        this.floatSensor = false;
        this.waterOpacity = 0; // current opacity
        this.targetWaterOpacity = 0; // target opacity for smooth transition
        this.waterOpacity = 0; // current opacity
        this.targetWaterOpacity = 0; // target opacity for smooth transition

        // Target rotation (radians) and smoothing
        this.targetRotation = new THREE.Euler(0, 0, 0, 'XYZ');
        this.rotationLerp = 0.08; // smoothing factor (0-1)
        this.positionLerp = 0.08; // smoothing for position changes
        this.waterLerp = 0.05; // water fade in/out smoothing factor
        this.waterLerp = 0.05; // water fade in/out smoothing factor
        this.maxLateralSlide = 0.6; // meters lateral slide left/right
        
        this.waterLevelSensor = document.getElementById('water-status');
        
        this.init();
    }
    
    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1f2e);
        
        // Side Camera (from the side)
        if (this.sideContainer) {
            const sideWidth = this.sideContainer.clientWidth;
            const sideHeight = this.sideContainer.clientHeight;
            this.sideCamera = new THREE.PerspectiveCamera(75, sideWidth / sideHeight, 0.1, 1000);
            this.sideCamera.position.set(3, 1.5, 0); // Side view
            this.sideCamera.lookAt(0, 0, 0);
        }
        
        // Rear Camera (from the back)
        const rearWidth = this.rearContainer.clientWidth;
        const rearHeight = this.rearContainer.clientHeight;
        this.rearCamera = new THREE.PerspectiveCamera(75, rearWidth / rearHeight, 0.1, 1000);
        this.rearCamera.position.set(0, 1.7, -4.6); // Rear view
        this.rearCamera.lookAt(0, 0, 0);
        
        // Side Renderer
        if (this.sideContainer && this.sideCamera) {
            const sideWidth = this.sideContainer.clientWidth;
            const sideHeight = this.sideContainer.clientHeight;
            this.sideRenderer = new THREE.WebGLRenderer({ antialias: true });
            this.sideRenderer.setSize(sideWidth, sideHeight);
            this.sideRenderer.shadowMap.enabled = true;
            this.sideRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.sideContainer.appendChild(this.sideRenderer.domElement);
        }
        
        // Rear Renderer
        this.rearRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.rearRenderer.setSize(rearWidth, rearHeight);
        this.rearRenderer.shadowMap.enabled = true;
        this.rearRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.rearContainer.appendChild(this.rearRenderer.domElement);
        
        // Lighting
        this.setupLighting();
        
        // Create 3D objects
        this.createTrailer();
        
        // Position trailer so wheels rest on ground at Y = -1.5
        // Wheel center: trailer.y - 0.35, Wheel bottom: trailer.y - 0.35 - 0.35 = trailer.y - 0.7
        // For wheel bottom at -1.5: trailer.y = -0.8
        this.trailer.position.y = -0.8;
        
        // Save trailer base position for ramp calculations
        this.trailerBasePosition = this.trailer.position.clone();

        // Camera target
        this.cameraTarget = new THREE.Vector3(0, 0, 0);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start animation loop
        this.animate();
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
    }
    
    createTrailer() {
        this.trailer = new THREE.Group();
        
        // Main longitudinal beams (left and right sides) - structural steel
        const beamGeom = new THREE.BoxGeometry(0.08, 0.08, 4);
        const beamMat = new THREE.MeshPhongMaterial({ color: 0x455a64 });      
        [-0.8, 0.8].forEach(x => {
            const beam = new THREE.Mesh(beamGeom, beamMat);
            beam.position.set(x, 0, -0.5);
            beam.castShadow = true;
            this.trailer.add(beam);
        });
        
        // Cross-members connecting the beams
        const crossGeom = new THREE.BoxGeometry(1.7, 0.06, 0.08);
        const crossMat = new THREE.MeshPhongMaterial({ color: 0x546e7a });
        const crossPositions = [-2.5, -0.5, 1.5];
        crossPositions.forEach(z => {
            const cross = new THREE.Mesh(crossGeom, crossMat);
            cross.position.set(0, -0.05, z);
            cross.castShadow = true;
            this.trailer.add(cross);
        });
        
        // Trailer tongue (front) - connects to frame
        const tongueGeometry = new THREE.BoxGeometry(0.08, 0.08, 1.0);
        const tongueMaterial = new THREE.MeshPhongMaterial({ color: 0x455a64 });
        const tongue = new THREE.Mesh(tongueGeometry, tongueMaterial);
        tongue.position.z = 3.0;  // connects to front of frame at z=2.5
        tongue.castShadow = true;
        tongue.receiveShadow = true;
        this.trailer.add(tongue);
        
        // Diagonal bracing beams connecting main beams to tongue
        const diagonalGeom = new THREE.BoxGeometry(0.08, 0.08, 1.3);
        const diagonalMat = new THREE.MeshPhongMaterial({ color: 0x455a64 });       
        [{ x: -0.4, rot: Math.atan(0.8) }, { x: 0.4, rot: -Math.atan(0.8) }].forEach(side => {
            const diag = new THREE.Mesh(diagonalGeom, diagonalMat);
            diag.position.set(side.x, 0, 2);
            diag.rotation.y = side.rot;
            diag.castShadow = true;
            this.trailer.add(diag);
        });
        
        // Front boat guides - shorter diagonal beams
        const frontGuideGeom = new THREE.BoxGeometry(0.08, 0.08, 0.4);
        const frontMarkerGeom = new THREE.BoxGeometry(0.16, 0.16, 0.02);
        const frontMarkerMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
        
        [{ x: -0.1, rot: Math.atan(0.8) }, { x: 0.1, rot: -Math.atan(0.8) }].forEach(side => {
            const frontGuide = new THREE.Mesh(frontGuideGeom, diagonalMat);
            frontGuide.position.set(side.x, 0.6, 2.35);
            frontGuide.rotation.y = side.rot;
            frontGuide.castShadow = true;
            this.trailer.add(frontGuide);
            
            // Black square marker on front guide
            const frontMarker = new THREE.Mesh(frontMarkerGeom, frontMarkerMat);
            frontMarker.position.set(0, 0, 0); // Center of the guide
            frontGuide.add(frontMarker);
        });
        
        // Vertical guide beams for boat guidance
        const verticalGuideGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
        const verticalGuideMat = new THREE.MeshPhongMaterial({ color: 0x90caf9 });
        
        // Tongue guide
        const guideTongueRear = new THREE.Mesh(verticalGuideGeom, verticalGuideMat);
        guideTongueRear.position.set(0, 0.4, 2.5);
        guideTongueRear.castShadow = true;
        this.trailer.add(guideTongueRear);

        // Trailer wheels (left and right) - darker, more industrial
        const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 32);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x212121 });       
        [-1.1, 1.1].forEach(x => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(x, -0.35, -0.5);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            this.trailer.add(wheel);
        });

        // Wheel hubs (visible centers)
        const hubGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.35, 16);
        const hubMat = new THREE.MeshPhongMaterial({ color: 0x9e9e9e });
        
        [-1.1, 1.1].forEach(x => {
            const hub = new THREE.Mesh(hubGeom, hubMat);
            hub.position.set(x, -0.35, -0.5);
            hub.rotation.z = Math.PI / 2;
            hub.castShadow = true;
            this.trailer.add(hub);
        });

        // Axle connecting the wheels
        const axleGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 16);
        const axleMat = new THREE.MeshPhongMaterial({ color: 0x606060 });
        const axle = new THREE.Mesh(axleGeom, axleMat);
        axle.position.set(0, -0.35, -0.5);
        axle.rotation.z = Math.PI / 2;
        axle.castShadow = true;
        this.trailer.add(axle);

        // Light fender guards above wheels
        const fenderGeom = new THREE.BoxGeometry(0.25, 0.08, 0.4);
        const fenderMat = new THREE.MeshPhongMaterial({ color: 0xff6f00 });
        
        [-1.1, 1.1].forEach(x => {
            const fender = new THREE.Mesh(fenderGeom, fenderMat);
            fender.position.set(x, 0.08, -0.5);
            fender.castShadow = true;
            this.trailer.add(fender);
        });
        
        // Boat guide rails (aluminum channel, one on each side)
        const railGeometry = new THREE.BoxGeometry(0.12, 0.1, 4.0);
        const railMaterial = new THREE.MeshPhongMaterial({ color: 0xb0bec5 });
        [-0.95, 0.95].forEach(x => {
            const rail = new THREE.Mesh(railGeometry, railMaterial);
            rail.position.set(x, 0.15, -0.5);
            rail.castShadow = true;
            this.trailer.add(rail);
        });

        // Rear pylons with depth markers
        const pylonGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
        const pylonMaterial = new THREE.MeshStandardMaterial({ color: 0xadd8e6 });
        const pylonPositions = [
            { x: -0.8, y: 0.4, z: -2.5 },
            { x: 0.8, y: 0.4, z: -2.5 },
        ];

        this.pylons = [];
        pylonPositions.forEach(pos => {
            const pylon = new THREE.Mesh(pylonGeometry, pylonMaterial);
            pylon.position.set(pos.x, pos.y, pos.z);
            this.trailer.add(pylon);
            this.pylons.push(pylon);

            const markerGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const markerMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
            for (let i = 0; i < 3; i++) {
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(0, -0.2 + i * 0.2, 0);
                pylon.add(marker);
            }
        });

        this.scene.add(this.trailer);
    }

    

    
    updateTrailerAngle(gyroX, gyroY, gyroZ) {
        // Store latest raw values
        this.currentGyroX = gyroX;
        this.currentGyroY = gyroY;
        this.currentGyroZ = gyroZ;

        // Convert degrees to radians and map axes to Three.js rotations
        // Mapping: gyroX -> rotation.x (pitch)
        //          gyroY -> rotation.z (roll)
        //          gyroZ -> rotation.y (yaw)
        // Visual amplification: real sensor angles are small (~1-15 deg),
        // multiply by 3 so tilt is clearly visible in the 3D view.
        const visualScale = 3.0;
        const radX = THREE.MathUtils.degToRad(gyroX * visualScale);
        const radY = THREE.MathUtils.degToRad(gyroY * visualScale);
        const radZ = THREE.MathUtils.degToRad(gyroZ * visualScale);

        // Invert pitch so positive gyro pitch results in the trailer tilting the other way
        // (keeps the tongue/front anchored visually)
        this.targetRotation.x = -radX;
        this.targetRotation.y = radZ;
        this.targetRotation.z = radY;
    }
    

    
    checkBoatWaterCollision() {
        if (!this.trailer || !this.water || !this.pylons || !this.pylons.length) return;

        const waterSurfaceY = this.water.position.y;
        const waterFill = document.getElementById('water-fill');
        const waterStatus = document.getElementById('water-status');

        // We need to check the world position of each marker on the first pylon
        const firstPylon = this.pylons[0];
        if (!firstPylon.children.length) return;

        const markerPositions = firstPylon.children.map(marker => {
            const worldPos = new THREE.Vector3();
            marker.getWorldPosition(worldPos);
            return worldPos;
        });

        const submergedCount = markerPositions.filter(pos => pos.y <= waterSurfaceY).length;
        
        if (submergedCount > 0) {
            waterStatus.textContent = `Depth: ${submergedCount}/3`;
            waterFill.style.height = `${(submergedCount / 3) * 100}%`;
            this.waterLevelSensor.textContent = 'In Water';
            this.waterLevelSensor.style.color = 'blue';
        } else {
            waterStatus.textContent = 'Out of Water';
            waterFill.style.height = `0%`;
            this.waterLevelSensor.textContent = 'Out of Water';
            this.waterLevelSensor.style.color = 'black';
        }
    }

    updateFloatSensor(isFloating) {
        // This function might no longer be needed for visual water level,
        // but we'll keep it in case it's used for other UI elements.
        this.floatSensor = isFloating;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());

        // Smoothly interpolate trailer rotation toward targetRotation
        if (this.trailer) {
            this.trailer.rotation.x = THREE.MathUtils.lerp(this.trailer.rotation.x, this.targetRotation.x, this.rotationLerp);
            this.trailer.rotation.y = THREE.MathUtils.lerp(this.trailer.rotation.y, this.targetRotation.y, this.rotationLerp);
            this.trailer.rotation.z = THREE.MathUtils.lerp(this.trailer.rotation.z, this.targetRotation.z, this.rotationLerp);
        }

        // Keep cameras focused on trailer centre
        if (this.trailer && this.trailerBasePosition) {
            const cx = this.trailer.position.x;
            const cy = this.trailer.position.y + 0.5;
            const cz = this.trailer.position.z;
            this.cameraTarget.set(cx, cy, cz);
            if (this.sideCamera) {
                this.sideCamera.position.set(cx + 3, 1.5, cz);
            }
            this.rearCamera.position.set(cx, 1.7, cz - 4.6);
            if (this.sideCamera) {
                this.sideCamera.lookAt(this.cameraTarget);
            }
            this.rearCamera.lookAt(this.cameraTarget);
        }

        // Render both views
        if (this.sideRenderer && this.sideCamera) {
            this.sideRenderer.render(this.scene, this.sideCamera);
        }
        if (this.rearRenderer && this.rearCamera) {
            this.rearRenderer.render(this.scene, this.rearCamera);
        }
    }
    
    onWindowResize() {
        // Update side view
        if (this.sideContainer && this.sideCamera && this.sideRenderer) {
            const sideWidth = this.sideContainer.clientWidth;
            const sideHeight = this.sideContainer.clientHeight;
            this.sideCamera.aspect = sideWidth / sideHeight;
            this.sideCamera.updateProjectionMatrix();
            this.sideRenderer.setSize(sideWidth, sideHeight);
        }
        
        // Update rear view
        if (this.rearContainer && this.rearCamera && this.rearRenderer) {
            const rearWidth = this.rearContainer.clientWidth;
            const rearHeight = this.rearContainer.clientHeight;
            this.rearCamera.aspect = rearWidth / rearHeight;
            this.rearCamera.updateProjectionMatrix();
            this.rearRenderer.setSize(rearWidth, rearHeight);
        }
    }
}

// Initialize visualizer
let visualizer = null;

// Initialize visualizer immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        visualizer = new TrailerVisualizer('side-view-container', 'rear-view-container');
    });
} else {
    // DOM is already ready since script is at end of body
    visualizer = new TrailerVisualizer('side-view-container', 'rear-view-container');
}
