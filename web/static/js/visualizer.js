/**
 * 3D Visualization for ATS Trailer
 * Uses Three.js to render and animate the trailer and boat
 */

class TrailerVisualizer {
    constructor(sideContainerId, rearContainerId) {
        this.sideContainer = document.getElementById(sideContainerId);
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

        // Target rotation (radians) and smoothing
        this.targetRotation = new THREE.Euler(0, 0, 0, 'XYZ');
        this.rotationLerp = 0.08; // smoothing factor (0-1)
        this.positionLerp = 0.08; // smoothing for position changes
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
        const sideWidth = this.sideContainer.clientWidth;
        const sideHeight = this.sideContainer.clientHeight;
        this.sideCamera = new THREE.PerspectiveCamera(75, sideWidth / sideHeight, 0.1, 1000);
        this.sideCamera.position.set(6, 2, 0); // Side view
        this.sideCamera.lookAt(0, 0, 0);
        
        // Rear Camera (from the back)
        const rearWidth = this.rearContainer.clientWidth;
        const rearHeight = this.rearContainer.clientHeight;
        this.rearCamera = new THREE.PerspectiveCamera(75, rearWidth / rearHeight, 0.1, 1000);
        this.rearCamera.position.set(0, 2, -6); // Rear view
        this.rearCamera.lookAt(0, 0, 0);
        
        // Side Renderer
        this.sideRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.sideRenderer.setSize(sideWidth, sideHeight);
        this.sideRenderer.shadowMap.enabled = true;
        this.sideContainer.appendChild(this.sideRenderer.domElement);
        
        // Rear Renderer
        this.rearRenderer = new THREE.WebGLRenderer({ antialias: true });
        this.rearRenderer.setSize(rearWidth, rearHeight);
        this.rearRenderer.shadowMap.enabled = true;
        this.rearContainer.appendChild(this.rearRenderer.domElement);
        
        // Lighting
        this.setupLighting();
        
        // Create 3D objects
        this.createTrailer();
        this.createWater();
        this.createGround();
        
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

    
    createWater() {
        const waterGeometry = new THREE.PlaneGeometry(50, 50);
        const waterMaterial = new THREE.MeshPhongMaterial({
            color: 0x0066ff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = -2.0; // Start below markers; will rise during backing simulation
        this.water.visible = false; // Show only when the first marker is touched
        this.scene.add(this.water);
    }
    
    createGround() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x8d6e63,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.5;
        ground.receiveShadow = true;
        this.ground = ground;
        this.scene.add(this.ground);
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
        const radX = THREE.MathUtils.degToRad(gyroX);
        const radY = THREE.MathUtils.degToRad(gyroY);
        const radZ = THREE.MathUtils.degToRad(gyroZ);

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
        let backingAmount = 0;

        // Smoothly interpolate trailer rotation toward targetRotation
        if (this.trailer) {
            this.trailer.rotation.x = THREE.MathUtils.lerp(this.trailer.rotation.x, this.targetRotation.x, this.rotationLerp);
            this.trailer.rotation.y = THREE.MathUtils.lerp(this.trailer.rotation.y, this.targetRotation.y, this.rotationLerp);
            this.trailer.rotation.z = THREE.MathUtils.lerp(this.trailer.rotation.z, this.targetRotation.z, this.rotationLerp);
        }

        // Move trailer along ramp based on pitch (targetRotation.x)
        if (this.trailer && this.trailerBasePosition) {
            // Map pitch to forward/backward slide along ramp
            const rampAngle = this.targetRotation.x; // radians
            const maxSlide = 5.0; // increased backing travel so water can reach top marker in simulation
            
            // Compute slide amount: positive pitch (nose up) = slide backward toward water
            const slide = Math.sin(rampAngle) * maxSlide;

            // Update trailer position
            // Z: slides along ramp
            this.trailer.position.z = this.trailerBasePosition.z + slide;
            
            // Keep trailer on land plane; water will rise instead of trailer sinking.
            backingAmount = Math.max(0, -slide);
            this.trailer.position.y = this.trailerBasePosition.y;

            // Lateral slide based on roll (targetRotation.z)
            const roll = this.targetRotation.z || 0;
            const lateralShift = Math.sin(roll) * this.maxLateralSlide;
            // Smooth lateral movement
            this.trailer.position.x = THREE.MathUtils.lerp(this.trailer.position.x || 0, this.trailerBasePosition.x + lateralShift, this.positionLerp);

            // Update boat position (now independent from trailer)
            if (this.boat) {
                // Calculate boat float depth based on pitch angle
                // Progressive floating: rear touches first, then lifts as trailer descends further
                
                // Calculate water contact level: 0 = on trailer, 1 = fully floating
                // Boat starts floating when pitch exceeds ~8 degrees
                const floatThreshold = 0.15; // radians (~8.6 degrees)
                const maxFloating = 0.9; // radians (~51 degrees)
                const contactRatio = Math.max(0, Math.min(1, (Math.abs(this.targetRotation.x) - floatThreshold) / (maxFloating - floatThreshold)));
                
                // When NOT floating: lock boat firmly to trailer
                if (contactRatio < 0.05) {
                    // Boat stays on trailer (no lerp, direct copy)
                    this.boat.position.x = this.trailer.position.x;
                    this.boat.position.y = this.trailer.position.y + 0.45;
                    this.boat.position.z = this.trailer.position.z - 0.6;
                } else {
                    // When floating: boat moves away from trailer into water
                    // Water surface is at Y = -1, boat floats at Y = -0.8 (0.2 above water)
                    const waterSurfaceY = -1.0;
                    const boatFloatingY = waterSurfaceY + 0.25;  // higher float clearance
                    
                    // Boat moves forward/away from the trailer as it starts to float
                    // Start position: rear of trailer, End position: center of water
                    const startZ = this.trailer.position.z - 0.6;
                    const endZ = this.water.position.z - 0.3;  // move away from ramp
                    const boatZPos = THREE.MathUtils.lerp(startZ, endZ, contactRatio);
                    
                    // Smoothly transition boat position
                    this.boat.position.x = THREE.MathUtils.lerp(this.boat.position.x, this.trailer.position.x + 0.1, 0.05);
                    this.boat.position.y = THREE.MathUtils.lerp(this.boat.position.y, boatFloatingY, 0.04);
                    this.boat.position.z = THREE.MathUtils.lerp(this.boat.position.z, boatZPos, 0.05);
                }
            }

            // Keep cameras focused on trailer
            this.cameraTarget.set(this.trailer.position.x, this.trailer.position.y + 0.5, this.trailer.position.z);
            
            // Update camera positions to follow trailer
            this.sideCamera.position.set(this.trailer.position.x + 6, 2, this.trailer.position.z);
            this.rearCamera.position.set(this.trailer.position.x, 2, this.trailer.position.z - 6);
            
            this.sideCamera.lookAt(this.cameraTarget);
            this.rearCamera.lookAt(this.cameraTarget);
        }

        // Make ground follow trailer horizontally so ramp stays under trailer
        if (this.ground && this.trailer) {
            // Move ground in Z to match trailer so the ramp appears beneath the trailer
            this.ground.position.z = this.trailer.position.z;
            // Ground Y stays FIXED at -1.5 so trailer wheels rest on it (don't move it down)
            this.ground.position.y = -1.5;
            // Align ground X to trailer so lateral slope stays under trailer
            this.ground.position.x = THREE.MathUtils.lerp(this.ground.position.x || 0, this.trailer.position.x, this.positionLerp);
        }

        // Make water follow trailer horizontally as well
        if (this.water && this.trailer) {
            this.water.position.z = this.trailer.position.z;
            this.water.position.x = this.trailer.position.x;

            // Raise water as trailer backs down; cap rise when top rear marker is reached.
            if (this.pylons && this.pylons.length && this.pylons[0].children.length) {
                const firstPylon = this.pylons[0];
                const markerYs = firstPylon.children.map(marker => {
                    const worldPos = new THREE.Vector3();
                    marker.getWorldPosition(worldPos);
                    return worldPos.y;
                }).sort((a, b) => a - b);

                const lowestMarkerY = markerYs[0];
                const topMarkerY = markerYs[markerYs.length - 1];
                const startWaterY = lowestMarkerY - 0.25;
                const riseStart = 0.30; // let trailer back down a bit before simulated float touch
                const riseDistance = 0.9;
                const riseT = THREE.MathUtils.clamp((backingAmount - riseStart) / riseDistance, 0, 1);
                const targetWaterY = THREE.MathUtils.lerp(startWaterY, topMarkerY, riseT);

                this.water.position.y = THREE.MathUtils.lerp(this.water.position.y, targetWaterY, this.waterLerp);

                // Keep water hidden until the waterline reaches the bottom rear pylon marker.
                const bottomMarkerTouched = this.water.position.y >= lowestMarkerY;
                this.water.visible = bottomMarkerTouched;
            }
        }

        // Make ground subtly respond (inverse small tilt for visual reference)
        if (this.ground) {
            // Make ground slope follow trailer pitch so ramp is visible under trailer
            const groundTargetX = this.targetRotation.x * 0.9; // follow pitch closely
            const groundTargetZ = -this.targetRotation.z * 0.9; // slope multiplier for roll
            this.ground.rotation.x = THREE.MathUtils.lerp(this.ground.rotation.x, -Math.PI / 2 + groundTargetX, this.rotationLerp);
            this.ground.rotation.z = THREE.MathUtils.lerp(this.ground.rotation.z || 0, groundTargetZ, this.rotationLerp);
        }

        this.checkBoatWaterCollision();
        
        // Render both views
        this.sideRenderer.render(this.scene, this.sideCamera);
        this.rearRenderer.render(this.scene, this.rearCamera);
    }
    
    onWindowResize() {
        // Update side view
        const sideWidth = this.sideContainer.clientWidth;
        const sideHeight = this.sideContainer.clientHeight;
        this.sideCamera.aspect = sideWidth / sideHeight;
        this.sideCamera.updateProjectionMatrix();
        this.sideRenderer.setSize(sideWidth, sideHeight);
        
        // Update rear view
        const rearWidth = this.rearContainer.clientWidth;
        const rearHeight = this.rearContainer.clientHeight;
        this.rearCamera.aspect = rearWidth / rearHeight;
        this.rearCamera.updateProjectionMatrix();
        this.rearRenderer.setSize(rearWidth, rearHeight);
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
