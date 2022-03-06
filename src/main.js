import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import Square from './Square.js';
import { calculatePath } from './AStar.js';
import './css/style.css';

import RightTexture from './clouds/right.png';
import LeftTexture from './clouds/left.png';
import UpTexture from './clouds/up.png';
import DownTexture from './clouds/down.png';
import BackTexture from './clouds/back.png';
import FrontTexture from './clouds/front.png';

import RaceCarModel from './models/Low-Poly-Racing-Car.fbx';
import TreeModel from './models/tree.fbx';
import ConeModel from './models/cone.fbx';

const loader = new FBXLoader();

var carMesh = undefined;
var startMesh = undefined;
var endMesh = undefined;
var obstacleMesh = undefined;

var loadedModels = 0;

loader.load(
    RaceCarModel,
    ( object ) => {
        let car = object.children[2];
        car.scale.set(0.02, 0.02, 0.02);
        car.rotation.set(0, 0, 0);
        car.position.set(0, 1.5, 0);
        carMesh = car;
        loadedModels++;
    }
);

loader.load(
    ConeModel,
    ( object ) => {
        object.position.set(0, 1.1, 0);
        object.scale.set(30, 30, 30);
        let baseMaterialStart = new THREE.MeshStandardMaterial( {color: 0x7e963b} );
        let topMaterialStart = new THREE.MeshStandardMaterial( {color: 0xa2c445} );
        let baseMaterialEnd = new THREE.MeshStandardMaterial( {color: 0x730006} );
        let topMaterialEnd = new THREE.MeshStandardMaterial( {color: 0xb50009} );
        startMesh = object;
        startMesh.children[0].material = baseMaterialStart;
        startMesh.children[1].material = topMaterialStart;
        endMesh = startMesh.clone();
        endMesh.children[0].material = baseMaterialEnd;
        endMesh.children[1].material = topMaterialEnd;
        loadedModels++;
    }
);

loader.load(
    TreeModel,
    (object) => {
        let tree = object.children[0];
        let leafMaterial = new THREE.MeshStandardMaterial( {color: 0x006400} )
        tree.material[0] = leafMaterial;
        let trunkMaterial = new THREE.MeshStandardMaterial( {color: 0x7B3F00} )
        tree.material[1] = trunkMaterial;
        tree.scale.set(0.6, 0.6, 0.6);
        tree.position.set(0, 1, 0);
        obstacleMesh = tree;
        loadedModels++;
    }
)

var statusTextElement = document.getElementById("statusText");
var findPathButton = document.getElementById("findPathButton");
var startButton = document.getElementById("placeStartButton");
var endButton = document.getElementById("placeEndButton");
var restartButton = document.getElementById("restartButton");

var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
renderer.domElement.style.outline = "none";
renderer.domElement.style.border = "none";
document.body.appendChild(renderer.domElement);

var camera = new THREE.PerspectiveCamera(70, innerWidth/innerHeight, 0.01, 1000);
var controls = new OrbitControls(camera, renderer.domElement);
var hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xBBBBBB, 1); 
var textureLoader = new THREE.CubeTextureLoader();
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var vec = new THREE.Vector3();
var pos = new THREE.Vector3();
var geo = new THREE.BoxGeometry(60, 2, 60);
var material = new THREE.MeshStandardMaterial( {color: 0x2F9500} );
var plane = new THREE.Mesh( geo, material );
var squareX, squareY;

const light = new THREE.PointLight( 0xFFFFFF, 1, 150 );
light.position.set( 0, 100, 40 );
scene.add( light );

var objectToPlace;

var squares = [];
var placePosition = new THREE.Vector3();

controls.mouseButtons = {
	RIGHT: THREE.MOUSE.ROTATE
}

controls.enableKeys = false;
controls.enablePan = false;

for (var i = 0; i < 15; i++){
    squares.push([]);
    for (var j = 0; j < 15; j++){
        squares[i].push(new Square(j, i));
        squares[i][j].blocked = false;
        squares[i][j].closed = false;
    }
}

var pathFound;
var path = [];
var startSquare = undefined;
var endSquare = undefined;
var currentDrivingSquare;

var texture = textureLoader.load([
    RightTexture,
    LeftTexture,
    UpTexture,
    DownTexture,
    BackTexture,
    FrontTexture,
  ]);
scene.background = texture;

controls.maxDistance = 67.05;
controls.minDistance = 20;
renderer.setSize(innerWidth, innerHeight);
camera.position.set(0, 30, 60);
camera.lookAt(0, 0, 0);
scene.add(hemiLight);
scene.add(plane); 

var gameState = 'obstacle';
var lastGameState;

var distanceLeft = 0;
var axis;
var speed = 1;
var direction = 1;

var restartGame = () => {
    for (var i = 0; i < 15; i++){
        for (var j = 0; j < 15; j++){
            if (squares[i][j].mesh && squares[i][j].mesh.parent === scene) {
                scene.remove(squares[i][j].mesh);
                squares[i][j].mesh = undefined;
            }

            if (carMesh.parent === scene) {
                scene.remove(carMesh);
            }

            squares[i][j].blocked = false;
            squares[i][j].closed = false;
            lastGameState = undefined;
            startSquare = undefined;
            endSquare = undefined;
            startButton.disabled = false;
            endButton.disabled = false;
            findPathButton.disabled = true;
            gameState = 'obstacle';
            statusTextElement.innerText = "";
        }
    }
}

var moveCar = () => {
    if (distanceLeft > 0){
        if (axis == 'x') {
            carMesh.position.set(carMesh.position.x + speed*direction, carMesh.position.y, carMesh.position.z);
        } else {
            carMesh.position.set(carMesh.position.x, carMesh.position.y, carMesh.position.z + speed*direction);
        }
        distanceLeft -= speed;
    } else {
        if (--currentDrivingSquare == -1){
            gameState = 'ended';
            scene.remove(endSquare.mesh);
            return;
        }
        if (path[currentDrivingSquare].x*4 - 28 != carMesh.position.x){
            axis = 'x';
            direction = path[currentDrivingSquare].x*4 - 28 - carMesh.position.x > 0 ? 1 : -1;
            carMesh.rotation.set(0, direction > 0 ? 1.5 : -1.5, 0);
        } else {
            axis = 'y';
            direction = path[currentDrivingSquare].y*4 - 28 - carMesh.position.z > 0 ? 1 : -1;
            carMesh.rotation.set(0, direction > 0 ? 0 : -3, 0);
        }
        distanceLeft = 4; 
    }
}

var placeObject = function(type, mesh) {
    let clickedSquare = squares[squareY][squareX];
    if(gameState == 'obstacle' && clickedSquare.blocked){
        scene.remove(clickedSquare.mesh);
        clickedSquare.mesh = undefined;
        clickedSquare.blocked = false;
        return;
    }
    switch (type){
        case 'obstacle':
            if (clickedSquare == startSquare || clickedSquare == endSquare) {
                return;
            }
            clickedSquare.blocked = true;
            break;
        case 'start':
            if (clickedSquare == endSquare) {
                scene.remove(endSquare.mesh);
                endSquare = undefined;
                findPathButton.disabled = true;
            } else if (clickedSquare == startSquare){
                scene.remove(startSquare.mesh);
                startSquare = undefined;
                findPathButton.disabled = true;
                return;
            } else if (clickedSquare.blocked){
                scene.remove(clickedSquare.mesh);
                clickedSquare.mesh = undefined;
                clickedSquare.blocked = false;
            } 


            startSquare = clickedSquare;
            gameState = 'obstacle';
            
            if (endSquare && startSquare) {
                findPathButton.disabled = false;
            }

            break;
        case 'end':
            if (clickedSquare == startSquare) {
                scene.remove(startSquare.mesh);
                startSquare = undefined;
                findPathButton.disabled = true;
            } else if (clickedSquare == endSquare){
                scene.remove(endSquare.mesh);
                endSquare = undefined;
                findPathButton.disabled = true;
                return;
            } else if (clickedSquare.blocked){
                scene.remove(clickedSquare.mesh);
                clickedSquare.mesh = undefined;
                clickedSquare.blocked = false;
            }

            endSquare = clickedSquare;
            gameState = 'obstacle';
            
            if (endSquare && startSquare) {
                findPathButton.disabled = false;
            }
    }
    clickedSquare.mesh = mesh;
    clickedSquare.mesh.position.set(placePosition.x, placePosition.y, placePosition.z);
    scene.add(clickedSquare.mesh);
}

var showObjectPosition = (e, height, parent) => {
    vec.set(
        ( e.clientX / window.innerWidth ) * 2 - 1,
        - ( e.clientY / window.innerHeight ) * 2 + 1,
        0);
    
    vec.unproject( camera );
    
    vec.sub( camera.position ).normalize();
    
    var distance = - camera.position.y / vec.y;

    pos.copy( camera.position ).add( vec.multiplyScalar( distance ) );

    squareX = Math.floor((pos.x + 30)/4);
    squareY = Math.floor((pos.z + 30)/4);
    
    if (squareX >= 15){
        squareX = 14;
    } else if (squareX <= 0){
        squareX = 0;
    }

    if (squareY >= 15){
        squareY = 14;
    } else if (squareY <= 0){
        squareY = 0;
    }

    placePosition.set(-28 + squareX*4, height, -28 + squareY*4);
    objectToPlace.position.set(placePosition.x, placePosition.y, placePosition.z);
}   

findPathButton.addEventListener("click", (e) => {
        startButton.disabled = true;
        endButton.disabled = true;
        findPathButton.disabled = true;
        pathFound = calculatePath(squares, startSquare, endSquare)
        e.stopPropagation();
        if (pathFound){
            statusTextElement.innerText = "PATH FOUND";
            path = []
            let currentNode = endSquare
            while (currentNode != undefined){
                path.push(currentNode);
                currentNode = currentNode.parent;
            }
            carMesh.position.set(-28 + startSquare.x*4, 1.6, -28 + startSquare.y*4);
            scene.add(carMesh);
            gameState = 'driving';
            currentDrivingSquare = path.length - 1;
        } else {
            gameState = 'nopath';
            statusTextElement.innerText = "NO PATH FOUND";
        }
    }
);

restartButton.addEventListener("click", (e) => {
        e.stopPropagation();
        restartGame();
    }
);

startButton.addEventListener("click", (e) => {
        e.stopPropagation();
        gameState = 'start';
    }
);

endButton.addEventListener("click", (e) => {
        e.stopPropagation();
        gameState = 'end';
    }
);

animate();

function animate() {
    requestAnimationFrame(animate);
    if (loadedModels == 3){
        if (lastGameState != gameState) {
            if (objectToPlace) {
                scene.remove(objectToPlace);
            }
            switch(gameState){
                case 'start':
                    objectToPlace = startMesh.clone();
                    objectToPlace.position.set(placePosition.x, 1.1, placePosition.z);
                    let baseMaterialStart = new THREE.MeshStandardMaterial( {color: 0x7e963b} );
                    let topMaterialStart = new THREE.MeshStandardMaterial( {color: 0xa2c445} );
                    baseMaterialStart.transparent = true;
                    baseMaterialStart.opacity = 0.6;
                    topMaterialStart.transparent = true;
                    topMaterialStart.opacity = 0.6;
                    objectToPlace.children[0].material = baseMaterialStart;
                    objectToPlace.children[1].material = topMaterialStart;
                    scene.add(objectToPlace);
                    window.onclick = () => placeObject('start', startMesh);
                    window.onmousemove = (e) => showObjectPosition(e, 1.1); 
                    break;
                case 'obstacle':
                    objectToPlace = obstacleMesh.clone();
                    objectToPlace.position.set(placePosition.x, 1, placePosition.z);
                    let leafMaterial = new THREE.MeshStandardMaterial( {color: 0x006400} )
                    let trunkMaterial = new THREE.MeshStandardMaterial( {color: 0x7B3F00} )
                    let materials = [leafMaterial, trunkMaterial];
                    objectToPlace.material = materials;
                    objectToPlace.material[0].transparent = true;
                    objectToPlace.material[0].opacity = 0.6;
                    objectToPlace.material[1].transparent = true;
                    objectToPlace.material[1].opacity = 0.6;
                    scene.add(objectToPlace);
                    window.onclick = () => placeObject('obstacle', obstacleMesh.clone());
                    window.onmousemove = (e) => showObjectPosition(e, 1); 
                    break;
                case 'end':
                    objectToPlace = endMesh.clone();
                    objectToPlace.position.set(placePosition.x, 1.1, placePosition.z);
                    let baseMaterialEnd = new THREE.MeshStandardMaterial( {color: 0x730006} );
                    let topMaterialEnd = new THREE.MeshStandardMaterial( {color: 0xb50009} );
                    baseMaterialEnd.transparent = true;
                    baseMaterialEnd.opacity = 0.6;
                    topMaterialEnd.transparent = true;
                    topMaterialEnd.opacity = 0.6;
                    objectToPlace.children[0].material = baseMaterialEnd;
                    objectToPlace.children[1].material = topMaterialEnd;
                    scene.add(objectToPlace);
                    window.onclick = () => placeObject('end', endMesh);
                    window.onmousemove = (e) => showObjectPosition(e, 1.1); 
                    break;
                case 'nopath':
                case 'driving':
                    window.onclick = undefined;
                    window.onmousemove = undefined;
                    scene.remove(objectToPlace);
                    break;  
            }
            lastGameState = gameState;
        }
        if (gameState == 'driving'){
            moveCar();
        }
        renderer.render(scene, camera);
    }
}
