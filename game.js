// House Flip 3D - Three.js core implementation

let scene, camera, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

let currentTool = 'clean';
let money = 5000;
let exp = 0;
let trashCount = 0;
const totalTrash = 10;

const trashItems = [];
const walls = [];

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaf0, 0.8);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Создание дома
    createHouse();

    // События управления
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('click', onClick);
    window.addEventListener('resize', onWindowResize);

    // Настройка интерфейса инструментов
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            currentTool = target.getAttribute('data-tool');
            
            if (currentTool === 'sell') {
                sellHouse();
            }
        });
    });

    // Захват мыши
    document.body.addEventListener('click', () => {
        document.body.requestPointerLock();
    });

    let euler = new THREE.Euler(0, 0, 0, 'YXZ');
    document.addEventListener('mousemove', (event) => {
        if (document.pointerLockElement === document.body) {
            const movementX = event.movementX || event.mozMovementX || event.sMovementX || 0;
            const movementY = event.movementY || event.mozMovementY || event.sMovementY || 0;

            euler.setFromQuaternion(camera.quaternion);
            euler.y -= movementX * 0.002;
            euler.x -= movementY * 0.002;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
            camera.quaternion.setFromEuler(euler);
        }
    });
}

function createHouse() {
    // Пол
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Потолок
    const ceiling = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }));
    ceiling.position.y = 4;
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    // Стены
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x7c7c7c, roughness: 0.9 }); // Грязные стены
    
    // Задняя стена
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMat);
    backWall.position.set(0, 2, -6);
    backWall.receiveShadow = true;
    scene.add(backWall);
    walls.push(backWall);

    // Левая стена
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMat);
    leftWall.position.set(-6, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    walls.push(leftWall);

    // Правая стена
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMat);
    rightWall.position.set(6, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    walls.push(rightWall);

    // Мусор
    const trashGeo = new THREE.BoxGeometry(0.4, 0.3, 0.4);
    const trashMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d });
    
    for (let i = 0; i < totalTrash; i++) {
        const trash = new THREE.Mesh(trashGeo, trashMat);
        trash.position.set(
            (Math.random() - 0.5) * 10,
            0.15,
            (Math.random() - 0.5) * 10
        );
        trash.castShadow = true;
        scene.add(trash);
        trashItems.push(trash);
    }
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function onClick() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0); // Центр экрана
    raycaster.setFromCamera(mouse, camera);

    if (currentTool === 'clean') {
        const intersects = raycaster.intersectObjects(trashItems);
        if (intersects.length > 0) {
            const hit = intersects[0].object;
            scene.remove(hit);
            const index = trashItems.indexOf(hit);
            if (index > -1) trashItems.splice(index, 1);
            
            trashCount++;
            money += 50;
            exp += 25;
            updateUI();
        }
    } else if (currentTool === 'paint') {
        const intersects = raycaster.intersectObjects(walls);
        if (intersects.length > 0) {
            const hit = intersects[0].object;
            hit.material.color.set(0xffffff);
            hit.material.roughness = 0.4;
            exp += 50;
            money += 100;
            updateUI();
        }
    }
}

function sellHouse() {
    if (trashCount < totalTrash) {
        alert('Сначала уберите весь мусор в доме!');
        return;
    }
    alert(`Поздравляем! Дом успешно продан за $${money * 2}!`);
    money += 5000;
    trashCount = 0;
    updateUI();
    location.reload();
}

function updateUI() {
    document.getElementById('money').innerText = '$' + money;
    document.getElementById('exp').innerText = exp;
    document.getElementById('trash-count').innerText = trashCount;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    if (document.pointerLockElement === document.body) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 15.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 15.0 * delta;

        camera.translateX(-velocity.x * delta);
        camera.translateZ(velocity.z * delta);
        
        // Ограничение движения в пределах дома
        camera.position.x = Math.max(-5.5, Math.min(5.5, camera.position.x));
        camera.position.z = Math.max(-5.5, Math.min(5.5, camera.position.z));
        camera.position.y = 1.6;
    }

    prevTime = time;
    renderer.render(scene, camera);
}
