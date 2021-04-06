import * as BABYLON from 'babylonjs';

/**
 * 
 * @param {Mesh} planet - The Mesh for which to perform the rotation on
 * @param {number} tilt - The angle of tilt of the planet in degrees
 * @param {number} dayLength - The length of one rotation period of the planet (in Earth days)
 * @param {Scene} scene - The scene for which this animation occurs
 * @param {boolean} loops - Whether or not this animation will loop forever
 * @returns An animatable representing the rotation of the passed planet, at the rate of 1 second = 12 hrs
 */
const rotatePlanet = function (planet, tilt, dayLength, scene, loops = true) {

    //tilt on axis
    planet.rotation = new BABYLON.Vector3(tilt * Math.PI / 180, 0, Math.PI);

    planet["rotYLocal"] = 0;
    planet["prevRotYLocal"] = 0;

    var frameRate = 30;
    //create planet's rotation animation             
    var planetRotAnim = new BABYLON.Animation(planet.name + "Rotation", "rotYLocal", frameRate,BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var planetRotKeys = [];
    planetRotKeys.push({
        frame: 0,
        value: 0
    });
    planetRotKeys.push({
        frame: 2 * frameRate,
        value: Math.PI / (dayLength)
    });
    planetRotKeys.push({
        frame: 4 * frameRate,
        value: 2 * Math.PI / dayLength
    });

    planetRotAnim.setKeys(planetRotKeys);
    var animatable = scene.beginDirectAnimation(planet, [planetRotAnim], 0, 4 * frameRate, loops, 1);

    return animatable;
};

/**
 * Uses Kepler's Equation to solve for points along a planet's orbit, each spaced 6 minutes apart
 * @param {*} eccentricity - The eccentricity of the orbit to calculate (c/a)
 * @param {*} period - The period of the planet's orbit, in Earth days
 * @param {*} a - The The length of the semi-major axis of the orbit's ellipse (in scene units)
 * @returns {Vector3[]} An array of vectors which define the points of the orbit's ellipse
 */
const orbitPath = function(eccentricity, period, a){

    //solves Kepler's equation using Newton's methods, for a given time t after the perihelion passing (in minutes)
    //returns the eccentric anomaly of that point in the orbit
    const newtonianKeplerEq = function(eccentricity, time, period){
        var diff = 100.0;
        var epsilon = .0000001;                  //target difference
    
        var E_new;
        var Mean_anomaly = (Math.PI * 2 / (period * 24 * 60)) * time;
        var direction = 1;
        //If M is > pi, then set it to its negative angle equivalent, but make E be negative to account for it
        if (Mean_anomaly > Math.PI){
          Mean_anomaly = Math.PI * 2 - Mean_anomaly;
          direction = -1;
        }
        var E_old = Mean_anomaly + eccentricity / 2.0;      //starting Eccentric Anomaly
    
        //loop until precision good
        while (diff > epsilon) {
            E_new = E_old - (E_old - eccentricity * (Math.sin(E_old)) - Mean_anomaly) / (1 - eccentricity * (Math.cos(E_old)));
            diff = Math.abs(E_old - E_new);
            E_old = E_new;
        }
        return (E_new) * direction;
    }

    //define path using steps of 6 minutes
    var path = [];
    for (var i = 0; i < (period * 24 * 10); i++){
        var E = newtonianKeplerEq(eccentricity, 6 * i, period);       //gets the E for the time interval

        //get polar coordinates
        var r = a * (1 - (eccentricity * Math.cos(E)));
        var theta = 2 * (Math.atan((Math.sqrt((eccentricity + 1)/(1 - eccentricity))) * Math.tan(E/2)));

        //push cartesian points into array
        path.push(new BABYLON.Vector3(-1 * r * Math.sin(theta), 0, r * Math.cos(theta)));
    }
    return path;
}

/**
 * Models and animates the orbit of a planet
 * @param {*} planet - The planet mesh for which to animate the orbit
 * @param {*} eccentricity - The eccentricity of the planet's orbit, as a value between 0 and 1
 * @param {*} period - The length of time for one full revolution of orbit, in Earth days
 * @param {*} a - The length of the semi-major axis of the orbit's ellipse (in scene units)
 * @param {*} scene - The scene on which this animation occurs
 * @returns An animatable representing the planet's orbit
 */
 const animOrbit = function(planet, eccentricity, period, a, scene) {

    //define path using steps of 6 minutes
    var path = orbitPath(eccentricity, period, a);
    var track = BABYLON.MeshBuilder.CreateLines(planet.name + 'Track', {points: path, updatable: true}, scene);
	track.color = new BABYLON.Color3(.75,.75,.75);
    track.renderingGroupId = 3;
    planet["track"] = track;

    var frameRate = 60;
    planet["orbitSegment"] = 0;
    planet["ellipse"] = path;
    //create planet's orbit animation             
    var planetOrbitAnim = new BABYLON.Animation(planet.name + "Orbit", "orbitSegment", frameRate, BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    var planetOrbitKeys = [];
    planetOrbitKeys.push({
        frame: 0,
        value: 0
    });
    planetOrbitKeys.push({
        frame: period * 24 * 5,
        value: period * 24 * 5
    });
    planetOrbitKeys.push({
        frame: period * 24 * 10,
        value: period * 24 * 10
    });

    planetOrbitAnim.setKeys(planetOrbitKeys);
    var animatable = scene.beginDirectAnimation(planet, [planetOrbitAnim], 0, period * 24 * 10, true, 1);

    return animatable;            
};

export {rotatePlanet, animOrbit, orbitPath};