import {calculateDiagonalDistance} from "./utils.js";

export default class PointClusterGenerator {

    constructor(points,robot){
        this.robot = robot;
        this.points = points;
        this.radius = 10;
    }

    setClusterRadius(radius){
        this.radius = radius;
    }

    generateClusters(){
        let clusters = [];

        for (let i = 0; i < this.points.length; i++){
            let point = this.points[i];
            let foundCluster = false;

            for (let c = 0; c < clusters.length; c++){
                let diagonalDist = calculateDiagonalDistance(clusters[c].centroid,point);
                if (diagonalDist <= this.radius){
                    clusters[c].points.push(point);
                    clusters[c] = this.recalculateClusterCentroid(clusters[c]);
                    foundCluster = true;
                }
            }

            if (foundCluster === false){
                clusters.push({points:[point],centroid:point});
            }
        }

        clusters.sort(function (a, b) {
           if (a.points.length > b.points.length){
               return -1;
           }else if (a.points.length < b.points.length){
               return 1;
           }else{
               return 0;
           }
        });
        this.clusters = clusters;
        return clusters;
    }

    recalculateClusterCentroid(cluster) {
        let sX = 0;
        let sY = 0;

        for (let i = 0; i < cluster.points.length; i++){
            sX += cluster.points[i].x;
            sY += cluster.points[i].y;
        }

        let cX = Math.round(sX / cluster.points.length);
        let cY = Math.round(sY / cluster.points.length);

        cluster.centroid = {x:cX, y:cY};
        return cluster;
    }

    printClusters(){
        for (let i = 0; i < this.clusters.length;i++){
            let str = "";

            for (let a = 0; a < this.clusters[i].points.length;a++){
                let point = this.clusters[i].points[a];
                str += "(" + point.x + "," + point.y + ") "
            }

            str += " | (" + this.clusters[i].centroid.x + "," + this.clusters[i].centroid.y + ")" + " [" + this.clusters[i].points.length + "]";
            this.robot.log(str);
        }
    }
}