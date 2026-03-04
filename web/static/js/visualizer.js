/**
 * 3D Visualization for ATS Trailer
 * Uses Three.js to render and animate the trailer and boat
 */

class TrailerVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.trailer = null;
        this.water = null;
        this.ground = null;
        
        this.currentGyroX = 0;
        this.currentGyroY = 0;
        this.currentGyroZ = 0;
        
        this.currentDistanceLeft = 0;
        this.currentDistanceRight = 0;
        
        this.floatSensor = false;

        // Target rotation (radians) and smoothing
        this.targetRotation = new THREE.Euler(0, 0, 0, 'XYZ');
        this.rotationLerp = 0.08; // smoothing factor (0-1)
        this.positionLerp = 0.08; // smoothing for position changes
        this.maxLateralSlide = 0.6; // meters lateral slide left/right
        
        this.init();
    }
    
    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1f2e);
        
        // Camera setup
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, 3, 6);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        
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

        // Camera orbit / touch controls state
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.orbit = {
            theta: Math.PI / 2, // horizontal angle
            phi: Math.PI / 6,   // vertical angle
            radius: 6,
            minRadius: 3,
            maxRadius: 20,
        };
        this.isPointerDown = false;
        this.pointer = {x: 0, y: 0};
        this.prevPointer = {x: 0, y: 0};
        this.addPointerControls();

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
        
        const beamLeft = new THREE.Mesh(beamGeom, beamMat);
        beamLeft.position.set(-0.8, 0, -0.5);
        beamLeft.castShadow = true;
        this.trailer.add(beamLeft);
        
        const beamRight = new THREE.Mesh(beamGeom, beamMat);
        beamRight.position.set(0.8, 0, -0.5);
        beamRight.castShadow = true;
        this.trailer.add(beamRight);
        
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
        
        // Triangle bracing for structural appearance
        const bracingGeom = new THREE.BoxGeometry(0.06, 0.06, 0.5);
        const bracingMat = new THREE.MeshPhongMaterial({ color: 0x37474f });
        for (let i = 0; i < 4; i++) {
            const brace = new THREE.Mesh(bracingGeom, bracingMat);
            brace.position.set(-0.7, 0.15, -1.5 + i * 1.5);
            brace.rotation.z = Math.PI / 4;
            brace.castShadow = true;
            this.trailer.add(brace);
            const brace2 = brace.clone();
            brace2.position.x = 0.7;
            this.trailer.add(brace2);
        }
        
        // Trailer tongue (front) - connects to frame
        const tongueGeometry = new THREE.BoxGeometry(0.08, 0.08, 1.0);
        const tongueMaterial = new THREE.MeshPhongMaterial({ color: 0x1565c0 });
        const tongue = new THREE.Mesh(tongueGeometry, tongueMaterial);
        tongue.position.z = 3.0;  // connects to front of frame at z=2.5
        tongue.castShadow = true;
        tongue.receiveShadow = true;
        this.trailer.add(tongue);
        
        // Trailer wheels (left and right) - darker, more industrial
        const wheelGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 32);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x212121 });
        
        const wheelLeft = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelLeft.position.set(-1.1, -0.35, -0.5);
        wheelLeft.rotation.z = Math.PI / 2;
        wheelLeft.castShadow = true;
        this.trailer.add(wheelLeft);
        
        const wheelRight = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRight.position.set(1.1, -0.35, -0.5);
        wheelRight.rotation.z = Math.PI / 2;
        wheelRight.castShadow = true;
        this.trailer.add(wheelRight);

        // Wheel hubs (visible centers)
        const hubGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.35, 16);
        const hubMat = new THREE.MeshPhongMaterial({ color: 0x9e9e9e });
        const hubLeft = new THREE.Mesh(hubGeom, hubMat);
        hubLeft.position.set(-1.1, -0.35, -0.5);
        hubLeft.rotation.z = Math.PI / 2;
        hubLeft.castShadow = true;
        this.trailer.add(hubLeft);
        const hubRight = hubLeft.clone();
        hubRight.position.x = 1.1;
        this.trailer.add(hubRight);

        // Light fender guards above wheels
        const fenderGeom = new THREE.BoxGeometry(0.25, 0.08, 0.4);
        const fenderMat = new THREE.MeshPhongMaterial({ color: 0xff6f00 });
        const fLeft = new THREE.Mesh(fenderGeom, fenderMat);
        fLeft.position.set(-1.1, 0.08, -0.5);
        fLeft.castShadow = true;
        this.trailer.add(fLeft);
        const fRight = fLeft.clone();
        fRight.position.x = 1.1;
        this.trailer.add(fRight);
        
        // Rails for boat guidance
        this.createRails();       
        this.scene.add(this.trailer);
    }
    
    createRails() { 
        // Boat guide rails (aluminum channel, one on each side)
        const railGeometry = new THREE.BoxGeometry(0.12, 0.1, 4);
        const railMaterial = new THREE.MeshPhongMaterial({ color: 0xb0bec5 });
        
        const railLeft = new THREE.Mesh(railGeometry, railMaterial);
        railLeft.position.set(-0.95, 0.15, -0.5);
        railLeft.castShadow = true;
        this.trailer.add(railLeft);
        
        const railRight = new THREE.Mesh(railGeometry, railMaterial);
        railRight.position.set(0.95, 0.15, -0.5);
        railRight.castShadow = true;
        this.trailer.add(railRight);
    }
    

    
    createWater() {
        // Water plane (will show/hide based on float sensor)
        const waterGeometry = new THREE.PlaneGeometry(10, 15);
        const waterMaterial = new THREE.MeshPhongMaterial({
            color: 0x0277bd,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = -1;
        this.water.receiveShadow = true;
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
    

    
    updateFloatSensor(inWater) {
        this.floatSensor = inWater;
        
        // Show/hide water based on float sensor
        if (inWater) {
            this.water.visible = true;
            // Animate water slightly
            this.water.position.y = -1 + Math.sin(Date.now() * 0.001) * 0.05;
        } else {
            this.water.visible = false;
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());

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
            const maxSlide = 3.0; // max forward slide down the ramp
            
            // Compute slide amount: positive pitch (nose up) = slide backward toward water
            const slide = Math.sin(rampAngle) * maxSlide;

            // Update trailer position
            // Z: slides along ramp
            this.trailer.position.z = this.trailerBasePosition.z + slide;
            // Y: LOCKED on ground (wheels stay on ground, frame tilts)
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

            // Keep camera target centered on trailer
            this.cameraTarget.set(this.trailer.position.x, this.trailer.position.y + 0.5, this.trailer.position.z);
            this.updateCameraPosition();
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
        }

        // Make ground subtly respond (inverse small tilt for visual reference)
        if (this.ground) {
            // Make ground slope follow trailer pitch so ramp is visible under trailer
            const groundTargetX = this.targetRotation.x * 0.9; // follow pitch closely
            const groundTargetZ = -this.targetRotation.z * 0.9; // slope multiplier for roll
            this.ground.rotation.x = THREE.MathUtils.lerp(this.ground.rotation.x, -Math.PI / 2 + groundTargetX, this.rotationLerp);
            this.ground.rotation.z = THREE.MathUtils.lerp(this.ground.rotation.z || 0, groundTargetZ, this.rotationLerp);
        }

        this.renderer.render(this.scene, this.camera);
    }

    // Pointer / touch controls (simple orbit)
    addPointerControls() {
        const canvas = this.renderer.domElement;

        canvas.style.touchAction = 'none';

        canvas.addEventListener('pointerdown', (e) => {
            this.isPointerDown = true;
            this.prevPointer.x = e.clientX;
            this.prevPointer.y = e.clientY;
            canvas.setPointerCapture(e.pointerId);
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!this.isPointerDown) return;
            const dx = e.clientX - this.prevPointer.x;
            const dy = e.clientY - this.prevPointer.y;
            this.prevPointer.x = e.clientX;
            this.prevPointer.y = e.clientY;

            // Rotate orbit angles
            this.orbit.theta -= dx * 0.005;
            this.orbit.phi -= dy * 0.005;
            // Clamp phi
            this.orbit.phi = Math.max(0.1, Math.min(Math.PI / 2.2, this.orbit.phi));
            this.updateCameraPosition();
        });

        canvas.addEventListener('pointerup', (e) => {
            this.isPointerDown = false;
            try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.orbit.radius += e.deltaY * 0.01;
            this.orbit.radius = Math.max(this.orbit.minRadius, Math.min(this.orbit.maxRadius, this.orbit.radius));
            this.updateCameraPosition();
        }, { passive: false });

        // Initial camera position
        this.updateCameraPosition();
    }

    updateCameraPosition() {
        const r = this.orbit.radius;
        const x = r * Math.sin(this.orbit.phi) * Math.cos(this.orbit.theta);
        const z = r * Math.sin(this.orbit.phi) * Math.sin(this.orbit.theta);
        const y = r * Math.cos(this.orbit.phi);

        this.camera.position.set(this.cameraTarget.x + x, this.cameraTarget.y + y, this.cameraTarget.z + z);
        this.camera.lookAt(this.cameraTarget);
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// Initialize visualizer
let visualizer = null;

document.addEventListener('DOMContentLoaded', () => {
    visualizer = new TrailerVisualizer('canvas-container');
});
