import * as BABYLON from 'babylonjs';

/**
 * Create the rotation animation for the planet
 * @param {Mesh} planet - The Mesh for which to perform the rotation on
 * @param {number} tilt - The angle of tilt of the planet in degrees
 * @param {number} dayLength - The length of one rotation period of the planet (in Earth days)
 * @param {BABYLON.AnimationGroup} group - The animation group to add this animation to
 */
const rotatePlanet = function (planet, tilt, dayLength, group) {

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
        frame: 2 * frameRate * dayLength,
        value: Math.PI 
    });
    planetRotKeys.push({
        frame: 4 * frameRate * dayLength,
        value: 2 * Math.PI 
    });

    planetRotAnim.setKeys(planetRotKeys);
    group.addTargetedAnimation(planetRotAnim, planet);
};

/**
 * Uses Kepler's Equation to solve for points along a planet's orbit, each spaced 6 minutes apart
 * http://spiff.rit.edu/classes/phys440/lectures/ellipse/ellipse.html
 * @param {number} eccentricity - The eccentricity of the orbit to calculate (c/a)
 * @param {number} period - The period of the planet's orbit, in Earth days
 * @param {number} a - The The length of the semi-major axis of the orbit's ellipse (in scene units)
 * @returns {BABYLON.Vector3[]} An array of vectors which define the points of the orbit's ellipse
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
 * @param {BABYLON.Mesh} planet - The planet mesh for which to animate the orbit
 * @param {Number} eccentricity - The eccentricity of the planet's orbit, as a value between 0 and 1
 * @param {Number} period - The length of time for one full revolution of orbit, in Earth days
 * @param {Number} a - The length of the semi-major axis of the orbit's ellipse (in scene units)
 * @param {BABYLON.AnimationGroup} group - The animation group to add this animation to
 * @param {BABYLON.Scene} scene - The scene on which this animation occurs
 * @returns The mesh of the orbit path
 */
 const animOrbit = function(planet, eccentricity, period, a, group, scene) {

    //define path using steps of 6 minutes
    var path = orbitPath(eccentricity, period, a);
    var track = BABYLON.MeshBuilder.CreateLines(planet.name + 'Track', {points: path, updatable: true}, scene);
	track.color = new BABYLON.Color3(.75,.75,.75);
    track.renderingGroupId = 3;

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
    group.addTargetedAnimation(planetOrbitAnim, planet);

    return track;            
};


/**
 * Calculates the velocity of a celestial body orbiting the sun using the
 * Vis-Viva equation.
 * @param {Number} a - The semi-major axis of the orbit (in kilometers)
 * @param {Number} distance - The distance from the sun to the orbiting body (in kilometers)
 * @returns {Number} The velocity of the body in km/s
**/
const visViva = function(a, distance) {
    
    //1.32747451e20 is GM but divide by 1000^3 to go from m^3 to km^3
    var vSquared = ((2 / distance) - (1 / a)) * 1.32747451 * Math.pow(10, 11) 
    
    return Math.sqrt(vSquared)
}   
    

export {rotatePlanet, animOrbit, orbitPath, visViva};