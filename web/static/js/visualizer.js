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
        this.boat = null;
        this.water = null;
        
        this.currentGyroX = 0;
        this.currentGyroY = 0;
        this.currentGyroZ = 0;
        
        this.currentDistanceLeft = 0;
        this.currentDistanceRight = 0;
        
        this.floatSensor = false;
        
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
        this.createBoat();
        this.createWater();
        this.createGround();
        
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
        
        // Trailer frame (hull-like structure)
        const frameGeometry = new THREE.BoxGeometry(2, 0.5, 6);
        const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x2196f3 });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.castShadow = true;
        frame.receiveShadow = true;
        this.trailer.add(frame);
        
        // Trailer tongue (front)
        const tongueGeometry = new THREE.BoxGeometry(0.15, 0.2, 1);
        const tongueMaterial = new THREE.MeshPhongMaterial({ color: 0x1565c0 });
        const tongue = new THREE.Mesh(tongueGeometry, tongueMaterial);
        tongue.position.z = 3.5;
        tongue.castShadow = true;
        tongue.receiveShadow = true;
        this.trailer.add(tongue);
        
        // Trailer wheels (left and right)
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        const wheelLeft = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelLeft.position.set(-1.2, -0.3, 1);
        wheelLeft.rotation.z = Math.PI / 2;
        wheelLeft.castShadow = true;
        this.trailer.add(wheelLeft);
        
        const wheelRight = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRight.position.set(1.2, -0.3, 1);
        wheelRight.rotation.z = Math.PI / 2;
        wheelRight.castShadow = true;
        this.trailer.add(wheelRight);
        
        // Rails for boat guidance
        this.createRails();
        
        this.scene.add(this.trailer);
    }
    
    createRails() {
        // Left rail
        const railLeftGeometry = new THREE.BoxGeometry(0.1, 0.3, 5.5);
        const railMaterial = new THREE.MeshPhongMaterial({ color: 0xff9800 });
        const railLeft = new THREE.Mesh(railLeftGeometry, railMaterial);
        railLeft.position.set(-1.1, 0.3, -0.5);
        railLeft.castShadow = true;
        this.trailer.add(railLeft);
        
        // Right rail
        const railRight = new THREE.Mesh(railLeftGeometry, railMaterial);
        railRight.position.set(1.1, 0.3, -0.5);
        railRight.castShadow = true;
        this.trailer.add(railRight);
    }
    
    createBoat() {
        this.boat = new THREE.Group();
        
        // Boat hull
        const hullGeometry = new THREE.BoxGeometry(1.2, 0.6, 3);
        const hullMaterial = new THREE.MeshPhongMaterial({ color: 0xffc107 });
        const hull = new THREE.Mesh(hullGeometry, hullMaterial);
        hull.position.y = -0.15;
        hull.castShadow = true;
        hull.receiveShadow = true;
        this.boat.add(hull);
        
        // Boat cabin
        const cabinGeometry = new THREE.BoxGeometry(1, 0.8, 1.2);
        const cabinMaterial = new THREE.MeshPhongMaterial({ color: 0xfff3e0 });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.set(0, 0.5, -0.5);
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        this.boat.add(cabin);
        
        // Motor/prop
        const propGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.4);
        const propMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const prop = new THREE.Mesh(propGeometry, propMaterial);
        prop.position.set(0, -0.4, 1.6);
        prop.castShadow = true;
        this.boat.add(prop);
        
        // Position boat on trailer
        this.boat.position.set(0, 0.5, 0);
        
        this.trailer.add(this.boat);
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
        this.scene.add(ground);
    }
    
    updateTrailerAngle(gyroX, gyroY, gyroZ) {
        // Update rotation based on gyro data
        this.currentGyroX = gyroX;
        this.currentGyroY = gyroY;
        this.currentGyroZ = gyroZ;
        
        // Convert degrees to radians
        const radX = THREE.MathUtils.degToRad(gyroX);
        const radY = THREE.MathUtils.degToRad(gyroY);
        const radZ = THREE.MathUtils.degToRad(gyroZ);
        
        // Apply rotation (pitch, roll, yaw)
        this.trailer.rotation.x = radX;
        this.trailer.rotation.y = radZ;
        // radY (roll) applied separately if needed
    }
    
    updateBoatPosition(distanceLeft, distanceRight) {
        // Distance sensors: 0-3000mm
        // Calculate lateral offset based on distance difference
        this.currentDistanceLeft = distanceLeft;
        this.currentDistanceRight = distanceRight;
        
        // Normalize distances to -1 to 1 range (3000mm = max distance)
        const normalizedLeft = Math.max(-1, Math.min(1, 1 - (distanceLeft / 3000)));
        const normalizedRight = Math.max(-1, Math.min(1, 1 - (distanceRight / 3000)));
        
        // Calculate boat offset from center
        const differenceRatio = (normalizedRight - normalizedLeft) * 0.5;
        
        // Move boat left/right on the trailer (-1 to 1 range)
        this.boat.position.x = Math.max(-0.4, Math.min(0.4, differenceRatio));
        
        // Boat should move forward/backward based on distance average
        const averageDistance = (distanceLeft + distanceRight) / 2;
        const boatProgress = Math.max(-2.5, Math.min(1.5, 2.5 - (averageDistance / 600)));
        this.boat.position.z = boatProgress;
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
        this.renderer.render(this.scene, this.camera);
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
