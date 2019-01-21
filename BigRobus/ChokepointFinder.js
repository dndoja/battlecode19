import CONSTANTS from "./constants.js";

export default class ChokepointFinder {
    constructor(robot,symmetry){
        this.robot = robot;
        this.symmetry = symmetry;
        this.map = robot.map;
        this.rows = [];
        this.startX = 0;
        this.startY = 0;
        this.endX = robot.map.length - 1;
        this.endY = robot.map.length - 1;
    }

    setLimits(start,end){
        this.startX = start.x > 0 ? start.x : 0;
        this.startY = start.y > 0 ? start.y : 0;
        this.endX = end.x > this.robot.map.length ? this.robot.map.length : end.x;
        this.endY = end.y > this.robot.map.length ? this.robot.map.length : end.y;
        //this.robot.log("startX: " + this.startX + " startY: " + this.startY + " endX: " + this.endX + " endY: " + this.endY)
    }

    getChokePoints(){
        if (this.symmetry === CONSTANTS.SYMMETRY_HORIZONTAL){
            for (let x = this.startX; x < this.endX; x++) {
                this.rows.push({i:x,sections:[]});
                this.rows[this.rows.length - 1].sections.push({start:-1,end:-1,length:-1});

                for (let y = this.startY; y < this.endY; y++) {
                    this.processCoordinate(x, y, y)
                }
            }
        }else{
            for (let y = this.startY; y < this.endY; y++){
                this.rows.push({i:y,sections:[]});
                this.rows[this.rows.length - 1].sections.push({start:-1,end:this.endX,length:-1});

                for (let x = this.startX; x < this.endX; x++){
                    this.processCoordinate(x,y,x)
                }
            }
        }
        return this.rows
    }

    processCoordinate(x,y,maincoord) {
        if (this.map[y][x] === false) {
            let lastRow = this.rows[this.rows.length - 1];
            let lastSection = lastRow.sections[lastRow.sections.length - 1];
            if (lastSection.start !== -1){
                if (x === maincoord) {
                    this.rows[this.rows.length - 1].sections.push({start: -1, end: this.endX, length: -1});
                }else{
                    this.rows[this.rows.length - 1].sections.push({start: -1, end: this.endY, length: -1});
                }
            }
        }else{
            let lastChoke = this.rows[this.rows.length - 1];
            let lastSection = lastChoke.sections[lastChoke.sections.length - 1];
            if (lastSection.start === -1){
                lastSection.start = maincoord;
                lastSection.length = lastSection.end - lastSection.start;
                lastSection.end = maincoord;
            }else{
                lastSection.end = maincoord;
                lastSection.length = lastSection.end - lastSection.start
            }
            //this.rows[this.rows.length - 1].sections[this.rows[this.rows.length - 1].length - 1] = lastSection;
        }
    }

    intersectRows(firstRow,secondRow,print){
        let a = firstRow.sections;
        let b = secondRow.sections;

        if (print) {
            let str = "1. ";
            for (let i = 0; i < a.length; i++) {
                str += "[" + a[i].start + "," + a[i].end + "]"
            }
            this.robot.log(str + " | " + firstRow.i);

            str = "2. ";
            for (let i = 0; i < b.length; i++) {
                str += "[" + b[i].start + "," + b[i].end + "]"
            }
            this.robot.log(str + " | " + secondRow.i);
        }

        let ranges = [];
        let i =  0;
        let j = 0;

        function sortNumbers(x,y) {
            return x - y
        }

        while (i < a.length && j < b.length) {
            let a_left = a[i].start;
            let a_right = a[i].end;
            let b_left = b[j].start;
            let b_right = b[j].end;

            if (a_right < b_right) {
                i += 1
            }
            else {
                j += 1
            }

            if (a_right >= b_left && b_right >= a_left) {
                let end_pts = [a_left, a_right, b_left, b_right].sort(sortNumbers);

                let middle = [end_pts[1], end_pts[2]];
                ranges.push(middle)
            }
            let ri = 0;

                while (ri < ranges.length - 1) {
                    if (ranges[ri][1] === ranges[ri + 1][0]){
                        ranges[ri] = [[ranges[ri][0], ranges[ri+1][1]]];
                        ranges[ri + 1] = [[ranges[ri][0], ranges[ri+1][1]]];
                    }
                    ri += 1
                }
        }

        if (print) {
            let str = "R: ";
            for (let i = 0; i < ranges.length; i++) {
                str += "[" + ranges[i][0] + "," + ranges[i][1] + "]"
            }
            this.robot.log(str);
            this.robot.log("______________________");
        }

        return ranges
    }

    printChokes(){
        this.robot.log("L: " + this.rows.length);

        for (let i = 0; i < this.rows.length; i++){
            let sections = this.rows[i].sections;
            let str = "I: " + i;
            for (let a = 0; a < sections.length; a++){
                str += ("| " + sections[a].start + " -> " + sections[a].end + " |")
            }
            this.robot.log(str)
        }
    }
}