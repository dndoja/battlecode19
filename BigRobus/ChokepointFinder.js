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
    }

    getChokePoints(){
        if (this.symmetry === CONSTANTS.SYMMETRY_HORIZONTAL){
            for (let x = this.startX; x < this.endX; x++) {
                this.rows.push({i:x,sections:[]});
                this.rows[this.rows.length - 1].sections.push({start:-1,end:-1,length:this.map.length});

                for (let y = this.startY; y < this.endY; y++) {
                    this.processCoordinate(x, y, y)
                }
            }
        }else{
            for (let y = this.startY; y < this.endY; y++){
                this.rows.push({i:y,sections:[]});
                this.rows[this.rows.length - 1].sections.push({start:-1,end:this.map.length,length:-1});

                for (let x = this.startX; x < this.endX; x++){
                    this.processCoordinate(x,y,x)
                }
            }
        }
    }

    processCoordinate(x,y,maincoord) {
        if (this.map[y][x] === false) {
            let lastRow = this.rows[this.rows.length - 1];
            let lastSection = lastRow.sections[lastRow.sections.length - 1];
            if (lastSection.start !== -1){
                this.rows[this.rows.length - 1].sections.push({start:-1,end:this.map.length,length:-1});
            }
        }else{
            let lastChoke = this.rows[this.rows.length - 1];
            let lastSection = lastChoke.sections[lastChoke.sections.length - 1];
            if (lastSection.start === -1){
                lastSection.start = maincoord;
                lastSection.length = lastSection.end - lastSection.start
            }else{
                lastSection.end = maincoord;
                lastSection.length = lastSection.end - lastSection.start
            }
            //this.rows[this.rows.length - 1].sections[this.rows[this.rows.length - 1].length - 1] = lastSection;
        }
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