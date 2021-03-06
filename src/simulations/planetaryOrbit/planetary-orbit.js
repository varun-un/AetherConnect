import * as BABYLON from 'babylonjs'
import * as BGUI from 'babylonjs-gui'
import { TweenMax, Power2 } from "gsap"
import {rotatePlanet, animOrbit, orbitPath, visViva} from './planet-movements'
const earcut = window.earcut

//when browser is loaded, create the scene
var canvas = document.getElementById('canvas')
var engine = new BABYLON.Engine(canvas, true)
var voiceover = new Audio(require('./planetary-orbit-voiceover.mp3'))
var isPlaying = true
var showEarthVelocity = false, eccentricitySliderShowing = false
var checkbox
var rotationAnims, orbitAnims
//Babylon GUI stuff
var advancedTexture, eccentricitySlider
//For GSAP animations of equations
var circularEqDown = false, visVivaDown = false

var createScene = function () {
    var scene = new BABYLON.Scene(engine)
    scene.collisionsEnabled = true
    scene["planets"] = []

    //keep track of all pressed keys
    var pressedKeys = {};
    window.onkeyup = function(e) { pressedKeys[e.keyCode] = false; }
    window.onkeydown = function(e) { pressedKeys[e.keyCode] = true; }

    //gets skybox assets/texture
    var envTexture = BABYLON.CubeTexture.CreateFromImages([require("../../simAssets/skybox/milkyway/milkyway_px.jpg"), 
        require("../../simAssets/skybox/milkyway/milkyway_py.jpg"), require("../../simAssets/skybox/milkyway/milkyway_pz.jpg"), 
        require("../../simAssets/skybox/milkyway/milkyway_nx.jpg"), require("../../simAssets/skybox/milkyway/milkyway_ny.jpg"), 
        require("../../simAssets/skybox/milkyway/milkyway_nz.jpg")], scene, false);
    scene.createDefaultSkybox(envTexture, false, 1000)

    //set arc rotate cam
    var camera = new BABYLON.ArcRotateCamera("arcCamera", 0, 0, 7, BABYLON.Vector3.Zero(), scene)
    camera.attachControl(canvas, true)
    camera.collisionRadius = new BABYLON.Vector3(1,1,1)
    camera.checkCollisions = true
    camera.upperRadiusLimit = 600
    camera.pinchPrecision = 85.0
    camera.wheelDeltaPercentage = 0.005
    camera.allowUpsideDown = true
    camera.panningAxis = new BABYLON.Vector3(1,1,0)
    camera.panningInertia = .9
    camera.panningSensibility = 850
    

    // Set up rendering pipeline
    var pipeline = new BABYLON.DefaultRenderingPipeline("default", true, scene)

    //Anti-Aliasing (add setting to enable/disable this)
    // pipeline.samples = 4;
    // pipeline.grainEnabled = true;
    // pipeline.grain.intensity = 3; 
    
    //change exposure/saturation
    scene.imageProcessingConfiguration.toneMappingEnabled = true
    scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES
    scene.imageProcessingConfiguration.exposure = 3


    //------------------Meshes & Lights----------------------
    //create particle system from provided assets: https://github.com/BabylonJS/Assets/blob/master/particles/systems/sun.json
    var sunParticles = new BABYLON.ParticleHelper.CreateAsync("sun", scene).then(function(set) {
        set.systems[0].renderingGroupId = 3
        set.systems[1].renderingGroupId = 1
        set.systems[2].renderingGroupId = 3

        //scale up sun
        set._emitterNode.scaling = new BABYLON.Vector3(2,2,2)
        set.systems[0].maxScaleX = 2.4
        set.systems[0].maxScaleY = 2.4
        set.systems[1].maxScaleX = 1.75
        set.systems[1].maxScaleY = 1.75
        set.systems[2].maxScaleX = 2.75
        set.systems[2].maxScaleY = 2.75

        set.start()
    }).catch((issue) => console.error (issue));
    var sun = BABYLON.Mesh.CreateSphere("pseudoSun", 32, 4.5, scene)

    //create Earth
    var earth = BABYLON.Mesh.CreateSphere("earth", 32, .5, scene)
    earth.position.z = 10
    earth.renderingGroupId = 3
    scene.planets.push(earth)

    //create earth's texture
    var earthMat = new BABYLON.StandardMaterial("earth-material", scene)
    earthMat.diffuseTexture = new BABYLON.Texture(require("../../simAssets/earthTextures/2k-earth-daymap.jpg"), scene)
    earthMat.specularColor = new BABYLON.Color3(0, 0, 0)
    earth.material = earthMat

    var sunlight = new BABYLON.PointLight("sunlight", new BABYLON.Vector3(0,0,0), scene)
    sunlight.intensity = 1.5

    //environment lighting
    var downLight = new BABYLON.HemisphericLight("downlight", new BABYLON.Vector3(0, 1, 0), scene)
    downLight.intensity = 0.2
    downLight.includedOnlyMeshes = scene.planets
    var upLight = new BABYLON.HemisphericLight("uplight", new BABYLON.Vector3(0, -1, 0), scene)
    upLight.intensity = 0.2
    upLight.includedOnlyMeshes = scene.planets


    //set settings for focusing and camera action w/ meshes in scene
    for (var i = 1; i < scene.meshes.length; i++){
        scene.meshes[i].checkCollisions = true
        scene.meshes[i].isPickable = true

        //make camera focus on mesh when mesh clicked and 'f' key held
        scene.meshes[i].actionManager = new BABYLON.ActionManager(scene)

        scene.meshes[i].actionManager.registerAction(new BABYLON.InterpolateValueAction(                  //camera rotate
            BABYLON.ActionManager.OnLeftPickTrigger, camera, 'target', scene.meshes[i].position, 300,
            new BABYLON.PredicateCondition(scene.meshes[i].actionManager, () => pressedKeys["70"])));

        scene.meshes[i].actionManager.registerAction(new BABYLON.InterpolateValueAction(                  //zoom
            BABYLON.ActionManager.OnLeftPickTrigger, camera, 'radius', 1.5, 300,
            new BABYLON.PredicateCondition(scene.meshes[i].actionManager, () => pressedKeys["70"])));
    }


    //--------------------------Planet Animations------------------------
    //create animations for planet rotations
    rotationAnims = new BABYLON.AnimationGroup("rotationGroup")
    rotatePlanet(earth, 22.5, 1, rotationAnims)
    rotationAnims.play(true)


    //create animations for planet orbits
    orbitAnims = new BABYLON.AnimationGroup("orbitGroup")
    animOrbit(earth, 0.41671, 365.25, 10, orbitAnims, scene)
    orbitAnims.play(true)



    //----------------------------GUI-------------------------------
    //create Babylon GUI for controls at top of screen
    advancedTexture = BGUI.AdvancedDynamicTexture.CreateFullscreenUI("UI")
    advancedTexture.layer.layerMask = 2
    advancedTexture.renderScale = 1

    //speed control stack panel
    var speedPanel = new BGUI.StackPanel()
    speedPanel.width = (window.innerWidth / 3)+ "px"
    speedPanel.horizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_LEFT
    speedPanel.verticalAlignment = BGUI.Control.VERTICAL_ALIGNMENT_TOP
    advancedTexture.addControl(speedPanel)

    //converts the slider's value into a readable string
    const speedString = function(sliderValue) {

        if (sliderValue === 0){
            return "Paused"
        }
        var conversion = "";
        if (sliderValue === 730){
            conversion = "1 Earth year"
        }
        else if (sliderValue > 60){
            conversion = Math.round(sliderValue / 2 / 30 * 100) / 100 + " Earth months"
        }
        else if (sliderValue === 60){
            conversion = "1 Earth month"
        }
        else if (sliderValue > 14){
            conversion = Math.round(sliderValue / 2 / 7 * 10) / 10 + " Earth weeks"
        }
        else if (sliderValue === 14){
            conversion = "1 Earth week"
        }
        else if (sliderValue === 2){
            conversion = "1 Earth day"
        }
        else {
            conversion = Math.round(sliderValue / 2 * 10) / 10 + " Earth days"
        }
        return "Speed: " + Math.round(sliderValue * 43200) + "x   |   1 second = " + conversion
    }

    //text for and slider for the speed
    var speedHeader = new BGUI.TextBlock()
    speedHeader.text = speedString(1)
    speedHeader.height = "40px"
    speedHeader.widthInPixels = speedPanel.widthInPixels
    speedHeader.color = "white"
    speedHeader.fontSize = 16
    speedHeader.fontFamily = 'Roboto'
    speedHeader.fontStyle = 'Light 100'
    speedHeader.textHorizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_CENTER
    speedHeader.marginTop = "10px"
    speedPanel.addControl(speedHeader)
    
    var speedSlider = new BGUI.Slider()
    speedSlider.horizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_CENTER
    speedSlider.minimum = 0
    speedSlider.maximum = 730
    speedSlider.color = "#FF8400"
    speedSlider.background = "#050505"
    speedSlider.value = 1
    speedSlider.height = "20px"
    speedSlider.width = (window.innerWidth / 3 - 50)+ "px"
    speedSlider.onValueChangedObservable.add(function(value) {
        speedHeader.text = speedString(value)
        orbitAnims.speedRatio = value

        //cap the rotation speed at 10pi radians/sec
        if (value <= 20) {
            rotationAnims.speedRatio = value;
        }
        else {
            rotationAnims.speedRatio = 20;
        }
    });
    speedPanel.addControl(speedSlider);


    //stack panel for velocity vector checkbox
    var velocityPanel = new BGUI.StackPanel() 
    velocityPanel.width = "140px" 
    velocityPanel.height = "60px"
    velocityPanel.isVertical = false 
    velocityPanel.horizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_RIGHT 
    velocityPanel.verticalAlignment = BGUI.Control.VERTICAL_ALIGNMENT_TOP 
    advancedTexture.addControl(velocityPanel) 

    checkbox = new BGUI.Checkbox() 
    checkbox.width = "20px" 
    checkbox.height = "20px" 
    checkbox.isChecked = false 
    checkbox.color = "orange" 
    checkbox.background = "#050505"
    checkbox.onIsCheckedChangedObservable.add(function(value) {
        if (showEarthVelocity) {
            deleteVelocityVector()
        }
        else {
            createVelocityVector()
        }
    }) 

    var velocityHeader = new BGUI.TextBlock() 
    velocityHeader.text = "show velocity" 
    velocityHeader.width = "103px" 
    velocityHeader.marginLeft = "5px" 
    velocityHeader.fontSize = 16
    velocityHeader.fontFamily = "Roboto"
    velocityHeader.textHorizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_LEFT 
    velocityHeader.color = "white" 
    velocityPanel.addControl(velocityHeader)  
    velocityPanel.addControl(checkbox)



    //-----------------Dragging Controls---------------
    //Plane on xz axis for projection of mouse rays when dragging
    var orbitPlane = BABYLON.MeshBuilder.CreateGround("orbitPlane", {width:500, height:500}, scene);
    orbitPlane.isPickable = true
    orbitPlane.isBlocker = false
    orbitPlane.isVisible = false
    scene.pointerDownPredicate = function(mesh) {
        return mesh.isPickable;
    }

    //Uses orbitPlane to pick mouse position
    var startingPoint;
    var currentMesh;
    var getPickPosition = function () {
        var pickinfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh == orbitPlane; });
        if (pickinfo.hit) {
            return pickinfo.pickedPoint;
        }
        return null;
    }
    //enable dragging controls
    var pointerDragDown = function (mesh) {
        currentMesh = mesh;
        startingPoint = getPickPosition();
        if (startingPoint) {                
            setTimeout(function () {
                camera.detachControl(canvas)
            }, 0);
        }
    }
    //disable dragging controls
    var pointerUp = function () {
        if (startingPoint) {
            camera.attachControl(canvas, true)
            startingPoint = null
            return
        }
    }
    //when cursor moves
    var pointerMove = function () {
        if (!startingPoint) {
            return
        }
        var current = getPickPosition()
        if (!current) {
            return
        }

        //check which quadrant the mouse is in and set the appropriate section of ellipse to check for it
        var startIndex, endIndex
        if (current.x <=0 && current.z >= 0){
            startIndex = 0
            endIndex = currentMesh.ellipse.length / 4
        }
        else if (current.x <=0 && current.z <= 0){
            startIndex = currentMesh.ellipse.length / 4
            endIndex = currentMesh.ellipse.length / 2
        }
        else if (current.x > 0 && current.z <= 0){
            startIndex = currentMesh.ellipse.length / 2
            endIndex = 3 * currentMesh.ellipse.length / 4
        }
        else {
            startIndex = 3 * currentMesh.ellipse.length / 4
            endIndex = currentMesh.ellipse.length
        }

        //check for closest point to mouse on orbit path
        var closestFrame = startIndex
        var closestDist = current.subtract(currentMesh.ellipse[closestFrame]).length()
        for (var i = startIndex + 1; i < endIndex; i++){
            if (current.subtract(currentMesh.ellipse[i]).length() <= closestDist){
                closestDist = current.subtract(currentMesh.ellipse[i]).length()
                closestFrame = i
            }
        }
        orbitAnims.goToFrame(closestFrame)
    }

    //call methods when mouse clicked or dragged
    scene.onPointerObservable.add((pointerInfo) => {      		
        switch (pointerInfo.type) {
			case BABYLON.PointerEventTypes.POINTERDOWN:
                //if for a drag on a planet, call the method
				if(pointerInfo.pickInfo.hit && scene.planets.includes(pointerInfo.pickInfo.pickedMesh) && pressedKeys["68"]) {
                    pointerDragDown(pointerInfo.pickInfo.pickedMesh)
                }
				break
			case BABYLON.PointerEventTypes.POINTERUP:
                pointerUp()
				break
			case BABYLON.PointerEventTypes.POINTERMOVE:          
                pointerMove()
				break
        }
    });



    //--------------Debugging Axis----------------
    // function showWorldAxis(size) {
    //     var makeTextPlane = function(text, color, size) {
    //         var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
    //         dynamicTexture.hasAlpha = true;
    //         dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
    //         var plane = BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
    //         plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
    //         plane.material.backFaceCulling = false;
    //         plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
    //         plane.material.diffuseTexture = dynamicTexture;
    //     return plane;
    //         };
    //     var axisX = BABYLON.Mesh.CreateLines("axisX", [ 
    //         BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
    //         new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    //         ], scene);
    //     axisX.color = new BABYLON.Color3(1, 0, 0);
    //     var xChar = makeTextPlane("X", "red", size / 10);
    //     xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
    //     var axisY = BABYLON.Mesh.CreateLines("axisY", [
    //         BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0), 
    //         new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
    //         ], scene);
    //     axisY.color = new BABYLON.Color3(0, 1, 0);
    //     var yChar = makeTextPlane("Y", "green", size / 10);
    //     yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
    //     var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
    //         BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
    //         new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
    //         ], scene);
    //     axisZ.color = new BABYLON.Color3(0, 0, 1);
    //     var zChar = makeTextPlane("Z", "blue", size / 10);
    //     zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
    // };
    // showWorldAxis(15);

    // function localAxes(size, mesh) {
    //     var pilot_local_axisX = BABYLON.Mesh.CreateLines("pilot_local_axisX", [ 
    //     new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
    //     new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    //     ], scene);
    //     pilot_local_axisX.color = new BABYLON.Color3(1, 0, 0);
    
    //     var pilot_local_axisY = BABYLON.Mesh.CreateLines("pilot_local_axisY", [
    //         new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
    //         new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
    //     ], scene);
    //     pilot_local_axisY.color = new BABYLON.Color3(0, 1, 0);
    
    //     var pilot_local_axisZ = BABYLON.Mesh.CreateLines("pilot_local_axisZ", [
    //         new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
    //         new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
    //         ], scene);
    //     pilot_local_axisZ.color = new BABYLON.Color3(0, 0, 1);
    
    //     var local_origin = mesh.clone("testerHee");
    //     local_origin.isVisible = false;
        
    //     pilot_local_axisX.parent = local_origin;
    //     pilot_local_axisY.parent = local_origin;
    //     pilot_local_axisZ.parent = local_origin; 
        
    //     return local_origin;
        
    // }
    //localAxes(4, earth);

    //loading screen
    engine.displayLoadingUI();
    scene.executeWhenReady(function() {
        engine.hideLoadingUI();
    })

    return scene;
}

var scene = createScene()
engine.runRenderLoop(function () {    

    //planet rotations and movements
    for (var i = 0; i < scene.planets.length; i++){
        scene.planets[i].rotate(BABYLON.Axis.Y, scene.planets[i].rotYLocal - scene.planets[i].prevRotYLocal, BABYLON.Space.LOCAL)
        scene.planets[i].prevRotYLocal = scene.planets[i].rotYLocal

        scene.planets[i].setAbsolutePosition(scene.planets[i].ellipse[Math.floor(scene.planets[i].orbitSegment)])
    }
    
    
    //earth velocity vector
    if (showEarthVelocity && scene.getMeshByName("velocityVector") != null){
        
        var velocityVector = scene.getMeshByName("velocityVector")
        var earth = scene.getMeshByName("earth")
        
        //get velocity of earth
        var velocity = visViva(149600000, earth.position.length() * 14960000)
        
        velocityVector.updateFunction(velocityVector, velocityVector.shape, velocityVector.path, velocity / 30, earth.position,
            velocityVector.velocityVectorDirections[Math.floor(earth.orbitSegment)])
            
    }
        
    scene.render()
    });

window.addEventListener("resize", function () {
    engine.resize()
});


//-----------Panel Events--------------
var controlsCard = document.getElementsByClassName('controlsCard')[0]
controlsCard.addEventListener('click', startSim)

function startSim() {
    document.getElementById('canvas').style.filter = 'blur(0px)'

    TweenMax.to('.controlsCard', 2, {
        opacity:0, 
        y:'-112%', 
        ease:Power2.easeOut
    })

    controlsCard.removeEventListener('click', startSim)

    voiceover.play()

    //set audio slider max to voiceover duration
    audioSlider.max = voiceover.duration
}

//--------------Audioplayer----------------
var playButton = document.getElementById("audioButton")
playButton.addEventListener('click', pauseAudio)

function pauseAudio() {
    if (isPlaying) {
        voiceover.pause()
        isPlaying = false
        playButton.src = require('../../simAssets/audioIcons/play button.png')
    }
    else {
        voiceover.play()
        isPlaying = true
        playButton.src = require('../../simAssets/audioIcons/pause button.png')
    }
}

var audioSlider = document.getElementById("audioSlider")
var audioDuration = document.getElementById("audioDuration")

//use html audioSlider to control voiceover duration
audioSlider.addEventListener('input', function() {  
    voiceover.currentTime = audioSlider.value
})

//method to convert seconds to minutes and seconds
function getMinutes(time) {
    var minutes = Math.floor(time / 60)
    var seconds = time % 60
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds
}

//when audio slider change, update the audio duration
audioSlider.addEventListener('input', function() {
    audioDuration.innerHTML = getMinutes(audioSlider.value)
})


//every second, run the loop
setInterval(function () {

    //update the slider location
    audioSlider.value = voiceover.currentTime

    //if audio is at the end, call pauseAudio
    if (voiceover.currentTime >= voiceover.duration) {
        isPlaying = true
        pauseAudio()
    }

    audioDuration.innerHTML = getMinutes(audioSlider.value)




    //------------------Scene Events-------------------
    //add major and minor axis
    if (voiceover.currentTime > 43 && voiceover.currentTime < 300 && !(scene.getMeshByName("majorAxis"))) {
        console.log('bad')
        var earthPath = scene.getMeshByName("earth").ellipse

        var majorAxis = BABYLON.MeshBuilder.CreateLines("majorAxis", {points: [
            earthPath[0], earthPath[Math.floor(earthPath.length / 2)]
        ], updatable: true}, scene)
        majorAxis.color = BABYLON.Color3.Blue()

        var minorAxis = BABYLON.MeshBuilder.CreateLines("minorAxis", {points: [
            earthPath[16080], earthPath[earthPath.length - 16080]
        ], updatable: true}, scene)
        minorAxis.color = BABYLON.Color3.Green()
    }

    //add major and minor axis labels
    if (voiceover.currentTime > 47 && voiceover.currentTime < 91 && !(scene.getMeshByName("majorAxisLabel"))) {
        
        //add BGUI label with advanced dynamic texture to label major axis
        var majorAxisLabel = BABYLON.Mesh.CreatePlane("majorAxisLabel", 2, scene);
        majorAxisLabel.position = new BABYLON.Vector3(-.3, 0, -12.5)
        majorAxisLabel.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.GLOBAL)
        majorAxisLabel.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.GLOBAL)

        var majorAxisTexture = BGUI.AdvancedDynamicTexture.CreateForMesh(majorAxisLabel);

        var majorAxisText = new BGUI.TextBlock();
        majorAxisText.text = "major axis";
        majorAxisText.color = "blue";
        majorAxisText.fontSize = 162;
        majorAxisText.fontFamily = 'Roboto'
        majorAxisTexture.addControl(majorAxisText); 

        //add BGUI label with advanced dynamic texture to label minor axis
        var minorAxisLabel = BABYLON.Mesh.CreatePlane("minorAxisLabel", 2, scene);
        minorAxisLabel.position = new BABYLON.Vector3(-7.4, 0, -3.85)
        minorAxisLabel.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.GLOBAL)

        var minorAxisTexture = BGUI.AdvancedDynamicTexture.CreateForMesh(minorAxisLabel);

        var minorAxisText = new BGUI.TextBlock();
        minorAxisText.text = "minor axis";
        minorAxisText.color = "green";
        minorAxisText.fontSize = 162;
        minorAxisText.fontFamily = 'Roboto'
        minorAxisTexture.addControl(minorAxisText);
    }

    //create focus points
    if (voiceover.currentTime > 55 && voiceover.currentTime < 71 && !(scene.getMeshByName("focusPoint"))) {

        var c = 0.41671 * 10

        //create focal point
        var focusSphere = new BABYLON.Mesh.CreateSphere("focusPoint", 32, .4, scene)
        focusSphere.position = new BABYLON.Vector3(0, 0, -2 * c)

        var focusMat = new BABYLON.StandardMaterial("focusMat", scene)
        focusMat.emissiveColor = new BABYLON.Color3(.7, .7, .7)
        focusSphere.material = focusMat
    }

    //destroy focus points
    if ((voiceover.currentTime > 70 || voiceover.currentTime < 55) && scene.getMeshByName("focusPoint") != null) {
        scene.removeMesh(focusSphere)
        scene.getMeshByName("focusPoint").dispose()
    }

    //create perihelion and aphelion labels
    if (voiceover.currentTime > 82 && voiceover.currentTime < 226 && !(scene.getMeshByName("perihelionLabel"))) {

        //add BGUI label with advanced dynamic texture to label perihelion
        var perihelionLabel = BABYLON.Mesh.CreatePlane("perihelionLabel", 2, scene);
        perihelionLabel.position = new BABYLON.Vector3(0, 0, 7)
        perihelionLabel.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.GLOBAL)
        perihelionLabel.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.GLOBAL)
        var perihelionTexture = BGUI.AdvancedDynamicTexture.CreateForMesh(perihelionLabel);
        var perihelionText = new BGUI.TextBlock();
        perihelionText.text = "Perihelion";
        perihelionText.color = "white";
        perihelionText.fontSize = 162;
        perihelionText.fontFamily = 'Roboto'
        perihelionTexture.addControl(perihelionText);

        //add BGUI label with advanced dynamic texture to label aphelion
        var aphelionLabel = BABYLON.Mesh.CreatePlane("aphelionLabel", 2, scene);
        aphelionLabel.position = new BABYLON.Vector3(-.025, 0, -15.2)
        aphelionLabel.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.GLOBAL)
        aphelionLabel.rotate(BABYLON.Axis.Z, Math.PI / 2, BABYLON.Space.GLOBAL)
        var aphelionTexture = BGUI.AdvancedDynamicTexture.CreateForMesh(aphelionLabel);
        var aphelionText = new BGUI.TextBlock();
        aphelionText.text = "Aphelion";
        aphelionText.color = "white";
        aphelionText.fontSize = 162;
        aphelionText.fontFamily = 'Roboto'
        aphelionTexture.addControl(aphelionText);
    }

    
    //destroy axis labels
    if ((voiceover.currentTime > 90 || voiceover.currentTime < 47) && scene.getMeshByName("majorAxisLabel") != null) {
        scene.removeMesh(majorAxisLabel)
        scene.removeMesh(minorAxisLabel)

        scene.getMeshByName("majorAxisLabel").dispose()
        scene.getMeshByName("minorAxisLabel").dispose()
    }

    //create the shaded sectors
    if(voiceover.currentTime > 90 && voiceover.currentTime < 226 && !(scene.getMeshByName("rightSector"))) {

        var earthPath = scene.getMeshByName("earth").ellipse
        var rightSectorPoints = [new BABYLON.Vector2(0, 0)], leftSectorPoints = [new BABYLON.Vector2(0, 0)]

        //get the points for the right sector under 0
        for (var i = earthPath.length - Math.floor(earthPath.length / 24); i < earthPath.length; i++) {   
            rightSectorPoints.push(new BABYLON.Vector2(earthPath[i].x, earthPath[i].z))
        }
        //get the points for the right sector over 0
        for (var i = 0; i <= Math.floor(earthPath.length / 24); i++) {
            rightSectorPoints.push(new BABYLON.Vector2(earthPath[i].x, earthPath[i].z))
        }
        rightSectorPoints.push(new BABYLON.Vector2(0, 0))


        //get the points for the left sector
        for (var i = Math.floor(earthPath.length * 11 / 24); i <= Math.floor(earthPath.length * 13 / 24); i++) {
            leftSectorPoints.push(new BABYLON.Vector2(earthPath[i].x, earthPath[i].z))
        }
        leftSectorPoints.push(new BABYLON.Vector2(0, 0))

        //create the right sector
        var rightSector = new BABYLON.PolygonMeshBuilder("rightSector", rightSectorPoints, scene, earcut).build()
        var sectorMat = new BABYLON.StandardMaterial("rightSector", scene)
        sectorMat.emissiveColor = new BABYLON.Color3(1, 0, 0)
        rightSector.material = sectorMat

        //create the left sector
        var leftSector = new BABYLON.PolygonMeshBuilder("leftSector", leftSectorPoints, scene, earcut).build()
        leftSector.material = sectorMat

    }

    //GSAP Equation animations
    //Bring down the cirular velocity eq
    if (voiceover.currentTime > 169 && voiceover.currentTime < 195 && !circularEqDown) {

        TweenMax.to('#circularVelocity', 2, { 
            y:'250px', 
            ease:Power2.easeOut
        })
        circularEqDown = true
    }

    //Bring up the circular velocity eq
    if ((voiceover.currentTime > 195 || voiceover.currentTime < 170) && circularEqDown) {

        TweenMax.to('#circularVelocity', 2, { 
            y:'-250px', 
            ease:Power2.easeOut
        })
        circularEqDown = false
    }

    //Bring down the vis viva eq
    if (voiceover.currentTime > 209 && voiceover.currentTime < 228 && !visVivaDown) {

        TweenMax.to('#visViva', 2, {
            y:'250px',
            ease:Power2.easeOut
        })
        visVivaDown = true
    }

    //Bring up the vis viva eq
    if ((voiceover.currentTime > 228 || voiceover.currentTime < 209) && visVivaDown) {

        TweenMax.to('#visViva', 2, {
            y:'-250px',
            ease:Power2.easeOut
        })
        visVivaDown = false
    }

    //destroy the shaded sectors
    if ((voiceover.currentTime > 225 || voiceover.currentTime < 90) && scene.getMeshByName("rightSector") != null) {
        scene.removeMesh(rightSector)
        scene.removeMesh(leftSector)

        scene.getMeshByName("rightSector").dispose()
        scene.getMeshByName("leftSector").dispose()
    }

    //destroy the perihelion and aphelion labels
    if ((voiceover.currentTime > 225 || voiceover.currentTime < 83) && scene.getMeshByName("perihelionLabel") != null) {
        
        scene.removeMesh(scene.getMeshByName("perihelionLabel"))
        scene.removeMesh(scene.getMeshByName("aphelionLabel"))

        scene.getMeshByName("perihelionLabel").dispose()
        scene.getMeshByName("aphelionLabel").dispose()
    }

    //show eccentricity control slider
    if (voiceover.currentTime > 245 && !eccentricitySliderShowing) {

        eccentricitySliderShowing = true

        //eccentricity control stack panel
        var eccentricityPanel = new BGUI.StackPanel()
        eccentricityPanel.width = (window.innerWidth / 3) + "px"
        eccentricityPanel.horizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_CENTER
        eccentricityPanel.verticalAlignment = BGUI.Control.VERTICAL_ALIGNMENT_TOP
        advancedTexture.addControl(eccentricityPanel)

        //text for and slider for the speed
        var eccentricityHeader = new BGUI.TextBlock()
        eccentricityHeader.text = "Earth's eccentricity: 0.41671"
        eccentricityHeader.height = "40px"
        eccentricityHeader.widthInPixels = eccentricityPanel.widthInPixels
        eccentricityHeader.color = "white"
        eccentricityHeader.fontSize = 16
        eccentricityHeader.fontFamily = 'Roboto'
        eccentricityHeader.fontStyle = 'Light 100'
        eccentricityHeader.textHorizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_CENTER
        eccentricityHeader.marginTop = "10px"
        eccentricityPanel.addControl(eccentricityHeader)
        
        eccentricitySlider = new BGUI.Slider()
        eccentricitySlider.horizontalAlignment = BGUI.Control.HORIZONTAL_ALIGNMENT_CENTER
        eccentricitySlider.minimum = 0
        eccentricitySlider.maximum = .75
        eccentricitySlider.color = "#888888"
        eccentricitySlider.background = "#050505"
        eccentricitySlider.value = 0.41671
        eccentricitySlider.height = "20px"
        eccentricitySlider.width = (window.innerWidth / 3 - 50)+ "px"
        eccentricitySlider.onValueChangedObservable.add(function(value) {
            eccentricityHeader.text = "Earth's eccentricity: " + Math.round(eccentricitySlider.value * 10000) / 10000
            
            var earthTrack = scene.getMeshByName('earthTrack')
            var earth = scene.getMeshByName('earth')

            //change eccentricity
            var newPath = orbitPath(value, 365, 10)
            scene.removeMesh(earthTrack)
            earthTrack.dispose()
            earthTrack = BABYLON.MeshBuilder.CreateLines('earthTrack', {points: newPath, updatable:true}, scene)
            earth.ellipse = newPath

            //if velocity vector is showing, update it's path
            if(checkbox.isChecked) {
                deleteVelocityVector()
                createVelocityVector()
            }

            //if the axis still need to show, update them
            if (voiceover.currentTime < 300 && voiceover.currentTime > 43) {

                //find major axis cords
                var zCord = -1 * 10 * eccentricitySlider.value   //= -c
                var xCord = Math.sqrt(100 - (zCord * zCord))        //find b

                scene.getMeshByName("majorAxis").dispose()
                var majorAxis = BABYLON.MeshBuilder.CreateLines("majorAxis", {points: [
                    newPath[0], newPath[Math.floor(newPath.length / 2)]
                ], updatable: true}, scene)
                majorAxis.color = BABYLON.Color3.Blue()

                scene.getMeshByName("minorAxis").dispose()
                var minorAxis = BABYLON.MeshBuilder.CreateLines("minorAxis", {points: [
                    new BABYLON.Vector3(xCord, 0, zCord), new BABYLON.Vector3(-1 * xCord, 0, zCord)
                ], updatable: true}, scene)
                minorAxis.color = BABYLON.Color3.Green()
            }
        })
        eccentricityPanel.addControl(eccentricitySlider)

    }

    //change eccentricity to that of Earth
    if (Math.floor(voiceover.currentTime) == 299) {
        
        //gradually change the eccentricity slider to equal 0.0167 over ~one second
        var i = 0
        var delta = (0.0167 - eccentricitySlider.value) / 20
        delta = Math.round(delta * 1000000) / 1000000     //error
        var eccInterval = setInterval(function() {
            if (eccentricitySlider.value == 0.0167 || i >= 20) {
                clearInterval(eccInterval)
                delta = 0
            }
            eccentricitySlider.value += delta
            i++
        }, 75)
    }

    //delete the major and minor axis
    if ((voiceover.currentTime > 300 || voiceover.currentTime < 43) && scene.getMeshByName("majorAxis") != null) {

        scene.removeMesh(scene.getMeshByName("majorAxis"))
        scene.removeMesh(scene.getMeshByName("minorAxis"))

        scene.getMeshByName("majorAxis").dispose()
        scene.getMeshByName("minorAxis").dispose()
    }

    //create all the other planets
    if (voiceover.currentTime > 305 && scene.getMeshByName("mercury") == null) {

        //----------Planets----------
        //create Mercury
        var mercury = BABYLON.Mesh.CreateSphere("mercury", 16, .25, scene)
        mercury.renderingGroupId = 3
        scene.planets.push(mercury)
        
        //create Mercury's texture
        var mercuryMat = new BABYLON.StandardMaterial("mercury-material", scene)
        mercuryMat.diffuseTexture = new BABYLON.Texture(require("./planetTextures/2k_mercury.jpg"), scene)
        mercuryMat.specularColor = new BABYLON.Color3(0, 0, 0)
        mercury.material = mercuryMat
        
        //create Venus
        var venus = BABYLON.Mesh.CreateSphere("venus", 32, .48, scene)
        venus.renderingGroupId = 3
        scene.planets.push(venus)

        //create Venus's texture
        var venusMat = new BABYLON.StandardMaterial("venus-material", scene)
        venusMat.diffuseTexture = new BABYLON.Texture(require("./planetTextures/2k_venus.jpg"), scene)
        venusMat.specularColor = new BABYLON.Color3(0, 0, 0)
        venus.material = venusMat

        //create Mars
        var mars = BABYLON.Mesh.CreateSphere("mars", 24, .325, scene)
        mars.renderingGroupId = 3
        scene.planets.push(mars)

        //create Mars's texture
        var marsMat = new BABYLON.StandardMaterial("mars-material", scene)
        marsMat.diffuseTexture = new BABYLON.Texture(require("./planetTextures/2k_mars.jpg"), scene)
        marsMat.specularColor = new BABYLON.Color3(0, 0, 0)
        mars.material = marsMat

        //create Jupiter
        var jupiter = BABYLON.Mesh.CreateSphere("jupiter", 32, 2, scene)
        jupiter.renderingGroupId = 3
        scene.planets.push(jupiter)

        //create Jupiter's texture
        var jupiterMat = new BABYLON.StandardMaterial("jupiter-material", scene)
        jupiterMat.diffuseTexture = new BABYLON.Texture(require("./planetTextures/2k_jupiter.jpg"), scene)
        jupiterMat.specularColor = new BABYLON.Color3(0, 0, 0)
        jupiter.material = jupiterMat

        //create Saturn
        var saturn = BABYLON.Mesh.CreateSphere("saturn", 32, 1.75, scene)
        saturn.renderingGroupId = 3
        scene.planets.push(saturn)

        //create Saturn's texture
        var saturnMat = new BABYLON.StandardMaterial("saturn-material", scene)
        saturnMat.diffuseTexture = new BABYLON.Texture(require("./planetTextures/2k_saturn.jpg"), scene)
        saturnMat.specularColor = new BABYLON.Color3(0, 0, 0)
        saturn.material = saturnMat

        //create Uranus
        var uranus = BABYLON.Mesh.CreateSphere("uranus", 32, 1.1, scene)
        uranus.renderingGroupId = 3
        scene.planets.push(uranus)

        //create Uranus's texture
        var uranusMat = new BABYLON.StandardMaterial("uranus-material", scene)
        uranusMat.diffuseTexture = new BABYLON.Texture(require("./planetTextures/2k_uranus.jpg"), scene)
        uranusMat.specularColor = new BABYLON.Color3(0, 0, 0)
        uranus.material = uranusMat

        //create Neptune
        var neptune = BABYLON.Mesh.CreateSphere("neptune", 32, 1, scene)
        neptune.renderingGroupId = 3
        scene.planets.push(neptune)
        
        //create Neptune's texture
        var neptuneMat = new BABYLON.StandardMaterial("neptune-material", scene)
        neptuneMat.diffuseTexture = new BABYLON.Texture(require("./planetTextures/2k_neptune.jpg"), scene)
        neptuneMat.specularColor = new BABYLON.Color3(0, 0, 0)
        neptune.material = neptuneMat


        //----------Animations----------
        rotatePlanet(mercury, 2, 58.64583, rotationAnims)
        rotatePlanet(venus, 177, 243.69, rotationAnims)
        rotatePlanet(mars, 25.2, 1.0288, rotationAnims)
        rotatePlanet(jupiter, 3.13, .4135, rotationAnims)
        rotatePlanet(saturn, 26.73, .444, rotationAnims)
        rotatePlanet(uranus, 97.77, .7183, rotationAnims)
        rotatePlanet(neptune, 28.32, 0.67125, rotationAnims)

        animOrbit(mercury, 0.2056, 87.97, 3.9, orbitAnims, scene)
        animOrbit(venus, 0.0068, 224.7, 7.2, orbitAnims, scene)
        animOrbit(mars, 0.0934, 686.98, 15.24, orbitAnims, scene)
        animOrbit(jupiter, 0.0484, 4332.59, 52.03, orbitAnims, scene)
        animOrbit(saturn, 0.0542, 10759.22, 95.37, orbitAnims, scene)
        animOrbit(uranus, 0.0472, 30685.16, 191.9, orbitAnims, scene)
        animOrbit(neptune, 0.0086, 60190.08, 300.69, orbitAnims, scene)
        
    }


}, 1000)

//function to create the velocity vector for earth
const createVelocityVector = () => {

    showEarthVelocity = true
    checkbox.isChecked = true

    //Shape profile in XY plane
    const myShape = []
    const arrowRadius = 0.06
    var n = 45
    var deltaAngle = 2 * Math.PI / n
    for (let i = 0; i <= n; i++) {
        myShape.push(new BABYLON.Vector3(arrowRadius * Math.cos(i * deltaAngle), arrowRadius * Math.sin(i * deltaAngle), 0))

    }
    myShape.push(myShape[0])  //close profile

    //set arrow size and features
    const arrowHeadLength = .15
    const arrowHeadMaxSize = .15            
    const arrowLength = 3
    const arrowBodyLength = arrowLength - arrowHeadLength
    const arrowStart = scene.getMeshByName("earth").position.clone()
    let arrowDirection = new BABYLON.Vector3(-1 * arrowStart.z, 0, arrowStart.x)
    arrowDirection.normalize()

    const arrowBodyEnd = arrowStart.add(arrowDirection.scale(arrowBodyLength))
    const arrowHeadEnd = arrowBodyEnd.add(arrowDirection.scale(arrowHeadLength))
    
    const myPath = []
    myPath.push(arrowStart)
    myPath.push(arrowBodyEnd)
    myPath.push(arrowBodyEnd)
    myPath.push(arrowHeadEnd)
    
    const scaling = (index, distance) => {
        switch (index) {
            case 0:
            case 1:
                return 1
            break
            case 2:
                return arrowHeadMaxSize / arrowRadius
            break
            case 3:
                return 0
            break
        }
    };

    let arrow = BABYLON.MeshBuilder.ExtrudeShapeCustom("velocityVector", {shape: myShape, path: myPath, updatable: true, 
        scaleFunction: scaling, sideOrientation: BABYLON.Mesh.DOUBLESIDE})
    var arrowMat = new BABYLON.StandardMaterial("velocityVectorMat", scene)
    arrowMat.emissiveColor = new BABYLON.Color3(0, 1, 0)
    arrow.material = arrowMat

    arrow.renderingGroupId = 3
    
    const arrowUpdate = (arrow, shape, path, scale, arrowStart = path[0], direction = path[1].subtract(path[0])) => {

        scale *= 3

        const arrowHeadLength = .15
        const arrowLength = scale
        const arrowBodyLength = arrowLength - arrowHeadLength
        
        let arrowDirection = direction
        arrowDirection.normalize()
        
        const arrowBodyEnd = arrowStart.add(arrowDirection.scale(arrowBodyLength))
        const arrowHeadEnd = arrowBodyEnd.add(arrowDirection.scale(arrowHeadLength))
        
        path[0] = arrowStart
        path[1] = arrowBodyEnd
        path[2] = arrowBodyEnd
        path[3] = arrowHeadEnd
    

        BABYLON.MeshBuilder.ExtrudeShapeCustom("velocityVector", {shape: shape, path: path, scaleFunction: scaling, instance: arrow} )
    }

    //save important properties of the arrow
    arrow.shape = myShape
    arrow.path = myPath
    arrow.updateFunction = arrowUpdate

    
    var earthPath = scene.getMeshByName("earth").ellipse

    //create the array of velocity vector directions
    var velocityVectorDirections = [new BABYLON.Vector3(-1, 0, 0)]

    for (var i = 0; i < earthPath.length - 1; i++) {
        velocityVectorDirections.push(earthPath[i + 1].subtract(earthPath[i]))
    }

    //save this as a property of the velocity vector
    arrow.velocityVectorDirections = velocityVectorDirections
}

//function to delete the velocity vector for earth
const deleteVelocityVector = () => {

    showEarthVelocity = false

    scene.removeMesh(scene.getMeshByName("velocityVector"))
    if (scene.getMeshByName("velocityVector")) {
        scene.getMeshByName("velocityVector").dispose()
    }
}
