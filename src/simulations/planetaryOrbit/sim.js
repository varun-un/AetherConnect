import * as BABYLON from 'babylonjs';

//when browser is loaded, call this function
window.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('canvas');
    var engine = new BABYLON.Engine(canvas, true);
    var createScene = function () {
        var scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3.Blue();

        var box = BABYLON.Mesh.CreateBox("Box", 4.0, scene);
        
        //2nd type of camera is arc rotate camera (makes cam rotate about a position/object)
        //second param is alpha, third is beta, which is initial radians rotated around x and y axis, fourth is radius
        var camera = new BABYLON.ArcRotateCamera("arcCamera", BABYLON.Tools.ToRadians(45), BABYLON.Tools.ToRadians(45), 10, 
        box.position, scene);
        
        camera.attachControl(canvas, true);                     //gives it the ability to take controls

        return scene;
    }

    var scene = createScene();
    engine.runRenderLoop(function () {      
        scene.render();
    });
});
