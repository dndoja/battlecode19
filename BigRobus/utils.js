import CONSTANTS from "./constants.js";

export function getVisibleFriendlyRobotsOfType(robot,type){
    let friendlyTeam = robot.me.team;
    let visibleRobots = robot.getVisibleRobots();

    let pilgrims = [];
    for (let i = 0; i < visibleRobots.length; i++){
        let robot = visibleRobots[i];
        if (robot.me.team === friendlyTeam && robot.me.unit === type){
            pilgrims.push(robot)
        }
    }

    return pilgrims;
}

export function fitPointInMap(unit,point){
    let pointX = point.x;
    let pointY = point.y;
    let map = unit.map;

    if (pointX < 0) {pointX = 0}
    if (pointY < 0) {pointY = 0}
    if (pointX > map[0].length) {
        pointX = map[0].length - 1
    }
    if (pointY > map.length){
        pointY = map[0].length - 1
    }

    return {x:pointX, y:pointY}
}

export function getMapSymmetryType(map) {
    for (let y = 0; y < map.length; y++){
        for (let x = 0; x < map.length / 2; x++){
            let symmetricalX = map.length - 1 - x;
            if (map[y][x] !== map[y][symmetricalX]){
                return CONSTANTS.SYMMETRY_VERTICAL
            }
        }
    }

    return CONSTANTS.SYMMETRY_HORIZONTAL
}

export function getDistanceBetweenPoints(x1, x2, y1, y2) {
    let dX = x2 - x1;
    let dY = y2 - y1;
    return dX * dX + dY * dY
}

export function getDeltaBetweenPoints(a, b) {
    let dX = b.x - a.x;
    let dY = b.y - a.y;

    return {dX: dX,dY: dY}
}

export function fitCoordsInEightBits(robot,map, x, y, symmetry) {
    let detailedCoord;
    let notDetailedCoord;

    if (symmetry === CONSTANTS.SYMMETRY_HORIZONTAL){
        detailedCoord = y;
        notDetailedCoord = Math.abs(map.length / 2 - x);
    }else if (symmetry === CONSTANTS.SYMMETRY_VERTICAL){
        detailedCoord = x;
        notDetailedCoord = Math.abs(map.length / 2 - y);
    }

    let scaledDetailed = Math.floor((detailedCoord / Math.floor(map.length / 31)) / 2);
    let scaledNotDetailed = Math.floor(notDetailedCoord / Math.floor(map.length / 7));

    let sdBinary = padWithZeros(scaledDetailed.toString(2),5);
    let sndBinary = padWithZeros(scaledNotDetailed.toString(2),3);
    //robot.log("sd: " + scaledDetailed + " snd: " + scaledNotDetailed + " ml: " + map.length + " binary " + sndBinary + sdBinary);

    return sndBinary + sdBinary;
}

export function getCoordsFromEightBits(robot,map,bits,symmetry) {
    let padded = padWithZeros(bits,8);

    let threeBits = padded.substr(0,3);
    let fiveBits = padded.substr(3,8);
    let detailedCoord = parseInt(fiveBits,2);
    let notDetailedCoord = parseInt(threeBits,2);

    //robot.log(" bits: " + bits + " padded: " + padded + " threeBits: " + threeBits + " dec: " + notDetailedCoord + " fiveBits: " + fiveBits + " dec: " + detailedCoord);
    let detailedCoeff = Math.floor(map.length / 31);
    let notDetailedCoeff = Math.floor(map.length / 7);

    let scaledD = detailedCoord * detailedCoeff * 2;
    let scaledND = notDetailedCoord * notDetailedCoeff;

    if (symmetry === CONSTANTS.SYMMETRY_VERTICAL){
        if (robot.me.y > map.length / 2){
            scaledND += map.length / 2;
        }
        return {x: scaledD,y:scaledND};
    }else if (symmetry === CONSTANTS.SYMMETRY_HORIZONTAL){
        if (robot.me.x > map.length / 2){
            scaledND += map.length / 2;
        }
        return {x: scaledD,y:scaledND};
    }
}

export function padWithZeros(str,desiredLength) {
    let padding = "";
    for (let i = 0; i < desiredLength - str.length; i++){
        padding += "0"
    }

    return padding + str;
}

export function getSymmetricNode(x,y,map,symmetry){
    let symmetricalX = map.length - 1 - x;
    let symmetricalY = map.length - 1 - y;
    if (symmetry === CONSTANTS.SYMMETRY_HORIZONTAL) {
        return{x: symmetricalX, y: y};
    }else {
        return{x: x, y: symmetricalY};
    }
}

export function calculateDiagonalDistance(current, goal) {
    let absX = Math.abs(goal.x - current.x);
    let absY = Math.abs(goal.y - current.y);

    return Math.max(absX,absY)
}

export function calculateManhattanDistance(current,goal) {
    let absX = Math.abs(current.x - goal.x);
    let absY = Math.abs(current.y - goal.y);

    return absX + absY
}